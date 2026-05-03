import { ChevronRight } from "lucide-react";
import type { SourcesMode } from "./types";
import { getDomain } from "./utils";

interface SourcesPanelProps {
    sourcesMode: SourcesMode;
    sources: string[];
}

export function SourcesPanel({ sourcesMode, sources }: SourcesPanelProps) {
    return (
        <div className="flex-1 overflow-y-auto px-4 md:px-0">
            <div className="max-w-3xl mx-auto py-6 pb-32">
                {sourcesMode === "web" ? (
                    sources.length > 0 ? (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-4">
                                {sources.length} source{sources.length !== 1 ? "s" : ""} cited
                            </p>
                            {sources.map((url, idx) => (
                                <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all group"
                                >
                                    <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                                        <img
                                            src={`https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=32`}
                                            alt=""
                                            className="w-4 h-4"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-400 group-hover:text-indigo-500 mb-0.5 transition-colors">
                                            {idx + 1}. {getDomain(url)}
                                        </p>
                                        <p className="text-sm text-slate-700 truncate">{url}</p>
                                    </div>
                                    <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-indigo-400 mt-1 transition-colors" />
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 py-10">No sources were returned for this query.</div>
                    )
                ) : sourcesMode === "off" ? (
                    <div className="text-center text-slate-400 py-10">Web search was off for this query. Turn it on to see sources.</div>
                ) : (
                    <div className="text-center text-slate-400 py-10">Sources are available only for queries run with Web Search enabled.</div>
                )}
            </div>
        </div>
    );
}
