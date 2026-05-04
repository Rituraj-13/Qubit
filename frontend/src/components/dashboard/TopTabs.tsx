import { Astroid, Layers } from "lucide-react";
import { useState } from "react";

interface TopTabsProps {
    activeTab: "answer" | "sources";
    setActiveTab: (tab: "answer" | "sources") => void;
    onRequestShare?: () => Promise<boolean>;
    conversationSlug?: string | null;
}

export function TopTabs({ activeTab, setActiveTab, onRequestShare, conversationSlug }: TopTabsProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isChatStarted = typeof conversationSlug === "string" && conversationSlug.length > 0;

    const openShare = async () => {
        if (!onRequestShare || !isChatStarted) return;
        setOpen(true);
        setLoading(true);
        setError(null);
        try {
            const ok = await onRequestShare();
            setEnabled(Boolean(ok));
        } catch (err: any) {
            setError(String(err?.message ?? err));
        } finally {
            setLoading(false);
        }
    };

    const close = () => {
        setOpen(false);
        setEnabled(false);
        setError(null);
        setLoading(false);
    };

    const shareUrl = isChatStarted
        ? `${window.location.origin}/share/${conversationSlug}`
        : "";

    const copyLink = async () => {
        if (!shareUrl) return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(shareUrl);
            } else {
                const ta = document.createElement("textarea");
                ta.value = shareUrl;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
            }
        } catch (_) { }
    };

    return (
        <div className="flex items-center justify-between pt-6 pb-2 px-4 sm:px-6 shrink-0 gap-2">
            {/* Invisible left spacer to keep tabs centred on larger screens */}
            <div className="hidden sm:flex flex-shrink-0 w-[88px]" aria-hidden="true" />

            {/* Tab group – centred */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg mx-auto">
                <button
                    onClick={() => setActiveTab("answer")}
                    className={`flex gap-2 px-4 py-1.5 text-sm font-medium rounded-md ${activeTab === "answer" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                    <Astroid size={20} />
                    Answer
                </button>
                <button
                    onClick={() => setActiveTab("sources")}
                    className={`flex gap-2 px-4 py-1.5 text-sm font-medium rounded-md ${activeTab === "sources" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                    <Layers size={20} />
                    Sources
                </button>
            </div>

            {/* Share button – right-aligned, always visible */}
            <div className="flex-shrink-0">
                <button
                    onClick={openShare}
                    disabled={!isChatStarted}
                    aria-disabled={!isChatStarted}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border whitespace-nowrap ${isChatStarted ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50" : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"}`}
                >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                    <span className="hidden sm:inline">Share</span>
                </button>
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/30" onClick={close} />
                    <div className="relative bg-white rounded-lg p-6 w-full max-w-lg z-10">
                        <h3 className="text-sm font-medium mb-2">Share conversation</h3>
                        <p className="text-xs text-slate-500 mb-4">This will create a public, read-only link to view this conversation.</p>

                        <div className="flex items-center gap-2">
                            <input
                                readOnly
                                value={loading ? "Generating link..." : enabled ? shareUrl : ""}
                                className="flex-1 px-3 py-2 border rounded-lg text-xs bg-slate-50"
                            />
                            <button
                                onClick={copyLink}
                                disabled={!enabled}
                                aria-disabled={!enabled}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 ${enabled ? "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                            >
                                Copy Link
                            </button>
                            <button
                                onClick={close}
                                className="px-3 py-1.5 rounded-md text-sm font-medium border border-slate-200 text-slate-700 bg-white transition-colors hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                            >
                                Cancel
                            </button>
                        </div>

                        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
