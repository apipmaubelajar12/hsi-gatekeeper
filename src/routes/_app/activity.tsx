import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/activity")({
  component: Activity,
});

function Activity() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Activity Logs</h1>
      <Card className="shadow-card">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No activity.</p>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="p-4 flex justify-between text-sm">
                  <div>
                    <div className="font-medium capitalize">{r.activity.replace(/_/g, " ")}</div>
                    {r.metadata && <div className="text-xs text-muted-foreground font-mono">{JSON.stringify(r.metadata)}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(r.created_at), "dd MMM yyyy HH:mm")}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
