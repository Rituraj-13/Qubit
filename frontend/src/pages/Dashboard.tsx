import { createClient } from "@/lib/client";
import { BACKEND_URL } from "@/lib/config";
import type { User, Session } from "@supabase/supabase-js";
import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
    Menu,
    MoreHorizontal,
    FolderOpen,
    FolderPlus,
    ChevronRight
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { TopTabs } from "@/components/dashboard/TopTabs";
import { ChatMessagesPanel } from "@/components/dashboard/ChatMessagesPanel";
import { SourcesPanel } from "@/components/dashboard/SourcesPanel";
import { ChatInputBox } from "@/components/dashboard/ChatInputBox";
import { ConversationLoaderPage } from "@/components/dashboard/ConversationLoaderPage";
import { ProjectView } from "@/components/dashboard/ProjectView";
import { NewProjectModal } from "@/components/dashboard/NewProjectModal";
import {
    DEFAULT_MODEL,
    MODEL_OPTIONS,
    type ChatMessage,
    type ConversationHistory,
    type LlmModel,
    type Project,
    type ProjectConversation,
    type SourcesMode,
} from "@/components/dashboard/types";
import { parseAIContent } from "@/components/dashboard/utils";
import { Button } from "@/components/ui/button";

const supabase = createClient();

export default function Dashboard() {
    const navigate = useNavigate();
    const { slug: routeSlug, projectId: routeProjectId } = useParams();
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [view, setView] = useState<"chat" | "project">("chat");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [webSearchEnabled, setWebSearchEnabled] = useState(true);
    const [chatInput, setChatInput] = useState("");
    const [activeTab, setActiveTab] = useState<"answer" | "sources">("answer");
    const [sources, setSources] = useState<string[]>([]);
    const [sourcesMode, setSourcesMode] = useState<SourcesMode>("unknown");
    const [sourcesByConversation, setSourcesByConversation] = useState<Record<string, { sources: string[]; mode: SourcesMode }>>({});

    const [history, setHistory] = useState<ConversationHistory[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [currentConversationSlug, setCurrentConversationSlug] = useState<string | null>(null);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [projectConversations, setProjectConversations] = useState<ProjectConversation[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isConversationLoading, setIsConversationLoading] = useState(false);
    const [isProjectConversationsLoading, setIsProjectConversationsLoading] = useState(false);
    const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<LlmModel>(DEFAULT_MODEL);

    const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const conversationLoadRequestIdRef = useRef(0);
    const newChatInProgressRef = useRef(false);
    
    // Track the projectId to pass when starting a new chat from project view
    const pendingProjectIdRef = useRef<string | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        async function getInfo() {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                setSession(data.session);
                setUser(data.session.user);
            } else {
                navigate("/auth");
            }
        }
        getInfo();
    }, [navigate]);

    useEffect(() => {
        if (session?.access_token) {
            fetchHistory();
            fetchProjects();
        }
    }, [session]);

    const fetchHistory = async () => {
        if (!session) return;
        try {
            const res = await axios.get(`${BACKEND_URL}/conversations/titles`, {
                headers: { Authorization: session.access_token }
            });
            if (res.data && res.data.conversations) {
                setHistory(res.data.conversations);
            }
        } catch (e) {
            console.error("Error fetching history", e);
        }
    };

    const handleMoveConversationToProject = async (conversationId: string, projectId: string): Promise<boolean> => {
        if (!session) return false;
        try {
            const res = await fetch(`${BACKEND_URL}/conversations/${conversationId}/move_project`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": session.access_token,
                },
                body: JSON.stringify({ projectId }),
            });
            if (res.ok) {
                // refresh history to reflect project changes
                fetchHistory();
                return true;
            }
            return false;
        } catch (err) {
            console.error("Move conversation failed", err);
            return false;
        }
    };

    const handleRemoveConversationFromProject = async (conversationId: string, projectId: string): Promise<boolean> => {
        if (!session) return false;
        try {
            const res = await fetch(`${BACKEND_URL}/projects/conversations/${conversationId}/remove`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": session.access_token,
                },
                body: JSON.stringify({ projectId }),
            });
            if (res.ok) {
                setProjectConversations((prev) => prev.filter((c) => c.id !== conversationId));
                fetchProjects();
                return true;
            }
            return false;
        } catch (err) {
            console.error("Remove conversation from project failed", err);
            return false;
        }
    };

    const fetchProjects = async () => {
        if (!session) return;
        try {
            const res = await axios.get(`${BACKEND_URL}/projects`, {
                headers: { Authorization: session.access_token }
            });
            if (res.data && res.data.projects) {
                setProjects(res.data.projects);
            }
        } catch (e) {
            console.error("Error fetching projects", e);
        }
    };

    const fetchProjectConversations = async (projectId: string) => {
        if (!session) return;
        // Clear immediately so stale conversations from the previous project
        // never flash while the new ones are loading.
        setProjectConversations([]);
        setIsProjectConversationsLoading(true);
        try {
            const res = await axios.get(`${BACKEND_URL}/projects/${projectId}/conversations`, {
                headers: { Authorization: session.access_token }
            });
            if (res.data && res.data.conversations) {
                setProjectConversations(res.data.conversations);
            }
        } catch (e) {
            console.error("Error fetching project conversations", e);
            setProjectConversations([]);
        } finally {
            setIsProjectConversationsLoading(false);
        }
    };

    const handleSelectProject = (project: Project) => {
        // Navigate to /project/:id — this clears routeSlug so the conversation
        // useEffect won't fire. newChatInProgressRef guards the one render cycle
        // where both the old slug and the new route coexist in React state.
        newChatInProgressRef.current = true;
        navigate(`/project/${project.id}`);
        setCurrentProject(project);
        setView("project");
        setCurrentConversationId(null);
        setCurrentConversationSlug(null);
        setMessages([]);
        setFollowUpQuestions([]);
        setSources([]);
        setSourcesMode("unknown");
        setChatInput("");
        fetchProjectConversations(project.id);
        if (window.innerWidth < 1024) setSidebarOpen(false);
    };

    // Drive project view from URL — handles browser back/forward and direct links
    useEffect(() => {
        if (!routeProjectId || !session || projects.length === 0) return;
        // Skip if we're already showing this project (e.g. just navigated there via handleSelectProject)
        if (currentProject?.id === routeProjectId) return;
        const project = projects.find((p) => p.id === routeProjectId);
        if (!project) {
            navigate("/");
            return;
        }
        // Load without calling navigate again to avoid a loop
        setCurrentProject(project);
        setView("project");
        setCurrentConversationId(null);
        setCurrentConversationSlug(null);
        setMessages([]);
        setFollowUpQuestions([]);
        setSources([]);
        setSourcesMode("unknown");
        setChatInput("");
        fetchProjectConversations(project.id);
        if (window.innerWidth < 1024) setSidebarOpen(false);
    }, [routeProjectId, session, projects]);

    const handleCreateProject = async (name: string, description: string) => {
        if (!session) throw new Error("Not authenticated");
        await axios.post(
            `${BACKEND_URL}/create/project`,
            { projectName: name, projectDesc: description },
            { headers: { Authorization: session.access_token } }
        );
        await fetchProjects();
    };

    const handleDeleteConversation = async (id: string) => {
        if (!session) return;
        try {
            await axios.delete(`${BACKEND_URL}/conversations/${id}`, {
                headers: { Authorization: session.access_token }
            });
            setHistory((prev) => prev.filter((c) => c.id !== id));
            if (currentConversationId === id) {
                createNewChat();
            }
            // Also refresh project conversations if we're in project view
            if (currentProject) {
                setProjectConversations((prev) => prev.filter((c) => c.id !== id));
            }
        } catch (e) {
            console.error("Error deleting conversation", e);
        }
    };

    const handleDeleteProject = async (id: string) => {
        if (!session) return;
        try {
            await axios.delete(`${BACKEND_URL}/projects/${id}`, {
                headers: { Authorization: session.access_token }
            });
            setProjects((prev) => prev.filter((p) => p.id !== id));
            // Navigate away if the deleted project is currently open
            if (currentProject?.id === id) {
                setCurrentProject(null);
                setView("chat");
                setProjectConversations([]);
                navigate("/");
            }
        } catch (e) {
            console.error("Error deleting project", e);
        }
    };

    const loadConversation = async (id: string, slug?: string, updateUrl: boolean = true) => {
        if (!session) return;
        const requestId = ++conversationLoadRequestIdRef.current;
        const resolvedSlug = slug ?? history.find((chat) => chat.id === id)?.slug ?? null;
        setIsConversationLoading(true);
        setView("chat");
        setCurrentConversationId(id);
        setCurrentConversationSlug(resolvedSlug);
        setMessages([]);
        if (updateUrl && resolvedSlug) {
            navigate(`/chat/${resolvedSlug}`);
        }
        // Reset transient state before loading a different conversation
        setFollowUpQuestions([]);
        setSources([]);
        setSourcesMode("unknown");
        try {
            const res = await axios.get(`${BACKEND_URL}/conversations/${id}`, {
                headers: { Authorization: session.access_token }
            });

            if (requestId !== conversationLoadRequestIdRef.current) return;

            if (res.data && res.data.conversation) {
                const msgs = res.data.conversation.messages.map((m: any) => ({
                    id: m.id,
                    role: m.role.toLowerCase(),
                    content: m.content
                }));
                setMessages(msgs);
                const loadedSlug = resolvedSlug ?? res.data.conversation.slug ?? null;
                setCurrentConversationSlug(loadedSlug);
                const conversationSources = res.data.conversation.sources ?? null;
                const conversationSourcesMode = res.data.conversation.sourcesMode ?? null;
                if (Array.isArray(conversationSources) && conversationSources.length > 0) {
                    const urls = conversationSources.map((s: { url: string }) => s.url).filter(Boolean);
                    setSources(urls);
                    setSourcesMode("web");
                    setSourcesByConversation(prev => ({
                        ...prev,
                        [id]: { sources: urls, mode: "web" }
                    }));
                } else if (conversationSourcesMode === "off") {
                    setSources([]);
                    setSourcesMode("off");
                    setSourcesByConversation(prev => ({
                        ...prev,
                        [id]: { sources: [], mode: "off" }
                    }));
                } else {
                    const cachedSources = sourcesByConversation[id];
                    if (cachedSources) {
                        setSources(cachedSources.sources);
                        setSourcesMode(cachedSources.mode);
                    } else {
                        setSources([]);
                        setSourcesMode("unknown");
                    }
                }
                setActiveTab("answer");
                setView("chat");
                if (window.innerWidth < 1024) setSidebarOpen(false);
            }
        } catch (e) {
            console.error("Error loading chat", e);
        } finally {
            if (requestId === conversationLoadRequestIdRef.current) {
                setIsConversationLoading(false);
            }
        }
    };

    const copyToClipboard = async (text: string): Promise<boolean> => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }

            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand("copy");
            document.body.removeChild(textArea);
            return successful;
        } catch {
            return false;
        }
    };

    const handleCopyMessage = async (messageId: string, messageContent: string) => {
        const copied = await copyToClipboard(messageContent);
        if (!copied) {
            console.error("Copy failed");
            return;
        }

        setCopiedMessageId(messageId);
        window.setTimeout(() => {
            setCopiedMessageId((prev) => (prev === messageId ? null : prev));
        }, 1500);
    };

    useEffect(() => {
        // If a new-chat navigation is in progress, the routeSlug may still hold
        // the previous conversation's slug (stale) while currentConversationId is
        // already null. Skip this effect run to avoid re-loading the old conversation.
        if (newChatInProgressRef.current) {
            newChatInProgressRef.current = false;
            return;
        }
        if (!routeSlug || !session) return;
        if (currentConversationSlug === routeSlug) return;
        if (history.length === 0) return;

        const matchedConversation = history.find((chat) => chat.slug === routeSlug);
        if (!matchedConversation) {
            navigate("/");
            return;
        }

        if (matchedConversation.id !== currentConversationId) {
            loadConversation(matchedConversation.id, matchedConversation.slug, false);
        }
    }, [routeSlug, session, history, currentConversationId, currentConversationSlug]);

    const createNewChat = () => {
        // Set the flag BEFORE state changes so the routeSlug useEffect
        // can detect the stale-slug window during the navigation transition.
        newChatInProgressRef.current = true;
        conversationLoadRequestIdRef.current += 1;
        setCurrentConversationId(null);
        setCurrentConversationSlug(null);
        setMessages([]);
        setView("chat");
        setChatInput("");
        setActiveTab("answer");
        setSources([]);
        setSourcesMode("unknown");
        setFollowUpQuestions([]);
        setIsConversationLoading(false);
        pendingProjectIdRef.current = null;
        navigate("/");
        if (window.innerWidth < 1024) setSidebarOpen(false);
    };

    const handleLogout = () => {
        supabase.auth.signOut();
        setUser(null);
        navigate("/auth");
    };

    const handleSendMessage = async (overrideQuery?: string) => {
        const query = (overrideQuery ?? chatInput).trim();
        if (!query || isLoading || !session) return;

        // When called from project view, capture projectId before switching view
        const projectIdForNewChat = pendingProjectIdRef.current;

        setChatInput("");
        setIsLoading(true);
        setActiveTab("answer");
        // Clear follow-ups as soon as the user sends a new message
        setFollowUpQuestions([]);

        // If we were in project view and this is a brand new chat, switch to chat view now
        if (!currentConversationId && projectIdForNewChat) {
            setView("chat");
            setCurrentProject(null);
        }

        const userMessageMsgId = Date.now().toString() + "user";
        const newMessages: ChatMessage[] = [
            ...messages,
            { id: userMessageMsgId, role: "user", content: query }
        ];
        setMessages(newMessages);

        const aiMessageMsgId = Date.now().toString() + "ai";
        setMessages(prev => [...prev, { id: aiMessageMsgId, role: "assistant", content: "" }]);

        try {
            const endpoint = currentConversationId ? "/qubit_ask/follow_up" : "/qubit_ask";
            const payload = currentConversationId
                ? { query, conversationId: currentConversationId, webSearchEnabled, model: selectedModel }
                : {
                    query,
                    webSearchEnabled,
                    model: selectedModel,
                    ...(projectIdForNewChat ? { projectId: projectIdForNewChat } : {}),
                };

            const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": session.access_token
                },
                body: JSON.stringify(payload)
            });

            if (!response.body) throw new Error("No body in response");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            let updatedContent = "";
            let newConvId = currentConversationId;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.replace("data: ", "");
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.type === "chunk") {
                                updatedContent += data.text;
                                setMessages(prev => prev.map(msg =>
                                    msg.id === aiMessageMsgId ? { ...msg, content: updatedContent } : msg
                                ));
                            } else if (data.type === "meta" && data.conversationId) {
                                const conversationIdKey = String(data.conversationId);
                                newConvId = conversationIdKey;
                                setCurrentConversationId(conversationIdKey);
                                if (typeof data.conversationSlug === "string" && data.conversationSlug.length > 0) {
                                    setCurrentConversationSlug(data.conversationSlug);
                                    navigate(`/chat/${data.conversationSlug}`);
                                }
                                if (Array.isArray(data.sources)) {
                                    const newUrls: string[] = data.sources.map((s: { url: string }) => s.url);
                                    // Accumulate sources — dedupe against existing
                                    setSources(prev => {
                                        const combined = [...prev, ...newUrls];
                                        return Array.from(new Set(combined));
                                    });
                                    setSourcesMode("web");
                                    setSourcesByConversation(prev => ({
                                        ...prev,
                                        [conversationIdKey]: { sources: newUrls, mode: "web" }
                                    }));
                                } else {
                                    // Web search was off for this turn.
                                    // Only mark sourcesMode as "off" if no sources were accumulated
                                    // from previous turns in this same conversation.
                                    if (sources.length === 0) {
                                        setSourcesMode("off");
                                    }
                                    // Do NOT wipe existing sources — they stay visible.
                                }
                            }
                        } catch (e) {
                            // ignore parsing error for incomplete chunks
                        }
                    }
                }
            }

            // Stream complete — parse follow-up questions from the final content
            const { followUps } = parseAIContent(updatedContent);
            setFollowUpQuestions(followUps);

            if (!currentConversationId && newConvId) {
                fetchHistory();
                // Also refresh project conversations if this chat was linked to a project
                if (projectIdForNewChat) {
                    fetchProjectConversations(projectIdForNewChat);
                    fetchProjects(); // update conversation count badge
                }
            }

            // Clear the pending project ref after the first message is sent
            pendingProjectIdRef.current = null;

        } catch (error) {
            console.error(error);
            setMessages(prev => prev.map(msg =>
                msg.id === aiMessageMsgId ? { ...msg, content: "Error: Failed to fetch response." } : msg
            ));
        } finally {
            setIsLoading(false);
        }
    };

    // Called from ProjectView — sets projectId context then fires handleSendMessage
    const handleSendFromProject = (query: string) => {
        if (!currentProject) return;
        pendingProjectIdRef.current = currentProject.id;
        setChatInput(query);
        // Use timeout so state is set before handleSendMessage reads it
        setTimeout(() => handleSendMessage(query), 0);
    };

    const handleRequestShare = async (): Promise<boolean> => {
        if (!session) return false;
        if (!currentConversationId) {
            console.warn("No conversation to share");
            return false;
        }

        try {
            const res = await fetch(`${BACKEND_URL}/public/${currentConversationId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": session.access_token,
                },
            });
            return res.ok;
        } catch (err) {
            console.error("Failed to mark public", err);
            return false;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <DashboardSidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                view={view}
                currentProjectId={currentProject?.id ?? null}
                onSelectProject={handleSelectProject}
                history={history}
                projects={projects}
                currentConversationId={currentConversationId}
                onSelectConversation={loadConversation}
                onCreateNewChat={createNewChat}
                onCreateProject={() => setNewProjectModalOpen(true)}
                onDeleteProject={handleDeleteProject}
                onDeleteConversation={handleDeleteConversation}
                onMoveConversationToProject={handleMoveConversationToProject}
                user={user}
                onLogout={handleLogout}
                onSignIn={() => navigate("/auth")}
            />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="h-8 w-8 -ml-2 text-slate-500">
                            <Menu size={20} />
                        </Button>
                        <span className="font-semibold">Qubit</span>
                    </div>
                </header>

                {view === "project" && currentProject ? (
                    // ── Project detail view ──
                    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                        <ProjectView
                            project={currentProject}
                            conversations={projectConversations}
                            isConversationsLoading={isProjectConversationsLoading}
                            onSendQuery={handleSendFromProject}
                            onOpenConversation={loadConversation}
                            onRemoveConversation={(id) => handleRemoveConversationFromProject(id, currentProject.id)}
                            chatInput={chatInput}
                            onChatInputChange={setChatInput}
                            isLoading={isLoading}
                            webSearchEnabled={webSearchEnabled}
                            onToggleWebSearch={() => setWebSearchEnabled(!webSearchEnabled)}
                            selectedModel={selectedModel}
                            modelOptions={MODEL_OPTIONS}
                            onModelChange={setSelectedModel}
                        />
                    </div>
                ) : isConversationLoading && currentConversationId !== null ? (
                    <ConversationLoaderPage />
                ) : (
                    // ── Chat view ──
                    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                        <TopTabs activeTab={activeTab} setActiveTab={setActiveTab} onRequestShare={handleRequestShare} conversationSlug={currentConversationSlug} />

                        {activeTab === "answer" ? (
                            <ChatMessagesPanel
                                messages={messages}
                                isLoading={isLoading}
                                followUpQuestions={followUpQuestions}
                                onFollowUpClick={(q) => setChatInput(q)}
                                onCopyMessage={handleCopyMessage}
                                copiedMessageId={copiedMessageId}
                                messagesEndRef={messagesEndRef}
                            />
                        ) : (
                            <SourcesPanel sourcesMode={sourcesMode} sources={sources} />
                        )}

                        {activeTab === "answer" && (
                            <ChatInputBox
                                chatInput={chatInput}
                                onChatInputChange={setChatInput}
                                onKeyDown={handleKeyDown}
                                isLoading={isLoading}
                                webSearchEnabled={webSearchEnabled}
                                onToggleWebSearch={() => setWebSearchEnabled(!webSearchEnabled)}
                                onSendMessage={handleSendMessage}
                                selectedModel={selectedModel}
                                modelOptions={MODEL_OPTIONS}
                                onModelChange={setSelectedModel}
                            />
                        )}
                    </div>
                )}
            </main>

            {/* New Project Modal */}
            <NewProjectModal
                open={newProjectModalOpen}
                onClose={() => setNewProjectModalOpen(false)}
                onSubmit={handleCreateProject}
            />
        </div>
    );
}