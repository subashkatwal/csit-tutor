import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { Markdown } from "@/components/chat/Markdown";
import {
  Plus, Search, Settings, LogOut, ChevronLeft, ChevronRight,
  Menu, Paperclip, Mic, Send, Copy, ThumbsUp, ThumbsDown,
  RotateCcw, Share2, FileText, ChevronDown, Sparkles, Bot,
  Layers, BookOpen, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { store, uid, SEMESTERS, type Chat, type ChatMessage } from "@/lib/store";
import { mockAiAnswer } from "@/lib/mock-ai";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat- CSIT AI Tutor" },
      { name: "description", content: "Ask your semester-specific CSIT AI Tutor anything about your syllabus." },
      { property: "og:title", content: "Chat- CSIT AI Tutor" },
      { property: "og:description", content: "AI study chat scoped to your TU BSc CSIT semester." },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = [
  { title: "Explain Deadlock", subject: "Operating Systems" },
  { title: "DBMS Normalization", subject: "Database Management" },
  { title: "What is TCP?", subject: "Computer Networks" },
  { title: "OS Scheduling", subject: "Operating Systems" },
  { title: "AI Alpha-Beta Pruning", subject: "Artificial Intelligence" },
  { title: "Theory of Computation DFA", subject: "TOC" },
];

function groupChats(chats: Chat[]) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const groups: Record<string, Chat[]> = { Today: [], Yesterday: [], "Previous 7 Days": [], Older: [] };
  for (const c of chats) {
    const diff = now - c.updatedAt;
    if (diff < day) groups.Today.push(c);
    else if (diff < 2 * day) groups.Yesterday.push(c);
    else if (diff < 7 * day) groups["Previous 7 Days"].push(c);
    else groups.Older.push(c);
  }
  return groups;
}

function ChatPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(store.getUser());
  const [semester, setSemesterState] = useState<number | null>(store.getSemester());
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [semModalOpen, setSemModalOpen] = useState(false);
  const [pendingSem, setPendingSem] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (!semester) { navigate({ to: "/onboarding" }); return; }
    setChats(store.getChats());
  }, [user, semester, navigate]);

  const active = chats.find(c => c.id === activeId) ?? null;

  const filtered = useMemo(() => {
    if (!search.trim()) return chats;
    const q = search.toLowerCase();
    return chats.filter(c => c.title.toLowerCase().includes(q) || c.messages.some(m => m.content.toLowerCase().includes(q)));
  }, [chats, search]);

  const groups = useMemo(() => groupChats(filtered), [filtered]);

  const persist = (next: Chat[]) => { setChats(next); store.setChats(next); };

  const newChat = () => { setActiveId(null); };

  const sendMessage = (text: string) => {
    if (!text.trim() || !semester) return;
    let current = active;
    let list = chats;
    if (!current) {
      current = {
        id: uid(),
        title: text.slice(0, 48),
        semester,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      list = [current, ...chats];
    }
    const userMsg: ChatMessage = { id: uid(), role: "user", content: text, createdAt: Date.now() };
    const thinking: ChatMessage = { id: uid(), role: "assistant", content: "__thinking__", createdAt: Date.now() };
    current = { ...current, messages: [...current.messages, userMsg, thinking], updatedAt: Date.now() };
    list = list.map(c => c.id === current!.id ? current! : c);
    persist(list);
    setActiveId(current.id);

    setTimeout(() => {
      const res = mockAiAnswer(text, semester);
      const answer: ChatMessage = {
        id: thinking.id,
        role: "assistant",
        content: JSON.stringify({ md: res.answer, sources: res.sources, past: res.pastQuestion }),
        createdAt: Date.now(),
      };
      const updated = list.map(c => c.id === current!.id
        ? { ...c, messages: c.messages.map(m => m.id === thinking.id ? answer : m), updatedAt: Date.now() }
        : c
      );
      persist(updated);
    }, 1400);
  };

  const deleteChat = (id: string) => {
    persist(chats.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const openSemesterModal = () => { setPendingSem(semester); setSemModalOpen(true); };
  const confirmSemester = () => {
    if (!pendingSem) return;
    store.setSemester(pendingSem);
    setSemesterState(pendingSem);
    setActiveId(null);
    setSemModalOpen(false);
    toast.success(`Switched to Semester ${pendingSem}`);
  };

  const logout = () => {
    store.clearUser();
    navigate({ to: "/" });
  };

  const sidebar = (
    <SidebarContent
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      search={search}
      setSearch={setSearch}
      groups={groups}
      activeId={activeId}
      setActiveId={setActiveId}
      newChat={newChat}
      semester={semester ?? 1}
      openSemester={openSemesterModal}
      deleteChat={deleteChat}
      logout={logout}
    />
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden shrink-0 border-r border-border/70 bg-sidebar transition-all duration-300 md:flex md:flex-col",
        collapsed ? "w-[68px]" : "w-[280px]"
      )}>{sidebar}</aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Navbar */}
        <header className="flex h-14 items-center justify-between border-b border-border/70 bg-card/60 px-3 backdrop-blur sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {/* Mobile drawer */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetHeader className="sr-only"><SheetTitle>Menu</SheetTitle></SheetHeader>
                <div className="flex h-full flex-col bg-sidebar">{sidebar}</div>
              </SheetContent>
            </Sheet>
            <Badge variant="secondary" className="rounded-full border border-border/70 bg-card font-medium">
              <Layers className="mr-1 h-3 w-3" /> Semester {semester}
            </Badge>
            <span className="hidden truncate text-sm text-muted-foreground sm:inline">
              {active?.title ?? "New chat"}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border/70 bg-card p-1 pr-3 transition-colors hover:bg-accent hover:text-accent-foreground">
                <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{(user?.name ?? "U").slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                <span className="hidden text-sm sm:inline">{user?.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/settings">Profile</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Chat area */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[850px] px-4 py-6 sm:px-6">
            {!active || active.messages.length === 0 ? (
              <Welcome onPick={sendMessage} />
            ) : (
              <ConversationView chat={active} onCopy={(t) => { navigator.clipboard.writeText(t); toast.success("Copied"); }} onRegenerate={() => {
                const last = [...active.messages].reverse().find(m => m.role === "user");
                if (last) sendMessage(last.content);
              }} />
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border/70 bg-background/95 px-3 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto w-full max-w-[850px]">
            <Composer onSend={sendMessage} />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              CSIT AI Tutor answers only TU BSc CSIT queries from verified materials.
            </p>
          </div>
        </div>
      </main>

      {/* Semester modal */}
      <Dialog open={semModalOpen} onOpenChange={setSemModalOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose Semester</DialogTitle>
            <DialogDescription>
              Changing semester starts a new chat because the AI loads a different knowledge base.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 py-2">
            {SEMESTERS.map(({ n }) => (
              <button
                key={n}
                onClick={() => setPendingSem(n)}
                className={cn(
                  "rounded-xl border p-3 text-sm font-medium transition-colors",
                  pendingSem === n ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent hover:text-accent-foreground"
                )}
              >{n}</button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSemModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmSemester} disabled={!pendingSem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidebarContent(props: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  search: string; setSearch: (v: string) => void;
  groups: Record<string, Chat[]>;
  activeId: string | null; setActiveId: (id: string | null) => void;
  newChat: () => void;
  semester: number;
  openSemester: () => void;
  deleteChat: (id: string) => void;
  logout: () => void;
}) {
  const { collapsed, setCollapsed, search, setSearch, groups, activeId, setActiveId, newChat, semester, openSemester, deleteChat, logout } = props;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-3">
        {!collapsed ? <Logo /> : <Logo showText={false} />}
        <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <div className="px-3">
        <Button className="w-full justify-start rounded-2xl" onClick={newChat}>
          <Plus className="h-4 w-4" /> {!collapsed && "New chat"}
        </Button>
      </div>
      {!collapsed && (
        <div className="mt-3 px-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats" className="h-9 rounded-xl pl-8 text-sm" />
          </div>
        </div>
      )}
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2">
        {!collapsed && Object.entries(groups).map(([label, list]) => list.length > 0 && (
          <div key={label} className="mb-3">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="space-y-0.5">
              {list.map(c => (
                <div key={c.id} className={cn(
                  "group flex items-center gap-1 rounded-xl px-2 transition-colors",
                  activeId === c.id ? "bg-accent" : "hover:bg-accent/60"
                )}>
                  <button onClick={() => setActiveId(c.id)} className="flex-1 truncate py-2 text-left text-sm">
                    {c.title}
                  </button>
                  <button onClick={() => deleteChat(c.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border/70 p-3">
        {!collapsed ? (
          <>
            <div className="mb-2 rounded-2xl border border-border/70 bg-card p-3">
              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Current Semester</div>
              <div className="mt-1 flex items-center justify-between">
                <div className="text-sm font-semibold">Semester {semester}</div>
                <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs" onClick={openSemester}>Change</Button>
              </div>
            </div>
            <div className="flex gap-1">
              <Button asChild variant="ghost" size="sm" className="flex-1 justify-start rounded-xl">
                <Link to="/settings"><Settings className="h-4 w-4" /> Settings</Link>
              </Button>
              <Button variant="ghost" size="sm" className="rounded-xl" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Button variant="ghost" size="icon" onClick={openSemester}><BookOpen className="h-4 w-4" /></Button>
            <Button asChild variant="ghost" size="icon"><Link to="/settings"><Settings className="h-4 w-4" /></Link></Button>
            <Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Welcome({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="mb-4"><Logo size="lg" showText={false} /></div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">How can I help you today?</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ask about your semester's syllabus, concepts, or past questions.</p>
      <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SUGGESTIONS.map(s => (
          <button key={s.title} onClick={() => onPick(s.title)} className="group rounded-2xl border border-border/70 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft">
            <div className="text-sm font-medium">{s.title}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.subject}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConversationView({ chat, onCopy, onRegenerate }: { chat: Chat; onCopy: (t: string) => void; onRegenerate: () => void; }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.messages.length, chat.messages[chat.messages.length - 1]?.content]);

  return (
    <div className="space-y-6">
      {chat.messages.map(m => m.role === "user" ? (
        <div key={m.id} className="flex justify-end animate-fade-in">
          <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-soft">
            {m.content}
          </div>
        </div>
      ) : (
        <AssistantMessage key={m.id} message={m} onCopy={onCopy} onRegenerate={onRegenerate} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function AssistantMessage({ message, onCopy, onRegenerate }: { message: ChatMessage; onCopy: (t: string) => void; onRegenerate: () => void; }) {
  const isThinking = message.content === "__thinking__";
  let payload: { md: string; sources: { file: string; page: number; confidence: number }[]; past: null | { year: string; qNo: string; weight: string } } | null = null;
  if (!isThinking) {
    try { payload = JSON.parse(message.content); } catch { payload = { md: message.content, sources: [], past: null }; }
  }

  return (
    <Card className="rounded-2xl border-border/70 p-4 shadow-soft animate-fade-in sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-3.5 w-3.5" />
        </div>
        <div className="text-sm font-semibold">CSIT AI Tutor</div>
        <div className="text-xs text-muted-foreground">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {isThinking ? <TypingIndicator /> : (
        <>
          <Markdown>{payload!.md}</Markdown>

          {payload!.past && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <Sparkles className="h-3 w-3" />
              Appeared in TU Exam {payload!.past.year} · {payload!.past.qNo} · {payload!.past.weight}
            </div>
          )}

          {payload!.sources.length > 0 && (
            <Collapsible className="mt-4">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs font-medium hover:bg-muted/60">
                <span>Sources Used ({payload!.sources.length})</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1.5">
                {payload!.sources.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="flex-1 font-medium">{s.file}</span>
                    <span className="text-muted-foreground">p. {s.page}</span>
                    <Badge variant="secondary" className="rounded-full text-[10px]">{Math.round(s.confidence * 100)}% match</Badge>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          <PracticeQuestions />

          <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border/70 pt-3">
            <IconAction icon={Copy} label="Copy" onClick={() => onCopy(payload!.md)} />
            <IconAction icon={ThumbsUp} label="Like" />
            <IconAction icon={ThumbsDown} label="Dislike" />
            <IconAction icon={RotateCcw} label="Regenerate" onClick={onRegenerate} />
            <IconAction icon={Share2} label="Share" />
          </div>
        </>
      )}
    </Card>
  );
}

function IconAction({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function PracticeQuestions() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border/70 p-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm font-medium">
        <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Generate Practice Questions</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-sm animate-fade-in">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">MCQs</div>
            <ol className="mt-1 ml-5 list-decimal space-y-1">
              <li>Which normal form removes transitive dependency? <span className="text-muted-foreground">(3NF)</span></li>
              <li>Which condition is NOT a Coffman condition? <span className="text-muted-foreground">(Round robin)</span></li>
            </ol>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Subjective</div>
            <ul className="mt-1 ml-5 list-disc space-y-1">
              <li>Explain the differences between 3NF and BCNF with an example.</li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Long Question</div>
            <ul className="mt-1 ml-5 list-disc space-y-1">
              <li>Discuss deadlock detection and recovery techniques in modern OS. (10 marks)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  const labels = ["Searching Notes...", "Reading PDFs...", "Finding Best Answer...", "Generating Response..."];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % labels.length), 700);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex gap-1">
        <span className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: "0s" }} />
        <span className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: "0.15s" }} />
        <span className="typing-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: "0.3s" }} />
      </div>
      <span className="text-sm text-muted-foreground">{labels[i]}</span>
    </div>
  );
}

function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [value, setValue] = useState("");
  const submit = () => { if (!value.trim()) return; onSend(value.trim()); setValue(""); };
  return (
    <div className="relative rounded-3xl border border-border/70 bg-card p-2 shadow-soft focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
      <Textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
        }}
        placeholder="Ask anything about your CSIT course..."
        className="min-h-[52px] resize-none border-0 bg-transparent px-3 py-2 text-[15px] shadow-none focus-visible:ring-0"
        rows={2}
      />
      <div className="flex items-center justify-between px-2 pb-1">
        <div className="flex gap-1">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => toast.info("PDF upload coming soon")}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => toast.info("Voice input coming soon")}>
            <Mic className="h-4 w-4" />
          </Button>
        </div>
        <Button type="button" size="icon" className="h-9 w-9 rounded-full" onClick={submit} disabled={!value.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
