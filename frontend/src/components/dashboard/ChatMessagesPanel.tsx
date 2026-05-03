import React from "react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Check, Copy, Loader2, MessageSquare } from "lucide-react";
import type { ChatMessage } from "./types";
import { parseAIContent } from "./utils";
import type { RefObject } from "react";

interface ChatMessagesPanelProps {
    messages: ChatMessage[];
    isLoading: boolean;
    followUpQuestions: string[];
    onFollowUpClick: (question: string) => void;
    onCopyMessage: (messageId: string, messageContent: string) => void;
    copiedMessageId: string | null;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    // Optional share handler: should return true when conversation marked public
    onRequestShare?: () => Promise<boolean>;
    currentConversationId?: string | null;
    currentConversationSlug?: string | null;
}

export function ChatMessagesPanel({
    messages,
    isLoading,
    followUpQuestions,
    onFollowUpClick,
    onCopyMessage,
    copiedMessageId,
    messagesEndRef,
    onRequestShare,
    currentConversationId,
    currentConversationSlug,
}: ChatMessagesPanelProps) {

    const starterQuestions = [
        "Compare Next.js and Remix for a new SaaS app",
        "Explain vector databases with a simple example",
        "Create a 2-week learning plan for TypeScript",
        "Find 3 sources on renewable energy trends",
    ];


    return (
        <div className="flex-1 overflow-y-auto px-4 md:px-0">
            <div className="max-w-3xl mx-auto py-6 space-y-8 pb-44">

                {messages.length === 0 && (
                    <>
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                Your AI research assistant
                            </div>
                            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
                                Ask anything. Get concise, sourced answers.
                            </h2>
                            <p className="text-sm md:text-base text-slate-500 max-w-xl">
                                Start a conversation or try one of these suggested questions to kick things off.
                            </p>
                        </div>

                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {starterQuestions.map((question, index) => (
                                <button
                                    key={`${question}-${index}`}
                                    onClick={() => onFollowUpClick(question)}
                                    className="group rounded-xl border border-slate-200 bg-white/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="text-sm font-medium text-slate-800 group-hover:text-indigo-700">
                                            {question}
                                        </span>
                                        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700">
                                            <ArrowUp size={14} className="rotate-45" />
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Fast responses</span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Citations included</span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Private by default</span>
                        </div>
                    </>
                )}

                {messages.map((msg) => {
                    const isAssistant = msg.role === "assistant";
                    const displayContent = isAssistant ? parseAIContent(msg.content).answer : msg.content;

                    return (
                        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] group flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                <div
                                    className={`
                    px-5 py-3.5 rounded-2xl text-base leading-relaxed
                    ${msg.role === "user"
                                            ? "bg-slate-100 text-slate-900 rounded-tr-sm"
                                            : "bg-transparent text-slate-800 prose prose-slate prose-sm max-w-none"}
                  `}
                                >
                                    {!displayContent ? (
                                        <span className="animate-pulse">...</span>
                                    ) : isAssistant ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
                                    ) : (
                                        displayContent
                                    )}
                                </div>

                                {isAssistant && (
                                    <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full"
                                            onClick={() => onCopyMessage(msg.id, displayContent)}
                                            title={copiedMessageId === msg.id ? "Copied" : "Copy"}
                                        >
                                            {copiedMessageId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                                        </Button>

                                        {/* share button removed from per-message area; rendered once at top-right instead */}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
                            <Loader2 size={14} className="animate-spin" />
                            <span>Qubit is thinking...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />

                {followUpQuestions.length > 0 && !isLoading && (
                    <div className="max-w-3xl mx-auto mt-8 border-t border-slate-100 pt-6">
                        <h4 className="text-sm font-medium text-slate-900 mb-4 flex items-center gap-2">
                            <MessageSquare size={16} className="text-slate-400" /> Follow-ups
                        </h4>
                        <div className="space-y-2">
                            {followUpQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => onFollowUpClick(q)}
                                    className="w-full text-left p-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 rounded-lg border border-slate-100 flex items-center justify-between group transition-colors"
                                >
                                    <span>{q}</span>
                                    <ArrowUp size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity rotate-45" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
