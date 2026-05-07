import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Brand } from "@/components/Brand";
import {
  LayoutDashboard, Users, Building2, ClipboardList, QrCode, ScanLine,
  ShieldCheck, LogOut, UserCircle, FileText, History, Loader2, Menu, X
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

interface NavItem { to: string; label: string; icon: any; roles: string[] }

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin","admin","ustadz","student"] },
  { to: "/permissions", label: "Permissions", icon: ClipboardList, roles: ["super_admin","admin","ustadz","student"] },
  { to: "/permissions/new", label: "Request Permission", icon: FileText, roles: ["student"] },
  { to: "/qr", label: "My QR Code", icon: QrCode, roles: ["student"] },
  { to: "/scanner", label: "QR Scanner", icon: ScanLine, roles: ["super_admin","admin","ustadz"] },
  { to: "/students", label: "Students", icon: Users, roles: ["super_admin","admin","ustadz"] },
  { to: "/dormitories", label: "Dormitories", icon: Building2, roles: ["super_admin","admin"] },
  { to: "/ustadz", label: "Ustadz Approvals", icon: ShieldCheck, roles: ["super_admin","admin"] },
  { to: "/admin-requests", label: "Admin Requests", icon: ShieldCheck, roles: ["super_admin","admin"] },
  { to: "/admins", label: "Manage Admins", icon: ShieldCheck, roles: ["super_admin"] },
  { to: "/become-admin", label: "Request Admin Role", icon: ShieldCheck, roles: ["ustadz"] },
  { to: "/activity", label: "Activity Logs", icon: History, roles: ["super_admin","admin"] },
  { to: "/profile", label: "Profile", icon: UserCircle, roles: ["super_admin","admin","ustadz","student"] },
];

function AppLayout() {
  const { session, loading, primaryRole, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Ustadz approval gate
  if (primaryRole === "ustadz" && profile?.approval_status === "pending") {
    return (
      <div className="min-h-screen grid place-items-center p-6 bg-gradient-soft">
        <div className="glass rounded-2xl p-8 max-w-md text-center shadow-card">
          <Brand />
          <h2 className="mt-6 text-xl font-semibold">Awaiting approval</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your Ustadz account is pending admin approval. Please wait for an Admin to approve your account.
          </p>
          <Button variant="outline" className="mt-6" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  const items = NAV.filter((n) => primaryRole && n.roles.includes(primaryRole));

  return (
    <div className="min-h-screen flex bg-gradient-soft">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-sidebar border-r border-sidebar-border transform transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
          <Brand />
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="p-3 space-y-1">
          {items.map((it) => {
            const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
            const Icon = it.icon;
            return (
              <Link key={it.to} to={it.to} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}>
                <Icon className="h-4 w-4" />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 glass border-b border-border h-16 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <div className="hidden md:block text-sm text-muted-foreground">Welcome back,</div>
            <div className="font-semibold">{profile?.full_name || profile?.email}</div>
            {primaryRole && <Badge variant="secondary" className="capitalize">{primaryRole.replace("_", " ")}</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
