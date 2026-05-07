import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/become-admin")({
  component: BecomeAdmin,
});

function BecomeAdmin() {
  const { user } = useAuth();
  const [req, setReq] = useState<any>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("admin_requests").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setReq(data);
  };
  useEffect(() => { load(); }, [user]);

  const submit = async () => {
    const { error } = await supabase.from("admin_requests").insert({ user_id: user!.id });
    if (error) return toast.error(error.message);
    toast.success("Request submitted"); load();
  };
  const cancel = async () => {
    const { error } = await supabase.from("admin_requests").delete().eq("id", req.id);
    if (error) return toast.error(error.message);
    toast.success("Request cancelled"); load();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Request Admin Role</h1>
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-4">
          {!req || req.status === "rejected" ? (
            <>
              <p className="text-sm text-muted-foreground">Submit a request to be promoted from Ustadz to Admin. An existing Admin will review it.</p>
              <Button onClick={submit} className="bg-gradient-primary">Submit Request</Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span>Status:</span>
                <Badge className="capitalize">{req.status}</Badge>
              </div>
              {req.status === "pending" && <Button variant="outline" onClick={cancel}>Cancel Request</Button>}
              {req.status === "accepted" && <p className="text-sm text-success">You are now an Admin. Sign out and back in to refresh access.</p>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
