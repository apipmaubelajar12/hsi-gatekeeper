import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin-requests")({
  component: AdminReq,
});

function AdminReq() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [profs, setProfs] = useState<Record<string, any>>({});

  const load = async () => {
    const { data } = await supabase.from("admin_requests").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
    const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const m: Record<string, any> = {}; (ps ?? []).forEach((p) => (m[p.id] = p));
      setProfs(m);
    }
  };
  useEffect(() => { load(); }, []);

  const decide = async (req: any, accept: boolean) => {
    const { error } = await supabase.from("admin_requests").update({
      status: accept ? "accepted" : "rejected", reviewed_by: user!.id,
    }).eq("id", req.id);
    if (error) return toast.error(error.message);
    if (accept) {
      // remove ustadz role, add admin
      await supabase.from("user_roles").delete().eq("user_id", req.user_id).eq("role", "ustadz");
      await supabase.from("user_roles").insert({ user_id: req.user_id, role: "admin" });
    }
    toast.success(`Request ${accept ? "accepted" : "rejected"}`); load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Requests</h1>
        <p className="text-muted-foreground">Review Ustadz requests to be promoted to Admin.</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No requests.</p>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-medium">{profs[r.user_id]?.full_name ?? r.user_id}</div>
                    <div className="text-xs text-muted-foreground">{profs[r.user_id]?.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="capitalize" variant={r.status === "accepted" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge>
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => decide(r, true)}>Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => decide(r, false)}>Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
