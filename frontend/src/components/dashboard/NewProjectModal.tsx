import { useState, useEffect, useRef } from "react";
import { X, FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewProjectModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, description: string) => Promise<void>;
}

export function NewProjectModal({ open, onClose, onSubmit }: NewProjectModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setName("");
            setDescription("");
            setError(null);
            setLoading(false);
            // auto-focus after mount
            setTimeout(() => nameRef.current?.focus(), 50);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError("Project name is required.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await onSubmit(trimmed, description.trim());
            onClose();
        } catch (err: any) {
            setError(err?.message ?? "Failed to create project.");
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={!loading ? onClose : undefined}
            />

            {/* Modal panel */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                        <FolderPlus size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 leading-tight">New Project</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Organise related chats together</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="ml-auto h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="proj-name" className="text-xs font-medium text-slate-600">
                            Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="proj-name"
                            ref={nameRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Research, Work, Side Project…"
                            maxLength={80}
                            disabled={loading}
                            className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all disabled:opacity-60"
                        />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="proj-desc" className="text-xs font-medium text-slate-600">
                            Description <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            id="proj-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this project about?"
                            rows={3}
                            maxLength={300}
                            disabled={loading}
                            className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all resize-none disabled:opacity-60"
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-red-500 -mt-1">{error}</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            disabled={loading}
                            className="text-slate-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={loading || !name.trim()}
                            className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
                        >
                            {loading ? (
                                <><Loader2 size={14} className="animate-spin" /> Creating…</>
                            ) : (
                                <>Create Project</>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
