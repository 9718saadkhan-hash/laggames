import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { GlassIcon } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MailCheck, UserPlus } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — LAG LIVE AS GAMERS" },
      { name: "description", content: "Create your LAG account to order PlayStation games, PS Plus and OTT subscriptions." },
      { property: "og:title", content: "Create Account — LAG LIVE AS GAMERS" },
      { property: "og:description", content: "Create your LAG account to order PlayStation games, PS Plus and OTT subscriptions." },
    ],
  }),
  component: RegisterPage,
});

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name."),
    email: z.string().trim().email("Enter a valid email address."),
    phone: z.string().trim().min(8, "Enter a valid phone number.").optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type Errors = Partial<Record<"fullName" | "email" | "phone" | "password" | "confirmPassword", string>>;

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ fullName, email, phone, password, confirmPassword });
    if (!parsed.success) {
      const fieldErrors: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: parsed.data.fullName },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    if (data.user) {
      try {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: parsed.data.fullName,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
        });
      } catch {
        // ignore — no session yet, RLS may block; account page will retry.
      }
    }
    setLoading(false);
    if (data.session) {
      toast.success("Account created.");
      void navigate({ to: "/account" });
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
        <div className="glass flex flex-col items-center rounded-3xl p-8 text-center">
          <GlassIcon icon={MailCheck} tone="blue" size="lg" />
          <h1 className="mt-5 font-display text-2xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We've sent a confirmation link to <span className="text-foreground">{email}</span>. Confirm your
            account to sign in.
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
          <GlassIcon icon={UserPlus} tone="red" size="lg" />
          <h1 className="mt-5 font-display text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join LAG — Live As Gamers.</p>
        </div>
        <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} aria-invalid={Boolean(errors.fullName)} />
            {errors.fullName && <p className="text-xs font-medium text-lag-red">{errors.fullName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} />
            {errors.email && <p className="text-xs font-medium text-lag-red">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={Boolean(errors.phone)} />
            {errors.phone && <p className="text-xs font-medium text-lag-red">{errors.phone}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(errors.password)} />
            {errors.password && <p className="text-xs font-medium text-lag-red">{errors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} aria-invalid={Boolean(errors.confirmPassword)} />
            {errors.confirmPassword && <p className="text-xs font-medium text-lag-red">{errors.confirmPassword}</p>}
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-lag-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
