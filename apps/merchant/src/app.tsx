import { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppSidebar } from "@/widgets/app-sidebar";
import { TopBar } from "@/widgets/top-bar";
import { PageTransition } from "@/widgets/page-transition";
import { routes } from "@/app/routes/registry";
import { LoginPage } from "@/pages/login";
import { OnboardingPage } from "@/pages/onboarding";
import { AuthProvider, useAuth } from "@/app/providers/auth-provider";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { TenantConfigProvider } from "@/app/providers/tenant-config-provider";
import { useI18n } from "@/app/providers/i18n-provider";

// Root component. Auth wraps the shell so the login screen can be swapped in
// for the whole console. The shell is a grey rounded panel; the sidebar sits
// transparently on it and the main content is a separate white card.
// Routes are driven entirely by app/routes/registry.tsx.
export default function App() {
  return (
    <AuthProvider>
      <TenantConfigProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </TenantConfigProvider>
    </AuthProvider>
  );
}

function AppShell() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const { t } = useI18n();

  // Onboarding runs before there is a session, and renders its own full-screen
  // chrome — the sidebar it would sit next to has not been provisioned yet.
  if (pathname === "/onboarding") {
    return <OnboardingPage />;
  }

  // Route guard: unauthenticated users land on /login with no sidebar or top bar.
  if (!isAuthenticated) {
    return pathname === "/login" ? <LoginPage /> : <Navigate to="/login" replace />;
  }

  // An authenticated user has no business on the sign-in screen.
  if (pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen items-center justify-center overflow-hidden bg-[var(--octo-page-bg)] p-2 sm:p-6">
      <div
        className="flex h-full w-full max-w-[1400px] gap-2 rounded-2xl bg-[var(--octo-shell)] p-2 sm:gap-2.5 sm:rounded-[22px] sm:p-2.5"
        style={{ boxShadow: "0 24px 60px rgba(20,20,30,.10)" }}
      >
        <AppSidebar />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--octo-card)]">
          <TopBar />
          <div className="octo-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <PageTransition>
              <Suspense fallback={<div className="p-6 text-[12.5px] text-[var(--octo-text-muted)]">{t("common.loading")}</div>}>
                <Routes>
                  {routes.map((r) => (
                    <Route key={r.id} path={r.path} element={<r.element />} />
                  ))}
                </Routes>
              </Suspense>
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
