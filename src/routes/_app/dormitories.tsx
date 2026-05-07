import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/dormitories")({
  component: Dorms,
});

function Dorms() {
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");

  const load = async () => {
    const [{ data: ds }, { data: profs }] = await Promise.all([
      supabase.from("dormitories").select("*").order("name"),
      supabase.from("profiles").select("dormitory_id"),
    ]);
    setRows(ds ?? []);
    const c: Record<string, number> = {};
    (profs ?? []).forEach((p) => { if (p.dormitory_id) c[p.dormitory_id] = (c[p.dormitory_id] ?? 0) + 1; });
    setCounts(c);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("dormitories").insert({ name: name.trim() });
    if (error) return toast.error(error.message);
    setName(""); toast.success("Dormitory added"); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this dormitory?")) return;
    const { error } = await supabase.from("dormitories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const rename = async (id: string, newName: string) => {
    const { error } = await supabase.from("dormitories").update({ name: newName }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Renamed"); load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dormitories</h1>
        <p className="text-muted-foreground">Manage dormitories and supervising Ustadz.</p>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">Add new</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Dormitory name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={add} className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1" />Add</Button>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((d) => (
          <Card key={d.id} className="shadow-card hover:shadow-elegant transition-shadow">
            <CardContent className="p-5 space-y-3">
              <Input defaultValue={d.name} onBlur={(e) => e.target.value !== d.name && rename(d.id, e.target.value)} className="font-semibold" />
              <div className="text-sm text-muted-foreground">{counts[d.id] ?? 0} students</div>
              <Button variant="ghost" size="sm" onClick={() => remove(d.id)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
