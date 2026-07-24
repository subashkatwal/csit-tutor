import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { store, SEMESTERS } from "@/lib/store";
import { BookOpen, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Choose your semester- CSIT AI Tutor" },
      { name: "description", content: "Pick your TU BSc CSIT semester so the AI focuses on the right subjects." },
      { property: "og:title", content: "Choose your semester- CSIT AI Tutor" },
      { property: "og:description", content: "Scope the AI to your current TU BSc CSIT semester." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    setSelected(store.getSemester());
  }, []);

  const confirm = () => {
    if (!selected) return;
    store.setSemester(selected);
    toast.success(`Semester ${selected} selected`);
    navigate({ to: "/chat" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign out</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Choose your semester</h1>
          <p className="mt-3 text-muted-foreground">
            Selecting your semester allows the AI to search only relevant subjects, making answers faster and more accurate.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {SEMESTERS.map(({ n, subjects }) => {
            const active = selected === n;
            return (
              <button
                key={n}
                onClick={() => setSelected(n)}
                className={cn(
                  "group relative flex flex-col items-start rounded-2xl border bg-card p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lift",
                  active
                    ? "border-primary ring-2 ring-primary/25 shadow-lift"
                    : "border-border/70",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div className={cn(
                    "grid h-10 w-10 place-items-center rounded-xl transition-colors",
                    active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                  )}>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  {active && (
                    <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div className="mt-5 text-xs font-medium uppercase tracking-widest text-muted-foreground">Semester</div>
                <div className="text-3xl font-bold tracking-tight">{n}</div>
                <div className="mt-1 text-xs text-muted-foreground">{subjects} subjects</div>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Button size="lg" disabled={!selected} onClick={confirm} className="rounded-full px-8">
            Continue <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          You can change your semester later from Settings.
        </p>
      </div>
    </div>
  );
}
