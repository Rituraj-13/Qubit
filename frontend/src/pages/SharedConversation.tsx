import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router";
import { BACKEND_URL } from "@/lib/config";
import { ChatMessagesPanel } from "@/components/dashboard/ChatMessagesPanel";
import type { ChatMessage } from "@/components/dashboard/types";
import { AlertCircle, ArrowLeft, Lock, Sparkles } from "lucide-react";

export default function SharedConversation() {
    const { slug } = useParams();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [title, setTitle] = useState<string>("Shared conversation");
    const [status, setStatus] = useState<"loading" | "ready" | "not_found" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState<string>("This shared conversation could not be found.");
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        async function load() {
            if (!slug) return;
            setStatus("loading");
            setTitle("Shared conversation");
            setErrorMessage("This shared conversation could not be found.");
            setIsLoading(true);
            try {
                const res = await fetch(`${BACKEND_URL}/share/conversations/${encodeURIComponent(slug)}`);
                if (!res.ok) {
                    let message = "This shared conversation could not be found.";
                    try {
                        const payload = await res.json();
                        if (typeof payload?.message === "string") {
                            message = payload.message;
                        }
                    } catch {
                        // ignore body parsing issues and fall back to default message
                    }

                    setMessages([]);
                    setErrorMessage(message);
                    setStatus(res.status === 404 ? "not_found" : "error");
                    return;
                }

                const data = await res.json();
                const msgs = (data.conversation.messages || []).map((m: any) => ({
                    id: m.id,
                    role: m.role.toLowerCase(),
                    content: m.content,
                }));
                setMessages(msgs);
                setTitle(data.conversation.title || "Shared conversation");
                setStatus("ready");
            } catch (err) {
                console.error(err);
                setMessages([]);
                setStatus("error");
                setErrorMessage("We couldn't load this shared conversation right now.");
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [slug]);

    const copyToClipboard = async (text: string) => {
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

    return (
        <div className="min-h-dvh bg-linear-to-b from-slate-50 via-white to-slate-50 text-slate-900">
            <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3 min-w-0">
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
                            <Sparkles size={14} className="text-indigo-500" />
                            Read-only shared conversation
                        </div>

                        <div className="space-y-1">
                            <h1 className="wrap-break-word text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                                {title}
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500 sm:text-[15px]">
                                Anyone with this link can view the conversation, but replies and follow-ups are disabled.
                            </p>
                        </div>
                    </div>

                    <a
                        href="/"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:w-auto"
                    >
                        <ArrowLeft size={16} />
                        Back home
                    </a>
                </div>

                {status === "ready" ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] sm:rounded-3xl">
                        <ChatMessagesPanel
                            messages={messages}
                            isLoading={isLoading}
                            followUpQuestions={[]}
                            onFollowUpClick={() => { }}
                            onCopyMessage={handleCopyMessage}
                            copiedMessageId={copiedMessageId}
                            messagesEndRef={messagesEndRef}
                        />
                    </div>
                ) : (
                    <div className="mx-auto flex max-w-2xl items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 shadow-sm sm:rounded-3xl sm:px-6 sm:py-16">
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50 sm:h-14 sm:w-14">
                                <AlertCircle size={24} className="sm:h-7 sm:w-7" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-950 sm:text-xl">
                                {status === "not_found" ? "The conversation doesn't exist" : "Unable to load this shared conversation"}
                            </h2>
                            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 sm:text-[15px]">
                                {errorMessage}
                            </p>

                            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                                <a
                                    href="/"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:w-auto"
                                >
                                    <Lock size={16} />
                                    Go back to app
                                </a>
                                <span className="text-xs text-slate-400 sm:text-left">
                                    Shared links are view-only
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {status === "loading" && (
                    <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-6 sm:rounded-3xl sm:p-6">
                        <div className="h-4 w-40 animate-pulse rounded-full bg-slate-100" />
                        <div className="space-y-3">
                            <div className="h-16 animate-pulse rounded-2xl bg-slate-100 sm:h-20" />
                            <div className="ml-auto h-14 w-4/5 animate-pulse rounded-2xl bg-slate-100 sm:h-16" />
                            <div className="h-16 animate-pulse rounded-2xl bg-slate-100 sm:h-20" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
