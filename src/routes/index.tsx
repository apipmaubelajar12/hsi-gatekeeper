import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [session, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const full_name = String(fd.get("full_name") || "").trim();
    const role = String(fd.get("role") || "student");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name, role },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You can sign in now.");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="relative min-h-screen grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between p-12 text-primary-foreground">
          <Brand size="lg" variant="light" />
          <div className="space-y-4">
            <h1 className="text-5xl font-bold leading-tight">Manage student permissions, beautifully.</h1>
            <p className="text-lg opacity-90 max-w-md">
              A modern, realtime permission system for Ustadz, Admin, and Students of HSI Boarding School.
            </p>
          </div>
          <p className="text-sm opacity-80">© {new Date().getFullYear()} HSI Boarding School</p>
        </div>

        <div className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md glass rounded-2xl p-8 shadow-elegant">
            <div className="lg:hidden mb-6"><Brand /></div>
            <h2 className="text-2xl font-bold">Welcome</h2>
            <p className="text-sm text-muted-foreground mb-6">Sign in to your account or create a new one.</p>

            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required placeholder="you@school.id" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" required minLength={6} />
                  </div>
                  <Button disabled={busy} className="w-full bg-gradient-primary shadow-elegant">
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="su_name">Full name</Label>
                    <Input id="su_name" name="full_name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su_email">Email</Label>
                    <Input id="su_email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su_password">Password</Label>
                    <Input id="su_password" name="password" type="password" required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su_role">Register as</Label>
                    <select id="su_role" name="role" defaultValue="student"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="student">Student</option>
                      <option value="ustadz">Ustadz (needs admin approval)</option>
                    </select>
                  </div>
                  <Button disabled={busy} className="w-full bg-gradient-primary shadow-elegant">
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-6 text-xs text-center text-muted-foreground">
              Default Super Admin: <span className="font-mono">muhammadafifhikam@gmail.com</span> — sign up first, then sign in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
