import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { store, applyTheme } from "@/lib/store";
import { listSemesters, selectSemester, type Semester } from "@/api/semesters";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings- CSIT AI Tutor" },
      { name: "description", content: "Manage your profile, semester, and preferences." },
      { property: "og:title", content: "Settings- CSIT AI Tutor" },
      { property: "og:description", content: "CSIT AI Tutor account settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [semesterId, setSemesterId] = useState<string>("");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = store.getUser();
    if (!u) { navigate({ to: "/login" }); return; }
    setName(u.name); setEmail(u.email);
    setSemesterId(store.getSemesterId() ?? "");
    setTheme(store.getTheme());

    listSemesters()
      .then(setSemesters)
      .catch(() => toast.error("Couldn't load semesters"));
  }, [navigate]);

  const save = async () => {
    try {
      setSaving(true);
      store.setUser({ name, email });

      const previousSemesterId = store.getSemesterId();
      if (semesterId && semesterId !== previousSemesterId) {
        const semester = semesters.find((s) => s.id === semesterId);
        if (semester) {
          await selectSemester(semester.id);
          store.setSemester(semester.number);
          store.setSemesterId(semester.id);
        }
      }

      store.setTheme(theme);
      applyTheme(theme);

      if (previousSemesterId && previousSemesterId !== semesterId) {
        toast.success("Saved. Semester changed- a fresh chat will start.");
      } else {
        toast.success("Settings saved");
      }
    } catch {
      toast.error("Couldn't save your changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon"><Link to="/chat"><ChevronLeft className="h-4 w-4" /></Link></Button>
            <Logo />
          </div>
          <Link to="/chat" className="text-sm text-muted-foreground hover:text-foreground">Back to chat</Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile and preferences.</p>

        <div className="mt-8 space-y-6">
          <Section title="Profile" description="Your account information.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled />
              </div>
            </div>
          </Section>

          <Section title="Semester" description="Changing semester loads a different knowledge base and starts a fresh chat.">
            <div className="max-w-xs">
              <Select value={semesterId} onValueChange={setSemesterId}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id}>Semester {s.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>

          <Section title="Appearance" description="Choose your preferred theme.">
            <div className="flex gap-2">
              {(["light", "dark", "system"] as const).map(t => (
                <button key={t} onClick={() => setTheme(t)}
                  className={`rounded-xl border px-4 py-2 text-sm capitalize transition-colors ${theme === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent"}`}>
                  {t}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Notifications" description="Get updates about new features and study reminders.">
            <div className="flex items-center justify-between">
              <Label htmlFor="notif">Enable notifications</Label>
              <Switch id="notif" checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </Section>

          <Section title="Language" description="Nepali coming soon.">
            <div className="max-w-xs">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ne" disabled>Nepali (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Section>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="rounded-2xl px-6">
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-border/70 p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </Card>
  );
}