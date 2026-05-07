import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { Brand } from "@/components/Brand";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HSI Boarding School — Permission System" },
      { name: "description", content: "Smart in Quran, Expert in IT — boarding school permission management." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

const queryClient = new QueryClient();
function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="glass rounded-2xl p-10 text-center max-w-md shadow-card">
        <Brand size="md" />
        <h1 className="mt-6 text-5xl font-bold gradient-text">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found.</p>
        <a href="/" className="mt-6 inline-block bg-gradient-primary text-primary-foreground px-5 py-2 rounded-lg shadow-elegant">Back home</a>
      </div>
    </div>
  );
}

function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="glass rounded-2xl p-8 max-w-md text-center shadow-card">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }}
          className="mt-5 bg-gradient-primary text-primary-foreground px-5 py-2 rounded-lg">Try again</button>
      </div>
    </div>
  );
}
