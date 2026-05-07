import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/permissions/new")({
  component: NewPermission,
});

function NewPermission() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [hasActive, setHasActive] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("permissions").select("id,status").eq("user_id", user.id)
      .in("status", ["pending", "approved", "late"]).then(({ data }) => {
        setHasActive((data ?? []).length > 0);
      });
  }, [user]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (hasActive) return toast.error("You already have an active permission. Check in first.");
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.from("permissions").insert({
      user_id: user!.id,
      reason: String(fd.get("reason")),
      destination: String(fd.get("destination")),
      exit_date: new Date(String(fd.get("exit_date"))).toISOString(),
      return_date: new Date(String(fd.get("return_date"))).toISOString(),
      guardian_phone: String(fd.get("guardian_phone") || "") || null,
      status: "pending",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Permission request submitted");
    navigate({ to: "/permissions" });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Request Permission</h1>
        <p className="text-muted-foreground">Fill in your exit details. Ustadz will review your request.</p>
      </div>
      {hasActive && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="p-4 text-sm">
            You already have an active permission. Please check in via QR scanner first before requesting another.
          </CardContent>
        </Card>
      )}
      <Card className="shadow-card">
        <CardHeader><CardTitle>New Permission</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={profile?.full_name ?? ""} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Room</Label>
                <Input value={profile?.room ?? ""} readOnly />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" name="reason" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input id="destination" name="destination" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="exit_date">Exit date & time</Label>
                <Input id="exit_date" name="exit_date" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="return_date">Return date & time</Label>
                <Input id="return_date" name="return_date" type="datetime-local" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardian_phone">Guardian phone (optional)</Label>
              <Input id="guardian_phone" name="guardian_phone" />
            </div>
            <Button disabled={busy || hasActive} className="w-full bg-gradient-primary shadow-elegant">
              {busy ? "Submitting…" : "Submit Request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
