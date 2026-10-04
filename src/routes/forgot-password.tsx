import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { GlassIcon } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, MailCheck } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — LAG LIVE AS GAMERS" },
      { name: "description", content: "Reset your LAG account password." },
      { property: "og:title", content: "Forgot Password — LAG LIVE AS GAMERS" },
      { property: "og:description", content: "Reset your LAG account password." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().trim().email("Enter a valid email address.") });

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) {
      toast.error(err.message);
      return;
    }
    setSent(true);
    toast.success("Reset link sent.");
  }

  if (sent) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
        <div className="glass flex flex-col items-center rounded-3xl p-8 text-center">
          <GlassIcon icon={MailCheck} tone="blue" size="lg" />
          <h1 className="mt-5 font-display text-2xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            If an account exists for <span className="text-foreground">{email}</span>, a reset link has been sent.
          </p>
          <Button asChild variant="glass" size="lg" className="mt-6">
            <Link to="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <div className="glass rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <GlassIcon icon={KeyRound} tone="red" size="lg" />
          <h1 className="mt-5 font-display text-2xl font-bold">Forgot password?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>
        </div>
        <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(error)} />
            {error && <p className="text-xs font-medium text-lag-red">{error}</p>}
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-lag-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
