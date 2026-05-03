import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Check, ChevronDown, Globe, Paperclip } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LlmModel, ModelOption } from "./types";

interface ChatInputBoxProps {
    chatInput: string;
    onChatInputChange: (value: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    isLoading: boolean;
    webSearchEnabled: boolean;
    onToggleWebSearch: () => void;
    onSendMessage: () => void;
    selectedModel: LlmModel;
    modelOptions: readonly ModelOption[];
    onModelChange: (model: LlmModel) => void;
}

export function ChatInputBox({
    chatInput,
    onChatInputChange,
    onKeyDown,
    isLoading,
    webSearchEnabled,
    onToggleWebSearch,
    onSendMessage,
    selectedModel,
    modelOptions,
    onModelChange,
}: ChatInputBoxProps) {
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const modelPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!modelPickerRef.current) return;
            const target = event.target as Node;
            if (!modelPickerRef.current.contains(target)) {
                setIsModelModalOpen(false);
            }
        };

        if (isModelModalOpen) {
            window.addEventListener("mousedown", handleOutsideClick);
        }

        return () => {
            window.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [isModelModalOpen]);

    return (
        <div className="p-4 md:px-0 absolute bottom-0 left-0 right-0 bg-linear-to-t from-white via-white to-transparent pt-10 pointer-events-none">
            <div className="max-w-3xl mx-auto pointer-events-auto">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-slate-200 focus-within:border-slate-300 transition-all flex flex-col gap-2">
                    <Textarea
                        placeholder="Ask Qubit..."
                        value={chatInput}
                        onChange={(e) => onChatInputChange(e.target.value)}
                        onKeyDown={onKeyDown}
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
                                    onClick={() => setIsModelModalOpen((prev) => !prev)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-200/50 hover:text-slate-700 transition-colors"
                                >
                                    {modelOptions.find((o) => o.value === selectedModel)?.label ?? selectedModel} <ChevronDown size={14} />
                                </button>

                                {isModelModalOpen && (
                                    <div className="absolute bottom-10 right-0 w-64 rounded-xl border border-slate-200 bg-white shadow-lg p-1 z-20">
                                        {modelOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left rounded-lg text-slate-700 hover:bg-slate-100"
                                                onClick={() => {
                                                    onModelChange(opt.value as LlmModel);
                                                    setIsModelModalOpen(false);
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
                                onClick={onSendMessage}
                                disabled={!chatInput.trim() || isLoading}
                                className={`h-9 w-9 rounded-full transition-colors ${chatInput.trim() || isLoading ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
                            >
                                <ArrowUp size={18} className={isLoading ? "animate-bounce" : ""} />
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="mt-3 text-center text-xs text-slate-400">Qubit is an AI. It can make mistakes.</div>
            </div>
        </div>
    );
}
