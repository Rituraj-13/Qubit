import * as z from "zod";

export const allowedModels = [
    "qwen/qwen3-32b",
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-120b",
    "whisper-large-v3-turbo",
] as const;

export const modelSchema = z.enum(allowedModels).default("llama-3.3-70b-versatile");

export const reqfollowUpSchema = z.object({
    query: z.string().trim().min(1),
    conversationId: z.uuid(),
    model: modelSchema,
});


export const newChat = z.object({
    query: z.string().trim().min(1),
    webSearchEnabled: z.boolean().default(false),
    model: modelSchema,
});