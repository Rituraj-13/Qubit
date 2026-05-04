export type Role = "user" | "assistant";

export interface ChatMessage {
    id: string;
    role: Role;
    content: string;
}

export interface ConversationHistory {
    id: string;
    title: string;
    slug: string;
    projectId?: string | null;
}

export interface Project {
    id: string;
    project_name: string;
    description?: string | null;
    createdAt: string;
    _count?: { conversations: number };
}

export interface ProjectConversation {
    id: string;
    title: string | null;
    slug: string;
    createdAt: string;
}

export type SourcesMode = "web" | "off" | "unknown";


export type ModelOption = {
    label: string;
    value: string;
};

export const MODEL_OPTIONS: readonly ModelOption[] = [
    { label: "Qwen 3.32b", value: "qwen/qwen3-32b" },
    { label: "llama-70b", value: "llama-3.3-70b-versatile" },
    { label: "gpt-oss-120b", value: "openai/gpt-oss-120b" },
    // { label: "Whisper Large v3 Turbo", value: "whisper-large-v3-turbo" },
] as const;

export type LlmModel = (typeof MODEL_OPTIONS)[number]["value"];

export const DEFAULT_MODEL: LlmModel = "llama-3.3-70b-versatile";
