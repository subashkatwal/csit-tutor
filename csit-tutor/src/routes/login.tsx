import { login } from "@/api/auth";
import { AuthShell } from "@/components/AuthShell";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/Logo";
import { store } from "@/lib/store";
import { toast } from "sonner";
import { GoogleIcon } from "@/components/GoogleIcon";
export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in- CSIT AI Tutor" },
      { name: "description", content: "Sign in to your CSIT AI Tutor account." },
      { property: "og:title", content: "Sign in- CSIT AI Tutor" },
      { property: "og:description", content: "Sign in to your CSIT AI Tutor account." },
    ],
  }),
  component: LoginPage,
});
function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Enter your email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await login({
        email,
        password,
      });

      // Save logged-in user
      store.setUser({
        name: response.user?.name ?? email.split("@")[0],
        email: response.user?.email ?? email,
      });

      toast.success("Welcome back");

      const semester = store.getSemester();

      navigate({
        to: semester ? "/chat" : "/onboarding",
      });

    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <div className="mb-4 inline-flex">
          <Logo size="lg" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to continue studying.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>

          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>

          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>


        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <Checkbox id="remember" />
            <span>Remember me</span>
          </label>

          <a
            href="#"
            className="font-medium text-primary hover:underline"
          >
            Forgot password?
          </a>
        </div>


        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>

      </form>


      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />

        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          OR
        </span>

        <div className="h-px flex-1 bg-border" />
      </div>


      <Button
        variant="outline"
        className="w-full rounded-2xl"
        onClick={() => toast.info("Google sign-in coming soon")}
      >
        <GoogleIcon />
        Continue with Google
      </Button>


      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>

    </AuthShell>
  );
}