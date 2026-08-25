import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassIcon } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — LAG Admin" },
      { name: "description", content: "Sign in to the LAG admin dashboard." },
      { property: "og:title", content: "Admin Login — LAG Admin" },
      { property: "og:description", content: "Sign in to the LAG admin dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAdmin, setCheckedAdmin] = useState(false);

  useEffect(() => {
    if (!loading && isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (checkedAdmin && user && !loading && !isAdmin) {
      setError("This account does not have admin access.");
    }
  }, [checkedAdmin, user, loading, isAdmin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      toast.error(signInError.message);
      setError(signInError.message);
      return;
    }
    setCheckedAdmin(true);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-12">
      <div className="glass w-full rounded-3xl p-8">
        <GlassIcon icon={LogIn} tone="blue" size="lg" className="mx-auto" />
        <h1 className="mt-5 text-center font-display text-xl font-bold">Admin Sign In</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Admin rights are granted from the database. Contact the site owner if you need access.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm font-medium text-lag-red">{error}</p>}
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
