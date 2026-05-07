import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_app/permissions/")({
  component: PermissionsList,
});

function PermissionsList() {
  const { user, primaryRole } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<string>("all");
  const isStaff = primaryRole && ["super_admin", "admin", "ustadz"].includes(primaryRole);

  const load = async () => {
    let q = supabase.from("permissions").select("*").order("created_at", { ascending: false });
    if (!isStaff && user) q = q.eq("user_id", user.id);
    const { data } = await q;
    setRows(data ?? []);
    const ids = Array.from(new Set((data ?? []).map((p) => p.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, room, dormitory_id").in("id", ids);
      const m: Record<string, any> = {};
      (profs ?? []).forEach((p) => (m[p.id] = p));
      setProfilesById(m);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("perm-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "permissions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, primaryRole]);

  const act = async (id: string, newStatus: "approved" | "rejected", notes?: string) => {
    const { error } = await supabase.from("permissions")
      .update({ status: newStatus, approved_by: user!.id, notes: notes ?? null }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("activity_logs").insert({ user_id: user!.id, activity: `permission_${newStatus}`, metadata: { id } });
    toast.success(`Permission ${newStatus}`);
  };

  const filtered = rows.filter((p) => {
    if (status !== "all" && p.status !== status) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      p.reason?.toLowerCase().includes(q) ||
      p.destination?.toLowerCase().includes(q) ||
      profilesById[p.user_id]?.full_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Permissions</h1>
          <p className="text-muted-foreground">{isStaff ? "Manage and approve student permissions." : "Your permission requests."}</p>
        </div>
        {primaryRole === "student" && (
          <Link to="/permissions/new">
            <Button className="bg-gradient-primary shadow-elegant"><Plus className="h-4 w-4 mr-2" />New Request</Button>
          </Link>
        )}
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row gap-2 items-center flex-wrap">
          <Input placeholder="Search…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="late">Late</option>
            <option value="returned">Returned</option>
          </select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No permissions match.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  {isStaff && <th className="py-2 pr-3">Student</th>}
                  <th className="py-2 pr-3">Reason</th>
                  <th className="py-2 pr-3">Destination</th>
                  <th className="py-2 pr-3">Exit</th>
                  <th className="py-2 pr-3">Return</th>
                  <th className="py-2 pr-3">Status</th>
                  {isStaff && <th className="py-2 pr-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    {isStaff && <td className="py-2 pr-3">{profilesById[p.user_id]?.full_name ?? "—"}</td>}
                    <td className="py-2 pr-3">{p.reason}</td>
                    <td className="py-2 pr-3">{p.destination}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{format(new Date(p.exit_date), "dd MMM HH:mm")}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{format(new Date(p.return_date), "dd MMM HH:mm")}</td>
                    <td className="py-2 pr-3">
                      <Badge className="capitalize" variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                        {p.status}
                      </Badge>
                    </td>
                    {isStaff && (
                      <td className="py-2 pr-3">
                        {p.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => act(p.id, "approved")}>
                              <CheckCircle2 className="h-4 w-4 mr-1 text-success" />Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => act(p.id, "rejected")}>
                              <XCircle className="h-4 w-4 mr-1 text-destructive" />Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
