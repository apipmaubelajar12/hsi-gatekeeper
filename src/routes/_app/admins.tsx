import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ShieldOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/admins")({
  component: ManageAdmins,
});

interface AdminRow {
  id: string;
  full_name: string;
  email: string;
}

function ManageAdmins() {
  const { primaryRole, user } = useAuth();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) { setRows([]); setLoading(false); return; }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids)
      .order("full_name");
    setRows((profs ?? []) as AdminRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const revokeAdmin = async (uid: string) => {
    // Remove admin role
    const { error: roleErr } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", uid)
      .eq("role", "admin");
    if (roleErr) return toast.error(roleErr.message);

    // Ensure they still have a base role; fall back to ustadz
    const { data: remaining } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    if (!remaining || remaining.length === 0) {
      await supabase.from("user_roles").insert({ user_id: uid, role: "ustadz" });
    }

    await supabase.from("activity_logs").insert({
      user_id: user?.id ?? null,
      activity: "admin_revoked",
      metadata: { target_user_id: uid },
    });

    toast.success("Admin access revoked");
    void load();
  };

  if (primaryRole !== "super_admin") {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Manage Admins</h1>
        <p className="text-muted-foreground">Only the Super Admin can manage admin accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manage Admins</h1>
        <p className="text-muted-foreground">Revoke admin access from existing administrators.</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 grid place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No admin accounts yet.</p>
          ) : (
            <div className="divide-y">
              {rows.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-medium">{u.full_name || u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Admin</Badge>
                    {u.id === user?.id ? (
                      <Badge variant="secondary">You</Badge>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <ShieldOff className="h-4 w-4 mr-1.5" /> Revoke Admin
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke admin access?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {u.full_name || u.email} will lose admin privileges. Their account will be downgraded to Ustadz.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => revokeAdmin(u.id)}>
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
