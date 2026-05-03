import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User } from "@supabase/supabase-js";
import {
    ChevronDown,
    Ellipsis,
    FolderOpen,
    LogOut,
    Menu,
    MessageSquare,
    Plus,
    Search,
    Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ConversationHistory, Project } from "./types";

interface DashboardSidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    view: "chat" | "project";
    currentProjectId: string | null;
    onSelectProject: (project: Project) => void;
    history: ConversationHistory[];
    projects: Project[];
    currentConversationId: string | null;
    onSelectConversation: (id: string, slug: string) => void;
    onCreateNewChat: () => void;
    onCreateProject: () => void;
    onDeleteProject: (id: string) => void;
    onDeleteConversation: (id: string) => void;
    onMoveConversationToProject: (conversationId: string, projectId: string) => Promise<boolean>;
    user: User | null;
    onLogout: () => void;
    onSignIn: () => void;
}

export function DashboardSidebar({
    sidebarOpen,
    setSidebarOpen,
    view,
    currentProjectId,
    onSelectProject,
    history,
    projects,
    currentConversationId,
    onSelectConversation,
    onCreateNewChat,
    onCreateProject,
    onDeleteProject,
    onDeleteConversation,
    onMoveConversationToProject,
    user,
    onLogout,
    onSignIn,
}: DashboardSidebarProps) {
    const [projectsOpen, setProjectsOpen] = useState(true);
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [moveOpenId, setMoveOpenId] = useState<string | null>(null);

    // Position of the main menu trigger (fixed portal)
    const [menuPos, setMenuPos] = useState<{ top: number; left: number; height: number } | null>(null);
    // Position of the "Move to project" button (second fixed portal)
    const [moveMenuPos, setMoveMenuPos] = useState<{ top: number; bottom: number; left: number; right: number } | null>(null);
    const portalRef = useRef<HTMLDivElement | null>(null);
    const movePortalRef = useRef<HTMLDivElement | null>(null);

    // Close portal menus when clicking outside
    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            const target = e.target as Node | null;
            const insideMain = portalRef.current?.contains(target as Node);
            const insideMove = movePortalRef.current?.contains(target as Node);
            if (menuOpenId && !insideMain && !insideMove) {
                setMenuOpenId(null);
                setMoveOpenId(null);
                setMenuPos(null);
                setMoveMenuPos(null);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [menuOpenId]);

    const filteredHistory = search.trim()
        ? history.filter((c) =>
            c.title?.toLowerCase().includes(search.trim().toLowerCase())
        )
        : history;

    const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeletingId(id);
        try {
            await onDeleteConversation(id);
        } finally {
            setDeletingId(null);
        }
    };

    const handleMoveConversation = async (e: React.MouseEvent, conversationId: string, projectId: string) => {
        e.stopPropagation();
        try {
            const ok = await onMoveConversationToProject(conversationId, projectId);
            // close menus
            setMoveOpenId(null);
            setMenuOpenId(null);
            if (ok) {
                // optionally you may refresh or rely on parent to refresh
            }
        } catch (err) {
            console.error("Move failed", err);
        }
    };

    return (
        <aside
            className={`fixed inset-y-0 left-0 bg-slate-100 border-r border-slate-200 w-72 flex flex-col transition-transform duration-300 z-30 lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
            {/* Logo / header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-lg tracking-tighter">Q</span>
                    </div>
                    <span className="font-semibold text-lg tracking-tight">Qubit</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-8 w-8 text-slate-500"
                    onClick={() => setSidebarOpen(false)}
                >
                    <Menu size={20} />
                </Button>
            </div>

            {/* New Chat button */}
            <div className="px-4 pb-2">
                <Button
                    onClick={onCreateNewChat}
                    variant="outline"
                    className="w-full justify-start gap-2 h-10 bg-white border-slate-200 shadow-sm"
                >
                    <Plus size={16} /> New Chat
                </Button>
            </div>

            {/* Search */}
            <div className="px-4 py-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search Chats..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 bg-white border-slate-200"
                    />
                </div>
            </div>

            {/* Nav */}
            <nav
                className="flex-1 overflow-y-auto p-2 space-y-0.5 no-scrollbar"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
            >

                {/* ── Projects collapsible section ── */}
                <div className="rounded-lg overflow-hidden">
                    {/* Section header */}
                    <button
                        onClick={() => setProjectsOpen((p) => !p)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/40 transition-all duration-150 group"
                    >
                        <div className="flex items-center gap-2">
                            <FolderOpen size={14} className="text-slate-400 group-hover:text-slate-500 transition-colors" />
                            <span>Projects</span>
                            {projects.length > 0 && (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold tabular-nums">
                                    {projects.length}
                                </span>
                            )}
                        </div>
                        <ChevronDown
                            size={13}
                            className={`text-slate-400 transition-transform duration-200 ease-in-out ${projectsOpen ? "rotate-0" : "-rotate-90"}`}
                        />
                    </button>

                    {/* Collapsible body */}
                    <div
                        className="overflow-hidden transition-all duration-200 ease-in-out"
                        style={{ maxHeight: projectsOpen ? "500px" : "0px", opacity: projectsOpen ? 1 : 0 }}
                    >
                        <div className="pl-1 pt-0.5 pb-1 space-y-0.5">
                            {/* New Project button */}
                            <button
                                onClick={onCreateProject}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-slate-400 border border-dashed border-slate-300 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-150"
                            >
                                <Plus size={13} className="shrink-0" />
                                <span className="font-medium">New Project</span>
                            </button>

                            {/* Empty state */}
                            {projects.length === 0 && (
                                <p className="px-3 py-2 text-xs text-slate-400 italic text-center">
                                    No projects yet
                                </p>
                            )}

                            {/* Project list */}
                            {projects.map((project) => {
                                const isActive = view === "project" && currentProjectId === project.id;
                                // Deterministic hue from first char for colourful avatars
                                const hue = (project.project_name.charCodeAt(0) * 47) % 360;
                                const avatarStyle = {
                                    backgroundColor: `hsl(${hue} 60% 88%)`,
                                    color: `hsl(${hue} 55% 35%)`,
                                };
                                return (
                                    <div
                                        key={project.id}
                                        className={`group flex items-center gap-2.5 px-2.5 py-1.5 text-sm rounded-md transition-all duration-150 cursor-pointer ${isActive
                                                ? "bg-slate-200/80 text-slate-900 font-medium shadow-sm ring-1 ring-slate-300/60"
                                                : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-800"
                                            }`}
                                        onClick={() => onSelectProject(project)}
                                    >
                                        {/* Coloured avatar */}
                                        <div
                                            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 select-none"
                                            style={avatarStyle}
                                        >
                                            {project.project_name.charAt(0).toUpperCase()}
                                        </div>

                                        <span className="truncate flex-1 text-left">{project.project_name}</span>

                                        {/* Delete button — revealed on hover */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteProject(project.id);
                                            }}
                                            title="Delete project"
                                            aria-label="Delete project"
                                            className={`shrink-0 h-5 w-5 rounded flex items-center justify-center transition-all duration-150 ${
                                                isActive
                                                    ? "opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                                    : "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                            }`}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Recent Chats ── */}
                <div className="pt-3 pb-1 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Recent Chats
                </div>

                {filteredHistory.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400 italic">
                        {search.trim() ? "No chats match your search" : "No chats yet"}
                    </p>
                )}

                {filteredHistory.map((chat) => {
                    const isActiveChat = currentConversationId === chat.id;
                    return (
                        <div
                            key={chat.id}
                            onClick={() => onSelectConversation(chat.id, chat.slug)}
                            className={`group relative flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer transition-all duration-150 ${isActiveChat
                                    ? "bg-slate-200/80 font-medium text-slate-900 shadow-sm ring-1 ring-slate-300/60"
                                    : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-800"
                                }`}
                        >
                            {/* Chat icon */}
                            <MessageSquare
                                size={15}
                                className={`shrink-0 transition-colors ${isActiveChat ? "text-slate-600" : "text-slate-400 group-hover:text-slate-500"
                                    }`}
                            />

                            {/* Title — shrinks to give room for the action button */}
                            <span className="truncate flex-1 min-w-0 pr-1">{chat.title}</span>

                            {/* Actions trigger — hidden until row is hovered */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const btn = e.currentTarget as HTMLElement;
                                    const rect = btn.getBoundingClientRect();
                                    const isOpen = menuOpenId === chat.id;
                                    setMenuOpenId(isOpen ? null : chat.id);
                                    setMenuPos(isOpen ? null : { top: rect.top, left: rect.left, height: rect.height });
                                }}
                                title="More actions"
                                aria-label="More actions"
                                className={`shrink-0 h-6 w-6 rounded-md flex items-center justify-center transition-all duration-150 ${menuOpenId === chat.id
                                        ? "opacity-100 bg-slate-300 text-slate-700"
                                        : "opacity-0 group-hover:opacity-100 text-slate-400 hover:bg-slate-300/60 hover:text-slate-700"
                                    }`}
                            >
                                <Ellipsis size={14} />
                            </button>

                            {/* Portal dropdown */}
                            {menuOpenId === chat.id && menuPos && createPortal(
                                <div
                                    ref={portalRef}
                                    style={{
                                        position: "fixed",
                                        top: menuPos.top + menuPos.height + 6,
                                        left: typeof window !== "undefined"
                                            ? Math.max(8, Math.min(menuPos.left - 140, window.innerWidth - 208))
                                            : menuPos.left,
                                    }}
                                    className="z-50 animate-in fade-in zoom-in-95 duration-100"
                                >
                                    <div className="w-52 rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-xl shadow-slate-900/10 py-1 overflow-hidden">
                                        {/* Move to project */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (moveOpenId === chat.id) {
                                                    setMoveOpenId(null);
                                                    setMoveMenuPos(null);
                                                } else {
                                                    const btn = e.currentTarget as HTMLElement;
                                                    const rect = btn.getBoundingClientRect();
                                                    setMoveOpenId(chat.id);
                                                    setMoveMenuPos({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
                                                }
                                            }}
                                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors rounded-t-lg ${moveOpenId === chat.id
                                                    ? "bg-slate-100 text-slate-900"
                                                    : "text-slate-700 hover:bg-slate-50"
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <FolderOpen size={14} className="text-slate-400" />
                                                Move to project
                                            </span>
                                            <ChevronDown size={13} className="text-slate-300 -rotate-90" />
                                        </button>

                                        {/* Sub-menu portal — rendered at fixed coords to bypass overflow-hidden */}
                                        {moveOpenId === chat.id && moveMenuPos && createPortal(
                                            <div
                                                ref={movePortalRef}
                                                style={(() => {
                                                    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
                                                    if (isMobile) {
                                                        // Below the button, left-aligned to keep within viewport
                                                        return {
                                                            position: "fixed" as const,
                                                            top: moveMenuPos.bottom + 6,
                                                            left: Math.max(8, Math.min(moveMenuPos.left, window.innerWidth - 216)),
                                                        };
                                                    }
                                                    // Desktop: fly out to the right
                                                    return {
                                                        position: "fixed" as const,
                                                        top: moveMenuPos.top,
                                                        left: Math.min(moveMenuPos.right + 6, window.innerWidth - 216),
                                                    };
                                                })()}
                                                className="z-[60] animate-in fade-in zoom-in-95 duration-100"
                                            >
                                                <div className="w-52 rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-xl shadow-slate-900/10 py-1 overflow-hidden">
                                                    {projects.length === 0 ? (
                                                        <div className="px-3 py-2.5 text-xs text-slate-400 italic text-center">
                                                            No projects yet
                                                        </div>
                                                    ) : (
                                                        projects.map((p) => {
                                                            const hue = (p.project_name.charCodeAt(0) * 47) % 360;
                                                            return (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={(e) => {
                                                                        handleMoveConversation(e, chat.id, p.id);
                                                                        setMoveMenuPos(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                                >
                                                                    <div
                                                                        className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold select-none"
                                                                        style={{
                                                                            backgroundColor: `hsl(${hue} 60% 88%)`,
                                                                            color: `hsl(${hue} 55% 35%)`,
                                                                        }}
                                                                    >
                                                                        {p.project_name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span className="truncate">{p.project_name}</span>
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>,
                                            document.body
                                        )}

                                        {/* Divider */}
                                        <div className="my-1 h-px bg-slate-100 mx-2" />

                                        {/* Delete */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteConversation(e, chat.id);
                                                setMenuOpenId(null);
                                                setMenuPos(null);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-b-lg transition-colors"
                                        >
                                            <Trash2 size={14} className="shrink-0" />
                                            <span>Delete conversation</span>
                                        </button>
                                    </div>
                                </div>,
                                document.body
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* User footer */}
            <div className="px-3 py-3 border-t border-slate-200/80 mt-auto">
                {user ? (
                    <div className="flex items-center gap-2.5 w-full group/footer">
                        {/* Avatar */}
                        <div className="shrink-0 w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-semibold select-none">
                            {user.email?.charAt(0).toUpperCase() ?? "?"}
                        </div>

                        {/* Email */}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{user.email}</p>
                            <p className="text-[10px] text-slate-400">Signed in</p>
                        </div>

                        {/* Logout */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onLogout}
                            title="Sign out"
                            className="shrink-0 h-7 w-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
                        >
                            <LogOut size={14} />
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="default"
                        className="w-full h-9 text-sm font-medium"
                        onClick={onSignIn}
                    >
                        Sign In
                    </Button>
                )}
            </div>
        </aside>
    );
}
