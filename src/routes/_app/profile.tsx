import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, refresh, primaryRole } = useAuth();
  const [dorms, setDorms] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("dormitories").select("*").order("name").then(({ data }) => setDorms(data ?? []));
  }, []);

  if (!profile) return null;
  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: String(fd.get("full_name")),
      phone: String(fd.get("phone") || "") || null,
      parent_name: String(fd.get("parent_name") || "") || null,
      parent_phone: String(fd.get("parent_phone") || "") || null,
      room: String(fd.get("room") || "") || null,
      dormitory_id: String(fd.get("dormitory_id") || "") || null,
    }).eq("id", profile.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    refresh();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Profile</h1>
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base capitalize">{primaryRole?.replace("_", " ")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Email</Label><Input value={profile.email} readOnly /></div>
              <div className="space-y-2"><Label htmlFor="full_name">Full name</Label><Input id="full_name" name="full_name" defaultValue={profile.full_name} required /></div>
              <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" defaultValue={profile.phone ?? ""} /></div>
              <div className="space-y-2"><Label htmlFor="room">Room</Label><Input id="room" name="room" defaultValue={profile.room ?? ""} /></div>
              <div className="space-y-2"><Label htmlFor="parent_name">Parent name</Label><Input id="parent_name" name="parent_name" defaultValue={profile.parent_name ?? ""} /></div>
              <div className="space-y-2"><Label htmlFor="parent_phone">Parent phone</Label><Input id="parent_phone" name="parent_phone" defaultValue={profile.parent_phone ?? ""} /></div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="dormitory_id">Dormitory</Label>
                <select id="dormitory_id" name="dormitory_id" defaultValue={profile.dormitory_id ?? ""}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select dormitory…</option>
                  {dorms.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <Button disabled={busy} className="bg-gradient-primary shadow-elegant">{busy ? "Saving…" : "Save changes"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
