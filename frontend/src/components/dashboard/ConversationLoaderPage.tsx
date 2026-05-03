export function ConversationLoaderPage() {
    return (
        <div className="flex-1 overflow-y-auto px-4 md:px-0">
            <div className="max-w-3xl mx-auto py-6 space-y-6 pb-44">
                <div className="flex justify-end">
                    <div className="w-[55%] rounded-2xl rounded-tr-sm bg-slate-100 px-5 py-4 space-y-2 animate-pulse">
                        <div className="h-3 rounded bg-slate-200 w-4/5" />
                        <div className="h-3 rounded bg-slate-200 w-full" />
                    </div>
                </div>

                <div className="flex justify-start">
                    <div className="w-[80%] px-2 py-2 space-y-3 animate-pulse">
                        <div className="h-3 rounded bg-slate-100 w-5/6" />
                        <div className="h-3 rounded bg-slate-100 w-full" />
                        <div className="h-3 rounded bg-slate-100 w-4/6" />
                        <div className="h-3 rounded bg-slate-100 w-5/6" />
                    </div>
                </div>

                <div className="flex justify-end">
                    <div className="w-[42%] rounded-2xl rounded-tr-sm bg-slate-100 px-5 py-4 space-y-2 animate-pulse">
                        <div className="h-3 rounded bg-slate-200 w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
