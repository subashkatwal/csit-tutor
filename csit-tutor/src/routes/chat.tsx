import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
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
import { store, uid } from "@/lib/store";
import {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  sendMessageStream,
  type ConversationOut,
  type Detection,
  type ExamPattern,
  type PracticeProblems,
} from "@/api/conversations";
import { listSemesters, selectSemester, type Semester } from "@/api/semesters";
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

// --- local UI message model (independent of persisted MessageOut, so we can show a live "thinking" bubble) ---
type UIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  thinking?: boolean;
  detection?: Detection;
  exam?: ExamPattern;
  practice?: PracticeProblems;
};

function parseMeta(meta: MessageMetaRaw): { detection?: Detection; exam?: ExamPattern; practice?: PracticeProblems } {
  if (!meta) return {};
  if (typeof meta === "string") {
    try { return JSON.parse(meta); } catch { return {}; }
  }
  return meta;
}
type MessageMetaRaw = string | { detection?: Detection; exam?: ExamPattern; practice?: PracticeProblems } | null | undefined;

function groupConversations(list: ConversationOut[]) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const groups: Record<string, ConversationOut[]> = { Today: [], Yesterday: [], "Previous 7 Days": [], Older: [] };
  for (const c of list) {
    const diff = now - new Date(c.updated_at).getTime();
    if (diff < day) groups.Today.push(c);
    else if (diff < 2 * day) groups.Yesterday.push(c);
    else if (diff < 7 * day) groups["Previous 7 Days"].push(c);
    else groups.Older.push(c);
  }
  return groups;
}

function ChatPage() {
  const navigate = useNavigate();
  const [user] = useState(store.getUser());
  const [semesterId, setSemesterId] = useState<string | null>(store.getSemesterId());
  const [semesterNumber, setSemesterNumber] = useState<number | null>(store.getSemester());
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const [conversations, setConversations] = useState<ConversationOut[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [loadingActive, setLoadingActive] = useState(false);

  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [semModalOpen, setSemModalOpen] = useState(false);
  const [pendingSemId, setPendingSemId] = useState<string | null>(null);

  // --- guards + initial load ---
  useEffect(() => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (!semesterId) { navigate({ to: "/onboarding" }); return; }
    refreshConversations();
    listSemesters().then(setSemesters).catch(() => {});
  }, [user, semesterId, navigate]);

  const refreshConversations = () => {
    listConversations()
      .then((list) => setConversations(list.filter((c) => c.semester_id === semesterId)))
      .catch(() => toast.error("Couldn't load your chats"));
  };

  // --- load full message history when switching conversations ---
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    setLoadingActive(true);
    getConversation(activeId)
      .then((detail) => {
        setMessages(
          detail.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.created_at,
            ...parseMeta(m.meta),
          })),
        );
      })
      .catch(() => toast.error("Couldn't load that conversation"))
      .finally(() => setLoadingActive(false));
  }, [activeId]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, search]);

  const groups = useMemo(() => groupConversations(filtered), [filtered]);

  const newChat = () => { setActiveId(null); setMessages([]); };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !semesterId) return;

    let conversationId = activeId;

    // create the conversation on first message
    if (!conversationId) {
      try {
        const convo = await createConversation(semesterId, text.slice(0, 48));
        conversationId = convo.id;
        setConversations((prev) => [convo, ...prev]);
        setActiveId(convo.id);
      } catch {
        toast.error("Couldn't start a new chat");
        return;
      }
    }

    const userMsg: UIMessage = { id: uid(), role: "user", content: text, createdAt: new Date().toISOString() };
    const thinkingId = uid();
    const thinkingMsg: UIMessage = { id: thinkingId, role: "assistant", content: "", createdAt: new Date().toISOString(), thinking: true };
    setMessages((prev) => [...prev, userMsg, thinkingMsg]);

    let solutionText = "";
    let detection: Detection | undefined;
    let exam: ExamPattern | undefined;
    let practice: PracticeProblems | undefined;

    try {
      await sendMessageStream(conversationId, text, {
        onDetection: (d) => { detection = d; },
        onSolution: (content) => {
          solutionText = content;
          setMessages((prev) =>
            prev.map((m) => (m.id === thinkingId ? { ...m, content, thinking: true } : m)),
          );
        },
        onExam: (e) => { exam = e; },
        onPractice: (p) => { practice = p; },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === thinkingId ? { ...m, content: solutionText, thinking: false, detection, exam, practice } : m,
            ),
          );
          refreshConversations(); // picks up updated title/timestamp
        },
        onError: (msg) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === thinkingId ? { ...m, content: `Sorry, something went wrong: ${msg}`, thinking: false } : m)),
          );
        },
      });
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === thinkingId ? { ...m, content: "Sorry, something went wrong. Please try again.", thinking: false } : m)),
      );
    }
  };

  const deleteChat = async (id: string) => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) newChat();
    } catch {
      toast.error("Couldn't delete that chat");
    }
  };

  const openSemesterModal = () => { setPendingSemId(semesterId); setSemModalOpen(true); };
  const confirmSemester = async () => {
    if (!pendingSemId) return;
    const semester = semesters.find((s) => s.id === pendingSemId);
    if (!semester) return;
    try {
      await selectSemester(semester.id);
      store.setSemester(semester.number);
      store.setSemesterId(semester.id);
      setSemesterId(semester.id);
      setSemesterNumber(semester.number);
      newChat();
      setSemModalOpen(false);
      toast.success(`Switched to Semester ${semester.number}`);
    } catch {
      toast.error("Couldn't switch semester");
    }
  };

  const logout = () => {
    store.clearUser();
    store.clearSemester();
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
      semesterNumber={semesterNumber ?? 1}
      openSemester={openSemesterModal}
      deleteChat={deleteChat}
      logout={logout}
    />
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside className={cn(
        "hidden shrink-0 border-r border-border/70 bg-sidebar transition-all duration-300 md:flex md:flex-col",
        collapsed ? "w-[68px]" : "w-[280px]"
      )}>{sidebar}</aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border/70 bg-card/60 px-3 backdrop-blur sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
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
              <Layers className="mr-1 h-3 w-3" /> Semester {semesterNumber}
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[850px] px-4 py-6 sm:px-6">
            {loadingActive ? (
              <p className="py-20 text-center text-sm text-muted-foreground">Loading...</p>
            ) : !activeId || messages.length === 0 ? (
              <Welcome onPick={sendMessage} />
            ) : (
              <ConversationView
                messages={messages}
                onCopy={(t) => { navigator.clipboard.writeText(t); toast.success("Copied"); }}
                onRegenerate={() => {
                  const last = [...messages].reverse().find((m) => m.role === "user");
                  if (last) sendMessage(last.content);
                }}
              />
            )}
          </div>
        </div>

        <div className="border-t border-border/70 bg-background/95 px-3 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto w-full max-w-[850px]">
            <Composer onSend={sendMessage} />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              CSIT AI Tutor answers only TU BSc CSIT queries from verified materials.
            </p>
          </div>
        </div>
      </main>

      <Dialog open={semModalOpen} onOpenChange={setSemModalOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose Semester</DialogTitle>
            <DialogDescription>
              Changing semester starts a new chat because the AI loads a different knowledge base.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 py-2">
            {semesters.map((s) => (
              <button
                key={s.id}
                onClick={() => setPendingSemId(s.id)}
                className={cn(
                  "rounded-xl border p-3 text-sm font-medium transition-colors",
                  pendingSemId === s.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent hover:text-accent-foreground"
                )}
              >{s.number}</button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSemModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmSemester} disabled={!pendingSemId}>Save</Button>
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
  groups: Record<string, ConversationOut[]>;
  activeId: string | null; setActiveId: (id: string | null) => void;
  newChat: () => void;
  semesterNumber: number;
  openSemester: () => void;
  deleteChat: (id: string) => void;
  logout: () => void;
}) {
  const { collapsed, setCollapsed, search, setSearch, groups, activeId, setActiveId, newChat, semesterNumber, openSemester, deleteChat, logout } = props;

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
                <div className="text-sm font-semibold">Semester {semesterNumber}</div>
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

function ConversationView({ messages, onCopy, onRegenerate }: { messages: UIMessage[]; onCopy: (t: string) => void; onRegenerate: () => void; }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, messages[messages.length - 1]?.content]);

  return (
    <div className="space-y-6">
      {messages.map(m => m.role === "user" ? (
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

function AssistantMessage({ message, onCopy, onRegenerate }: { message: UIMessage; onCopy: (t: string) => void; onRegenerate: () => void; }) {
  const isThinking = message.thinking && !message.content;

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
          <Markdown>{message.content}</Markdown>

          {message.exam?.commonly_appears && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <Sparkles className="h-3 w-3" />
              Commonly appears · {message.exam.likely_years.join(", ")} · {message.exam.marks} marks
            </div>
          )}

          {message.exam?.exam_tip && (
            <Collapsible className="mt-4">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs font-medium hover:bg-muted/60">
                <span>Exam Tip</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{message.exam.exam_tip}</span>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {message.practice && <PracticeQuestions practice={message.practice} />}

          <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border/70 pt-3">
            <IconAction icon={Copy} label="Copy" onClick={() => onCopy(message.content)} />
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

function PracticeQuestions({ practice }: { practice: PracticeProblems }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border/70 p-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm font-medium">
        <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Practice Questions</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-3 space-y-4 text-sm animate-fade-in">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Question 1</div>
            <p className="mt-1">{practice.problem_one}</p>
            <p className="mt-1 text-muted-foreground"><span className="font-medium text-foreground">Answer:</span> {practice.answer_one}</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Question 2</div>
            <p className="mt-1">{practice.problem_two}</p>
            <p className="mt-1 text-muted-foreground"><span className="font-medium text-foreground">Answer:</span> {practice.answer_two}</p>
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
        onChange={(e: { target: { value: SetStateAction<string>; }; }) => setValue(e.target.value)}
        onKeyDown={(e: { key: string; shiftKey: any; preventDefault: () => void; }) => {
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