import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ustadz")({
  component: UstadzApprovals,
});

function UstadzApprovals() {
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "ustadz");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) { setRows([]); return; }
    const { data: profs } = await supabase.from("profiles").select("*").in("id", ids).order("full_name");
    setRows(profs ?? []);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("profiles").update({ approval_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Ustadz ${status}`); load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ustadz Approvals</h1>
        <p className="text-muted-foreground">Approve newly registered Ustadz accounts.</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No Ustadz accounts yet.</p>
          ) : (
            <div className="divide-y">
              {rows.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-medium">{u.full_name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="capitalize" variant={u.approval_status === "approved" ? "default" : u.approval_status === "rejected" ? "destructive" : "secondary"}>
                      {u.approval_status}
                    </Badge>
                    {u.approval_status !== "approved" && <Button size="sm" onClick={() => setStatus(u.id, "approved")}>Approve</Button>}
                    {u.approval_status !== "rejected" && <Button size="sm" variant="outline" onClick={() => setStatus(u.id, "rejected")}>Reject</Button>}
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
