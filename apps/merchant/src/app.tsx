import { Suspense, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppSidebar } from "@/widgets/app-sidebar";
import { TopBar } from "@/widgets/top-bar";
import { PageTransition } from "@/widgets/page-transition";
import { routes } from "@/app/routes/registry";
import { LoginPage } from "@/pages/login";
import { SignUpPage } from "@/pages/signup";
import { OnboardingPage } from "@/pages/onboarding";
import { SetPasswordPage } from "@/pages/set-password";
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
  const { isAuthenticated, needsPassword } = useAuth();
  const { pathname } = useLocation();
  const { t } = useI18n();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 900 : false
  );

  // Onboarding runs before there is a session, and renders its own full-screen
  // chrome — the sidebar it would sit next to has not been provisioned yet.
  if (pathname === "/onboarding") {
    return <OnboardingPage />;
  }

  // Route guard: unauthenticated users land on /login with no sidebar or top
  // bar. /signup is the one other door in — without this exception the
  // "Create Account" link would bounce straight back to sign-in.
  if (!isAuthenticated) {
    if (pathname === "/login") return <LoginPage />;
    if (pathname === "/signup") return <SignUpPage />;
    return <Navigate to="/login" replace />;
  }

  // An authenticated user has no business on the sign-in or signup screens.
  if (pathname === "/login" || pathname === "/signup") {
    return <Navigate to="/" replace />;
  }

  // Skipped the password at signup — block the shell until one is set,
  // rather than leaving the account without one indefinitely.
  if (needsPassword) {
    return <SetPasswordPage />;
  }

  return (
    // The shell paints the page surface every routed page sits on. It has to
    // come from the theme token, not a literal: hardcoding white here covered
    // the themed <body> and left dark mode with a white page behind dark
    // cards, so page-level headings (near-white in dark) vanished.
    <div className="flex h-screen overflow-hidden bg-[var(--octo-app-bg)]">
      <AppSidebar collapsed={sidebarCollapsed} onToggleCollapsed={setSidebarCollapsed} />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarCollapsed((c) => !c)} />
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
  );
}
