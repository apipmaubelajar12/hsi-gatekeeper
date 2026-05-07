import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, AlertTriangle, CheckCircle2, Building2, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

interface Stat { label: string; value: number | string; icon: any; tone?: string }

function StatCard({ s }: { s: Stat }) {
  const Icon = s.icon;
  return (
    <Card className="shadow-card hover:shadow-elegant transition-shadow">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${s.tone ?? "bg-gradient-primary text-primary-foreground"}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-2xl font-bold">{s.value}</div>
          <div className="text-xs text-muted-foreground">{s.label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { primaryRole, user, profile } = useAuth();
  const [stats, setStats] = useState<Stat[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      if (primaryRole === "student") {
        const { data: perms } = await supabase.from("permissions")
          .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        const active = perms?.find((p) => p.status === "approved" || p.status === "late");
        setStats([
          { label: "Active Permission", value: active ? "Outside" : "Inside", icon: active ? AlertTriangle : CheckCircle2, tone: active ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground" },
          { label: "Total Permissions", value: perms?.length ?? 0, icon: ClipboardList },
          { label: "Approved", value: perms?.filter((p) => p.status === "approved" || p.status === "returned").length ?? 0, icon: CheckCircle2 },
          { label: "Pending", value: perms?.filter((p) => p.status === "pending").length ?? 0, icon: ClipboardList },
        ]);
        setRecent(perms?.slice(0, 5) ?? []);
      } else {
        const [{ count: students }, { count: ustadz }, { data: perms }, { count: dorms }] = await Promise.all([
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "ustadz"),
          supabase.from("permissions").select("*").order("created_at", { ascending: false }).limit(50),
          supabase.from("dormitories").select("*", { count: "exact", head: true }),
        ]);
        const outside = perms?.filter((p) => p.status === "approved" || p.status === "late").length ?? 0;
        const pending = perms?.filter((p) => p.status === "pending").length ?? 0;
        const late = perms?.filter((p) => p.status === "late").length ?? 0;
        setStats([
          { label: "Students", value: students ?? 0, icon: Users },
          { label: "Ustadz", value: ustadz ?? 0, icon: UserCheck },
          { label: "Dormitories", value: dorms ?? 0, icon: Building2 },
          { label: "Pending Permissions", value: pending, icon: ClipboardList, tone: "bg-warning text-warning-foreground" },
          { label: "Currently Outside", value: outside, icon: AlertTriangle, tone: "bg-primary text-primary-foreground" },
          { label: "Late Returns", value: late, icon: AlertTriangle, tone: "bg-destructive text-destructive-foreground" },
        ]);
        setRecent(perms?.slice(0, 8) ?? []);
      }
    };
    load();
    const ch = supabase.channel("dash-perms")
      .on("postgres_changes", { event: "*", schema: "public", table: "permissions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, primaryRole]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Hello {profile?.full_name}, here is your overview.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} s={s} />)}
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle>Recent Permissions</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No permissions yet.</p>
          ) : (
            <div className="divide-y">
              {recent.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.reason}</div>
                    <div className="text-xs text-muted-foreground truncate">to {p.destination}</div>
                  </div>
                  <Badge className="capitalize" variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
