import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import {
  ShieldCheck,
  BookOpen,
  History,
  Sparkles,
  Lightbulb,
  Zap,
  ArrowRight,
  FileText,
  CheckCircle2,
  Bot,
  User as UserIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CSIT AI Tutor- AI Study Assistant for TU BSc CSIT" },
      {
        name: "description",
        content:
          "Learn smarter with AI built for TU BSc CSIT students. Verified answers from notes, PDFs, lecture slides, and past questions using RAG.",
      },
      { property: "og:title", content: "CSIT AI Tutor" },
      {
        property: "og:description",
        content:
          "Semester-specific AI tutor trained on verified TU BSc CSIT materials.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ShieldCheck,
    title: "Verified Answers",
    desc: "Answers come only from trusted study materials curated for TU CSIT.",
  },
  {
    icon: BookOpen,
    title: "Semester Specific",
    desc: "AI searches only your selected semester's subjects- nothing else.",
  },
  {
    icon: History,
    title: "Past Question Analysis",
    desc: "Know whether a question appeared in previous TU exams.",
  },
  {
    icon: Sparkles,
    title: "Practice Questions",
    desc: "Generate exam-oriented MCQs, subjective, and long questions.",
  },
  {
    icon: Lightbulb,
    title: "Explain Concepts",
    desc: "Simple, exam-focused explanations without the fluff.",
  },
  {
    icon: Zap,
    title: "Fast Retrieval",
    desc: "Instant, grounded answers pulled from notes and PDFs.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 glass">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#how"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              How it works
            </a>
            <a
              href="#faq"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link to="/signup">
                Get started
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="animate-fade-in">
            <Badge
              variant="secondary"
              className="mb-5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium"
            >
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-success" />
              Built for Tribhuvan University BSc CSIT
            </Badge>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
              Learn Smarter with{" "}
              <span className="text-primary">AI Built for TU CSIT</span>{" "}
              Students
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Get accurate, semester-specific answers powered by verified notes,
              PDFs, lecture slides, and past questions using
              Retrieval-Augmented Generation (RAG).
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link to="/signup">
                  Start Learning
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-6"
              >
                <a href="#features">Learn More</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> All 8
                semesters
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Past
                paper aware
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Source-cited
              </span>
            </div>
          </div>

          {/* Illustration: mock chat */}
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary/5 blur-2xl" />
            <Card className="overflow-hidden rounded-3xl border-border/70 p-0 shadow-lift">
              <div className="flex items-center gap-2 border-b border-border/70 bg-card px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                </div>
                <span className="ml-2 text-xs text-muted-foreground">
                  CSIT AI Tutor · Semester 5
                </span>
              </div>
              <div className="space-y-4 bg-card p-5">
                {/* User */}
                <div className="flex justify-end gap-2">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    What is normalization in DBMS?
                  </div>
                  <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                </div>
                {/* Assistant */}
                <div className="flex gap-2">
                  <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="max-w-[85%] space-y-2 rounded-2xl rounded-tl-md border border-border/70 bg-background px-4 py-3 text-sm">
                    <p className="font-medium">
                      Normalization organizes tables to reduce redundancy and
                      improve integrity.
                    </p>
                    <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
                      <li>1NF- atomic values</li>
                      <li>2NF- remove partial dependency</li>
                      <li>3NF- remove transitive dependency</li>
                      <li>BCNF- stronger 3NF</li>
                    </ul>
                    <div className="!mt-3 flex flex-wrap gap-1.5 pt-1">
                      <Badge
                        variant="secondary"
                        className="rounded-full text-[10px] font-medium"
                      >
                        <FileText className="mr-1 h-3 w-3" />
                        DBMS_Unit3.pdf · p.12
                      </Badge>
                      <Badge className="rounded-full bg-success/15 text-[10px] font-medium text-success hover:bg-success/20">
                        Appeared in TU 2079 · Q4
                      </Badge>
                    </div>
                  </div>
                </div>
                {/* Suggestion */}
                <div className="flex gap-2 pl-9">
                  <button className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                    Generate practice questions
                  </button>
                  <button className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                    Explain simpler
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to study effectively
            </h2>
            <p className="mt-3 text-muted-foreground">
              Ground-truth answers from your syllabus- nothing invented,
              nothing off-topic.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card
                key={f.title}
                className="group relative rounded-2xl border-border/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-t border-border/60 bg-card/50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Pick your semester",
                d: "Choose one of the 8 TU BSc CSIT semesters to scope the knowledge base.",
              },
              {
                n: "02",
                t: "Ask anything",
                d: "Concepts, definitions, past questions- the tutor stays on syllabus.",
              },
              {
                n: "03",
                t: "Study with sources",
                d: "Every answer cites the exact PDF, slide, or note it came from.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-border/70 bg-card p-6"
              >
                <div className="text-xs font-medium tracking-widest text-primary">
                  {s.n}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to ace this semester?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Join CSIT students studying with a tutor that actually knows your
            syllabus.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-full px-6">
            <Link to="/signup">
              Create your free account
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CSIT AI Tutor. Not affiliated with
            Tribhuvan University.
          </p>
        </div>
      </footer>
    </div>
  );
}
