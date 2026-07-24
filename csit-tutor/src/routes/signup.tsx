import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { AuthShell } from "@/components/AuthShell";
import { GoogleIcon } from "@/components/GoogleIcon";
import { signup } from "@/api/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account- CSIT AI Tutor" },
      { name: "description", content: "Create a free CSIT AI Tutor account and start studying smarter." },
      { property: "og:title", content: "Create your account- CSIT AI Tutor" },
      { property: "og:description", content: "Sign up for CSIT AI Tutor." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [roll, setRoll] = useState("");
  const [loading, setLoading] = useState(false);

  // Live mismatch check — only show once they've actually typed something in confirm
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error("Fill in all required fields");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await signup({
        full_name: name,
        email,
        password,
        roll_no: roll || undefined,
      });
      toast.success("Account created — please sign in");
      navigate({ to: "/login" });
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <div className="mb-4 inline-flex"><Logo size="lg" /></div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start learning with an AI trained on your syllabus.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ram Sharma" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={passwordsMismatch ? "border-destructive focus-visible:ring-destructive" : ""}
              aria-invalid={passwordsMismatch}
            />
            {passwordsMismatch && (
              <p className="text-xs text-destructive">Passwords don't match</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="roll">University roll number <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Input id="roll" value={roll} onChange={e => setRoll(e.target.value)} placeholder="e.g. 25100/078" />
        </div>
        <Button type="submit" disabled={loading || passwordsMismatch} className="w-full rounded-2xl">
          {loading ? "Creating account..." : "Sign up"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="w-full rounded-2xl" onClick={() => toast.info("Google sign-up coming soon")}>
        <GoogleIcon /> Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}