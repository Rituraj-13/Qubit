import { useState, useRef, useEffect } from "react";
import { ArrowUp, Globe, MessageSquare, Paperclip, Clock, ChevronDown, Check, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Project, ProjectConversation, LlmModel, ModelOption } from "./types";

interface ProjectViewProps {
    project: Project;
    conversations: ProjectConversation[];
    isConversationsLoading?: boolean;
    // called when the user hits Send from this view
    onSendQuery: (query: string) => void;
    onOpenConversation: (id: string, slug: string) => void;
    onRemoveConversation: (id: string) => Promise<boolean>;
    // chat-input state mirrors
    chatInput: string;
    onChatInputChange: (v: string) => void;
    isLoading: boolean;
    webSearchEnabled: boolean;
    onToggleWebSearch: () => void;
    selectedModel: LlmModel;
    modelOptions: readonly ModelOption[];
    onModelChange: (m: LlmModel) => void;
}

function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ProjectView({
    project,
    conversations,
    isConversationsLoading,
    onSendQuery,
    onOpenConversation,
    onRemoveConversation,
    chatInput,
    onChatInputChange,
    isLoading,
    webSearchEnabled,
    onToggleWebSearch,
    selectedModel,
    modelOptions,
    onModelChange,
}: ProjectViewProps) {
    const [isModelOpen, setIsModelOpen] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const modelPickerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
                setIsModelOpen(false);
            }
        };
        if (isModelOpen) window.addEventListener("mousedown", handleOutside);
        return () => window.removeEventListener("mousedown", handleOutside);
    }, [isModelOpen]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (chatInput.trim() && !isLoading) onSendQuery(chatInput.trim());
        }
    };

    const handleSend = () => {
        if (chatInput.trim() && !isLoading) onSendQuery(chatInput.trim());
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-0">
                <div className="max-w-3xl mx-auto py-10 pb-56">
                    {/* Project heading */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 text-lg font-bold select-none">
                            {project.project_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                                {project.project_name}
                            </h1>
                            {project.description && (
                                <p className="text-sm text-slate-400 mt-0.5">{project.description}</p>
                            )}
                        </div>
                    </div>

                    {/* Conversations list */}
                    {isConversationsLoading ? (
                        <div className="space-y-2 mt-4 animate-pulse">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-12 bg-slate-100 rounded-xl w-full" />
                            ))}
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                <MessageSquare size={22} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-600">No chats yet</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Ask something below to start your first conversation in this project.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                Chats · {conversations.length}
                            </div>
                            {conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => onOpenConversation(conv.id, conv.slug)}
                                    className="w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <MessageSquare size={15} className="text-slate-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate group-hover:text-slate-900">
                                                {conv.title ?? "Untitled Chat"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={12} />
                                            {formatRelativeDate(conv.createdAt)}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                setRemovingId(conv.id);
                                                try {
                                                    await onRemoveConversation(conv.id);
                                                } finally {
                                                    setRemovingId(null);
                                                }
                                            }}
                                            disabled={removingId === conv.id}
                                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label="Remove from project"
                                        >
                                            <Trash2 size={12} />
                                            <span>Remove</span>
                                        </button>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat input — pinned to bottom, same as main chat page */}
            <div className="p-4 md:px-0 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-10 pointer-events-none">
                <div className="max-w-3xl mx-auto pointer-events-auto">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-slate-200 focus-within:border-slate-300 transition-all flex flex-col gap-2">
                        <Textarea
                            ref={textareaRef}
                            placeholder={`Ask anything in ${project.project_name}…`}
                            value={chatInput}
                            onChange={(e) => onChatInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            className="min-h-11 max-h-48 resize-none bg-transparent border-none shadow-none focus-visible:ring-0 text-base py-2 px-1 text-slate-900 placeholder:text-slate-400"
                            rows={1}
                        />
                        <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isLoading}
                                    className={`h-8 w-8 rounded-full transition-colors ${webSearchEnabled ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700" : "text-slate-400 hover:bg-slate-200/50 hover:text-slate-600"}`}
                                    onClick={onToggleWebSearch}
                                    title="Toggle Web Search"
                                >
                                    <Globe size={18} />
                                </Button>
                                {/* <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isLoading}
                                    className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-200/50 hover:text-slate-600"
                                    title="Attach File"
                                >
                                    <Paperclip size={18} />
                                </Button> */}
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative" ref={modelPickerRef}>
                                    <button
                                        disabled={isLoading}
                                        onClick={() => setIsModelOpen((p) => !p)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-200/50 hover:text-slate-700 transition-colors"
                                    >
                                        {modelOptions.find((o) => o.value === selectedModel)?.label ?? selectedModel}
                                        <ChevronDown size={14} />
                                    </button>
                                    {isModelOpen && (
                                        <div className="absolute bottom-10 right-0 w-64 rounded-xl border border-slate-200 bg-white shadow-lg p-1 z-20">
                                            {modelOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left rounded-lg text-slate-700 hover:bg-slate-100"
                                                    onClick={() => {
                                                        onModelChange(opt.value as LlmModel);
                                                        setIsModelOpen(false);
                                                    }}
                                                >
                                                    <span className="truncate">{opt.label}</span>
                                                    {selectedModel === opt.value && <Check size={14} className="text-indigo-600 shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Button
                                    size="icon"
                                    onClick={handleSend}
                                    disabled={!chatInput.trim() || isLoading}
                                    className={`h-9 w-9 rounded-full transition-colors ${chatInput.trim() || isLoading ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                                >
                                    <ArrowUp size={18} />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 text-center text-xs text-slate-400">
                        Chats here are linked to project <span className="font-medium">{project.project_name}</span>.
                    </div>
                </div>
            </div>
        </div>
    );
}
