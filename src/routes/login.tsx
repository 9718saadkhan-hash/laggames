import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { GlassIcon } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LogIn } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — LAG LIVE AS GAMERS" },
      { name: "description", content: "Sign in to your LAG account to manage orders, wishlist and reviews." },
      { property: "og:title", content: "Login — LAG LIVE AS GAMERS" },
      { property: "og:description", content: "Sign in to your LAG account to manage orders, wishlist and reviews." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

function safeRedirect(raw: unknown): string {
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/account";
}

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "email") fieldErrors.email = issue.message;
        if (issue.path[0] === "password") fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Login successful.");
    void navigate({ to: safeRedirect(search?.redirect) });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <div className="glass rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <GlassIcon icon={LogIn} tone="red" size="lg" />
          <h1 className="mt-5 font-display text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue live as gamers.</p>
        </div>
        <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-xs font-medium text-lag-red">
                {errors.email}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs font-semibold text-lag-blue hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            {errors.password && (
              <p id="password-error" className="text-xs font-medium text-lag-red">
                {errors.password}
              </p>
            )}
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to LAG?{" "}
          <Link to="/register" className="font-semibold text-lag-blue hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
