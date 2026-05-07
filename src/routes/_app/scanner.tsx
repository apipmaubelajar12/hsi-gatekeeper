import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scanner } from "@yudiel/react-qr-scanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/scanner")({
  component: ScannerPage,
});

function ScannerPage() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<any>(null);

  const onScan = async (codes: { rawValue: string }[]) => {
    if (!codes.length || busy) return;
    setBusy(true);
    try {
      let parsed: any;
      try { parsed = JSON.parse(codes[0].rawValue); } catch { throw new Error("Invalid QR code"); }
      const { data: profile } = await supabase.from("profiles").select("*").eq("qr_token", parsed.token).maybeSingle();
      if (!profile) throw new Error("Student not found");
      const { data: active } = await supabase.from("permissions").select("*").eq("user_id", profile.id)
        .in("status", ["approved", "late"]).maybeSingle();
      if (!active) {
        setLast({ profile, active: null });
        toast.message(`${profile.full_name} has no active permission`);
        return;
      }
      const { error } = await supabase.from("permissions").update({
        status: "returned", checked_in_at: new Date().toISOString()
      }).eq("id", active.id);
      if (error) throw error;
      await supabase.from("activity_logs").insert({
        user_id: user!.id, activity: "check_in", metadata: { student: profile.id, permission: active.id }
      });
      setLast({ profile, active });
      toast.success(`${profile.full_name} checked in successfully`);
    } catch (e: any) {
      toast.error(e.message ?? "Scan failed");
    } finally {
      setTimeout(() => setBusy(false), 1500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">QR Scanner</h1>
        <p className="text-muted-foreground">Scan a student's QR code to check them back in.</p>
      </div>
      <Card className="shadow-elegant overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-square bg-black">
            <Scanner
              onScan={onScan}
              onError={(e: any) => toast.error(e?.message ?? "Camera error")}
              constraints={{ facingMode: "environment" }}
              styles={{ container: { width: "100%", height: "100%" } }}
            />
          </div>
        </CardContent>
      </Card>

      {last && (
        <Card className="shadow-card border-success">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" /> Last Scan
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Name:</span> {last.profile.full_name}</div>
            <div><span className="text-muted-foreground">Room:</span> {last.profile.room ?? "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> {last.active ? "Checked in" : "No active permission"}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
