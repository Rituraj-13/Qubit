import express from "express";
import type { Response } from "express";
import { tavily } from "@tavily/core";
import Groq from "groq-sdk";
import { PROMPT_TEMPLATE, PROMPT_TEMPLATE_WITHOUT_WEB, SYSTEM_PROMPT, SYSTEM_PROMPT_WITHOUT_WEB, SYSTEM_PROMPT_FOLLOW_UP, SYSTEM_PROMPT_FOLLOW_UP_WITHOUT_WEB } from "./prompt";
import { prisma } from "./db";
import { Middleware } from "./middlewares/middleware";
import cors from "cors"
import { slugify } from "./utils/utils";
import { newChat, reqfollowUpSchema } from "./utils/validatiors";
import { shareLimiter, userLimiter } from "./rateLimit";


const app = express();
app.set("trust proxy", 1);

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type ModalMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

app.use(cors())
app.use(express.json());

function setSseHeaders(res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
}

function sendSseEvent(res: Response, payload: unknown, event?: string) {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    if (event) {
        // optional event field
        res.write(`event: ${event}\n`);
    }
    res.write(data);
    try {
        // some runtimes expose res.flush; call if available
        (res as any).flush?.();
    } catch (_) { }
}

async function runWebSearch(query: string) {
    const webSearchResponse = await client.search(query, {
        searchDepth: "advanced"
    })

    return webSearchResponse.results;
}

function buildPrompt(query: string, webSearchResult: unknown, isWebSearchEnabled: boolean) {
    const template = isWebSearchEnabled ? PROMPT_TEMPLATE : PROMPT_TEMPLATE_WITHOUT_WEB;

    return template.replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
        .replace("{{USER_QUERY}}", query)
}

async function streamGroqResponse(res: Response, messages: ModalMessage[], model: string) {
    const chatCompletion = await groq.chat.completions.create({
        "messages": messages,
        "model": model,
        "temperature": 1,
        "max_completion_tokens": 1024,
        "top_p": 1,
        "stream": true,
        "stop": null,
    });

    let assistantReply = "";

    try {
        for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content ?? "";
            if (content) {
                assistantReply += content;
                // send as SSE data event with chunk payload
                sendSseEvent(res, { type: "chunk", text: content });
            }
        }

        return assistantReply;
    } catch (err) {
        // forward error to client over SSE
        sendSseEvent(res, { type: "error", message: String(err) }, "error");
        throw err;
    }
}

function writeSourcesAndConversationId(
    res: Response,
    webSearchResult: { url: string }[],
    conversationId: string,
    conversationSlug: string,
    webSearchEnabled: boolean
) {
    const payload = {
        sources: webSearchEnabled ? webSearchResult.map(r => ({ url: r.url })) : null,
        conversationId,
        conversationSlug,
    };
    sendSseEvent(res, { type: "meta", ...payload });
}

async function persistConversationSources(
    conversationId: string,
    webSearchEnabled: boolean,
    webSearchResult: { url: string }[]
) {
    if (!webSearchEnabled) {
        // Web search was off this turn — never wipe previously saved sources.
        // Only mark sourcesMode="off" if the conversation genuinely has no sources yet.
        await prisma.$executeRaw`
            UPDATE "Conversation"
            SET "sourcesMode" = CASE
                WHEN "sources" IS NULL THEN 'off'
                ELSE "sourcesMode"
            END
            WHERE "id" = ${conversationId};
        `;
        return;
    }

    // Web search was on — fetch existing persisted sources, merge, then save.
    const rows = await prisma.$queryRaw<{ sources: unknown }[]>`
        SELECT "sources" FROM "Conversation" WHERE "id" = ${conversationId} LIMIT 1;
    `;
    const existing: { url: string }[] = Array.isArray(rows[0]?.sources)
        ? (rows[0].sources as { url: string }[])
        : [];

    // Dedupe incoming against existing by URL
    const urlSet = new Set(existing.map(e => e.url));
    for (const item of webSearchResult) {
        if (!urlSet.has(item.url)) {
            existing.push({ url: item.url });
            urlSet.add(item.url);
        }
    }

    const sourcesJson = JSON.stringify(existing);
    await prisma.$executeRaw`
        UPDATE "Conversation"
        SET "sources" = ${sourcesJson}::jsonb,
            "sourcesMode" = 'web'
        WHERE "id" = ${conversationId};
    `;
}


// * Get all the Conversations title and IDs for the history tab
app.get("/conversations/titles", Middleware, async (req, res) => {
    const userId: string = typeof req.userId === "string" ? req.userId : Array.isArray(req.userId) ? req.userId[0] ?? "" : "";
    const allConversations = await prisma.conversation.findMany({
        where: {
            userId: userId
        },
        orderBy: {
            createdAt: "desc"
        },
        select: {
            title: true,
            id: true,
            slug: true,
        }
    })

    res.json({ conversations: allConversations })
})

app.get("/", async (req, res) => {
    res.status(200).json({
        "message": "Welcome to Qubit API"
    })
})

// * Get a particular conversation
app.get("/conversations/:conversationId", Middleware, async (req, res) => {
    const conversationId = req.params.conversationId;
    if (typeof conversationId !== "string") {
        res.status(400).json({
            "message": "Invalid Conversation ID"
        })
        return
    }

    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            userId: req.userId
        },
        include: {
            messages: { orderBy: { createdAt: "asc" } }
        }
    })

    if (!conversation) {
        res.status(404).json({
            "message": "Conversation not found"
        })
        return
    }

    const metaRows = await prisma.$queryRaw<{ sources: unknown; sourcesMode: string | null }[]>`
        SELECT "sources", "sourcesMode"
        FROM "Conversation"
        WHERE "id" = ${conversationId}
        LIMIT 1;
    `;
    const meta = metaRows[0] ?? { sources: null, sourcesMode: null };

    res.json({ conversation: { ...conversation, sources: meta.sources, sourcesMode: meta.sourcesMode } })
})

// * To view the shared conversations
app.get("/share/conversations/:conversationId", shareLimiter, async (req, res) => {
    const conversationIdOrSlug = req.params.conversationId;
    if (typeof conversationIdOrSlug !== "string") {
        res.status(400).json({ message: "Invalid Conversation Identifier" });
        return;
    }

    // Allow lookups by id OR slug. Only return if conversation is public.
    const conversation = await prisma.conversation.findFirst({
        where: {
            OR: [
                { id: conversationIdOrSlug },
                { slug: conversationIdOrSlug }
            ],
            public: true,
        },
        include: {
            messages: { orderBy: { createdAt: "asc" } }
        }
    });

    if (!conversation) {
        res.status(404).json({ message: "Conversation not found or not public" });
        return;
    }

    const metaRows = await prisma.$queryRaw<{ sources: unknown; sourcesMode: string | null }[]>`
        SELECT "sources", "sourcesMode"
        FROM "Conversation"
        WHERE "id" = ${conversation.id}
        LIMIT 1;
    `;
    const meta = metaRows[0] ?? { sources: null, sourcesMode: null };

    res.json({ conversation: { ...conversation, sources: meta.sources, sourcesMode: meta.sourcesMode } });
});

// * List conversations for a specific project
app.get("/projects/:projectId/conversations", Middleware, async (req, res) => {
    const { projectId } = req.params;
    const projectIdStr: string = typeof projectId === "string" ? projectId : Array.isArray(projectId) ? projectId[0] ?? "" : "";
    const userId: string = typeof req.userId === "string" ? req.userId : Array.isArray(req.userId) ? req.userId[0] ?? "" : "";
    const project = await prisma.project.findFirst({
        where: { id: projectIdStr, userId },
    });
    if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
    }
    const conversations = await prisma.conversation.findMany({
        where: { projectId: projectIdStr, userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, slug: true, createdAt: true },
    });
    res.json({ conversations });
});

// * Start a new conversation
app.post("/qubit_ask", Middleware, userLimiter, async (req, res) => {
    setSseHeaders(res);


    // Step 1 - get the query from the user
    const query = req.body.query;
    const webSearchEnabled = req.body.webSearchEnabled;
    const model = req.body.model;
    const projectId: string | undefined = typeof req.body.projectId === "string" && req.body.projectId.length > 0
        ? req.body.projectId
        : undefined;

    const parsedQuery = newChat.safeParse({
        query: query,
        webSearchEnabled: webSearchEnabled,
        model: model,
    })

    if (!parsedQuery.success) {
        res.status(400).json({
            "message": "Invalid Payload !"
        })
        return;
    }

    // Step 2 - make sure the user has access/credits to hit the endpoint - need to implement this

    // Step 3 - check if we have web search indexed for a similar query - need to implement this

    // Step 4 - web search to gather resources
    const webSearchResult = webSearchEnabled ? await runWebSearch(query) : [];

    // Create the conversation with the user message up-front so that the client can associate with the stream with a persistant conversation id

    const conversation = await prisma.conversation.create({
        data: {
            title: query.slice(0, 80),
            slug: slugify(query),
            user: {
                connect: {
                    id: req.userId!,
                },
            },
            ...(projectId ? { project: { connect: { id: projectId } } } : {}),
            messages: {
                create: {
                    content: query,
                    role: "User"
                }
            },
        },
    });

    // Step 5 - do some context engineering on the prompt + web search responses - done

    // Step 6 - hit the LLM and stream back the responses
    const prompt = buildPrompt(query, webSearchResult, webSearchEnabled);
    const systemPrompt = webSearchEnabled ? SYSTEM_PROMPT : SYSTEM_PROMPT_WITHOUT_WEB;
    const selectedModel = parsedQuery.data.model;
    const messages: ModalMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
    ];
    try {
        const assistantReply = await streamGroqResponse(res, messages, selectedModel);

        // Step 7 - also stream back the sources and the followup questions
        writeSourcesAndConversationId(res, webSearchResult, conversation.id, conversation.slug, webSearchEnabled);
        await persistConversationSources(conversation.id, webSearchEnabled, webSearchResult);

        // Step 8 - Close the event stream
        res.end();

        // Persist the full assistant reply (answer + sources) so follow-ups can be possible
        await prisma.message.create({
            data: {
                content: assistantReply,
                role: "Assistant",
                conversationId: conversation.id,
            },
        });
    } catch (err) {
        console.log("Stream error:", err);
        sendSseEvent(res, { type: "error", message: String(err) }, "error");
        try { res.end(); } catch (_) { }
        return;
    }
})

// * Continue with the existing conversation
app.post("/qubit_ask/follow_up", Middleware, userLimiter, async (req, res) => {
    setSseHeaders(res);

    const query = req.body.query;
    const conversationId = req.body.conversationId;
    const webSearchEnabled = req.body.webSearchEnabled ?? true;
    const model = req.body.model;

    const parsedQuery = reqfollowUpSchema.safeParse({
        query: query,
        conversationId: conversationId,
        model: model,
    })

    if (!parsedQuery.success) {
        res.status(400).json({
            "message": "Invalid Conversation Id"
        })
        return
    }

    // get the existing chat from the db
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            userId: req.userId
        },
        include: {
            messages: { orderBy: { createdAt: "asc" } }
        }
    })

    if (!conversation) {
        res.status(404).json({
            "message": "Conversation not found"
        })
        return
    }

    // forward the full history to the LLM
    const webSearchResult = webSearchEnabled ? await runWebSearch(query) : [];

    await prisma.message.create({
        data: {
            content: query,
            role: "User",
            conversationId: conversation.id
        }
    })

    // Build clean history: strip XML tags from assistant messages so the LLM
    // reads plain prose instead of raw output format noise.
    function stripXmlTags(text: string): string {
        return text
            .replace(/<ANSWER>|<\/ANSWER>/gi, "")
            .replace(/<FOLLOW_UPS>[\s\S]*?<\/FOLLOW_UPS>/gi, "")
            .trim();
    }

    const history: ModalMessage[] = conversation.messages.map(m => ({
        role: m.role === "User" ? "user" : "assistant",
        content: m.role === "Assistant" ? stripXmlTags(m.content) : m.content,
    }));

    // Use dedicated follow-up system prompt so the LLM knows to resolve
    // references (e.g. "rank 2 of the best") from the conversation history.
    const prompt = buildPrompt(query, webSearchResult, webSearchEnabled);
    const systemPrompt = webSearchEnabled ? SYSTEM_PROMPT_FOLLOW_UP : SYSTEM_PROMPT_FOLLOW_UP_WITHOUT_WEB;
    const selectedModel = parsedQuery.data.model;
    const messages: ModalMessage[] = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: prompt },
    ];
    try {
        const assistantReply = await streamGroqResponse(res, messages, selectedModel);

        // Step 7 - also stream back the sources and the followup questions
        writeSourcesAndConversationId(res, webSearchResult, conversation.id, conversation.slug, webSearchEnabled);
        await persistConversationSources(conversation.id, webSearchEnabled, webSearchResult);

        // Step 8 - Close the event stream
        res.end();

        // Persist the full assistant reply (answer + sources) so follow-ups can be possible
        await prisma.message.create({
            data: {
                content: assistantReply,
                role: "Assistant",
                conversationId: conversation.id,
            },
        });
    } catch (err) {
        console.log("Stream error:", err);
        sendSseEvent(res, { type: "error", message: String(err) }, "error");
        try { res.end(); } catch (_) { }
        return;
    }
})

// * Update a conversation to make it sharable by changing the public constraint to TRUE
app.put("/public/:conversationId", Middleware, async (req, res) => {
    const conversationId = req.params.conversationId;
    if (typeof conversationId !== "string") {
        res.status(400).json({
            "message": "Invalid Conversation ID"
        })
        return
    }
    try {
        const conv = await prisma.conversation.findFirst({ where: { id: conversationId, userId: req.userId } });
        if (!conv) {
            res.status(404).json({ message: "Conversation not found or not owned by user" });
            return;
        }

        await prisma.conversation.update({
            where: { id: conversationId },
            data: { public: true }
        });

        res.status(200).json({
            "message": "Generated the public url"
        });
    } catch (error) {
        console.log("ERROR : Generating Public URL : ", error)
        res.status(400).json({
            "message": "Failed to generate the public url"
        })
        return;
    }
})

// * Move a conversation to a project
app.put("/conversations/:conversationId/move_project", Middleware, async (req, res) => {
    const conversationId = req.params.conversationId;
    const projectId = req.body.projectId;

    if (typeof conversationId !== "string") {
        res.status(400).json({ message: "Invalid Conversation ID" });
        return;
    }
    if (typeof projectId !== "string") {
        res.status(400).json({ message: "Invalid Project ID" });
        return;
    }

    try {
        const userId: string = typeof req.userId === "string" ? req.userId : Array.isArray(req.userId) ? req.userId[0] ?? "" : "";
        // Ensure project belongs to the user
        const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
        if (!project) {
            res.status(404).json({ message: "Project not found" });
            return;
        }

        const conv = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
        if (!conv) {
            res.status(404).json({ message: "Conversation not found" });
            return;
        }

        await prisma.conversation.update({ where: { id: conversationId }, data: { projectId } });

        res.status(200).json({ message: "Conversation moved to project" });
    } catch (error) {
        console.error("Error moving conversation to project:", error);
        res.status(500).json({ message: "Failed to move conversation" });
    }
});

// * Delete a Conversation
app.delete("/conversations/:conversationId", Middleware, async (req, res) => {
    const conversationId = req.params.conversationId;
    if (typeof conversationId !== "string") {
        res.status(400).json({
            "message": "Invalid Conversation ID"
        })
        return
    }
    try {
        const conv = await prisma.conversation.findFirst({ where: { id: conversationId, userId: req.userId } });
        if (!conv) {
            res.status(404).json({ message: "Conversation not found or not owned by user" });
            return;
        }

        await prisma.conversation.delete({ where: { id: conversationId } });
        res.status(200).json({
            "message": "Conversation Deleted Successfully !"
        });
    } catch (error) {
        console.log(error)
        res.status(400).json({
            "message": "Error while deleteing conversation !"
        })
        return;
    }
})

// * List all projects for the authenticated user
app.get("/projects", Middleware, async (req, res) => {
    const projects = await prisma.project.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { conversations: true } } },
    });
    res.json({ projects });
});

// * Create a Project
app.post("/create/project", Middleware, async (req, res) => {
    const projectName = req.body.projectName;
    const projectDesc = req.body.projectDesc;
    if (typeof projectName !== "string" || typeof projectDesc !== "string") {
        res.status(400).json({
            "message": "Invalid Inputs !"
        })
        return
    }
    await prisma.project.create({
        data: {
            project_name: projectName,
            description: projectDesc,
            user: {
                connect: { id: req.userId! }
            }
        }
    })
    res.status(200).json({
        "message": "Project Created Successfully"
    })
})

// * Delete a Project
app.delete("/projects/:projectId", Middleware, async (req, res) => {
    const projectId = req.params.projectId;
    if (typeof projectId !== "string") {
        res.status(400).json({
            "message": "Invalid Project ID"
        })
        return
    }

    try {
        const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId } });
        if (!project) {
            res.status(404).json({ message: "Project not found or not owned by user" });
            return;
        }

        await prisma.project.delete({ where: { id: projectId } });
        res.status(200).json({
            "message": "Project Deleted Successfully !"
        })
    } catch (error) {
        console.log(error)
        res.status(400).json({
            "message": "Error while deleting project !"
        })
        return;
    }
})


// * Remove a conversation from the project
app.put("/projects/conversations/:conversationId/remove", Middleware, async (req, res) => {
    const conversationId = req.params.conversationId;
    const projectId = req.body.projectId;

    if (typeof conversationId !== "string") {
        res.status(400).json({ message: "Invalid Conversation ID" });
        return;
    }
    if (typeof projectId !== "string") {
        res.status(400).json({ message: "Invalid Project ID" });
        return;
    }

    try {
        const userId = typeof req.userId === "string" ? req.userId : Array.isArray(req.userId) ? req.userId[0] ?? "" : "";

        const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
        if (!project) {
            res.status(404).json({ message: "Project not found" });
            return;
        }

        const conv = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
        if (!conv) {
            res.status(404).json({ message: "Conversation not found" });
            return;
        }

        if (conv.projectId !== projectId) {
            res.status(400).json({ message: "Conversation not in that project" });
            return;
        }

        await prisma.conversation.update({ where: { id: conversationId }, data: { projectId: null } });

        res.status(200).json({ message: "Conversation removed from project" });
    } catch (error) {
        console.error("Error removing conversation from project:", error);
        res.status(500).json({ message: "Failed to remove conversation" });
    }
});


app.listen(3001);