import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/students")({
  component: Students,
});

function Students() {
  const [rows, setRows] = useState<any[]>([]);
  const [dorms, setDorms] = useState<any[]>([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    const [{ data: profs }, { data: roles }, { data: ds }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("dormitories").select("*"),
    ]);
    const studentIds = new Set((roles ?? []).filter((r) => r.role === "student").map((r) => r.user_id));
    setRows((profs ?? []).filter((p) => studentIds.has(p.id)));
    setDorms(ds ?? []);
  };

  useEffect(() => { load(); }, []);

  const updateField = async (id: string, patch: any) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  };

  const filtered = rows.filter((r) =>
    !filter || r.full_name?.toLowerCase().includes(filter.toLowerCase()) || r.email?.toLowerCase().includes(filter.toLowerCase())
  );

  const dormName = (id: string | null) => dorms.find((d) => d.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Students</h1>
        <p className="text-muted-foreground">Manage student records and dormitory assignments.</p>
      </div>
      <Card className="shadow-card">
        <CardHeader>
          <Input placeholder="Search students…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No students yet. Have them sign up as Student to appear here.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Room</th>
                  <th className="py-2 pr-3">Dormitory</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-3 font-medium">{s.full_name}</td>
                    <td className="py-2 pr-3">{s.email}</td>
                    <td className="py-2 pr-3">
                      <Input defaultValue={s.room ?? ""} className="h-8 w-24"
                        onBlur={(e) => e.target.value !== (s.room ?? "") && updateField(s.id, { room: e.target.value })} />
                    </td>
                    <td className="py-2 pr-3">
                      <select defaultValue={s.dormitory_id ?? ""}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        onChange={(e) => updateField(s.id, { dormitory_id: e.target.value || null })}>
                        <option value="">Unassigned</option>
                        {dorms.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
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
