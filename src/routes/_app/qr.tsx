import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/qr")({
  component: MyQR,
});

function MyQR() {
  const { profile, user } = useAuth();
  const [active, setActive] = useState<any>(null);
  const [dormName, setDormName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("permissions").select("*").eq("user_id", user.id)
      .in("status", ["approved", "late"]).maybeSingle().then(({ data }) => setActive(data));
    if (profile?.dormitory_id) {
      supabase.from("dormitories").select("name").eq("id", profile.dormitory_id).maybeSingle()
        .then(({ data }) => setDormName(data?.name ?? ""));
    }
  }, [user, profile]);

  const status = active ? (active.status === "late" ? "late return" : "currently outside") : "inside dormitory";
  const payload = JSON.stringify({
    token: profile?.qr_token,
    student_id: profile?.id,
    name: profile?.full_name,
    dormitory: dormName,
    room: profile?.room,
    status,
  });

  return (
    <div className="max-w-xl mx-auto">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>My QR Code</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="p-6 bg-white rounded-2xl shadow-card">
            <QRCodeSVG value={payload} size={240} level="H" />
          </div>
          <div className="text-center space-y-1">
            <div className="text-xl font-semibold">{profile?.full_name}</div>
            <div className="text-sm text-muted-foreground">
              {dormName || "No dormitory"} · Room {profile?.room || "—"}
            </div>
            <Badge className="mt-2 capitalize" variant={active ? "secondary" : "default"}>{status}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
