"use client";

import { useState } from "react";
import { AdminProvider } from "@/components/providers/AdminProvider";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { BrandLoadingScreen } from "@/components/ui/BrandSpinner";
import { ErrorState } from "@/components/ui/States";
import { useAdmin } from "@/components/providers/AdminProvider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/types/api";

export function DashboardShell({
  locale,
  dictionary,
  children
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AdminProvider>
      <ProtectedDashboard locale={locale} dictionary={dictionary} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}>
        {children}
      </ProtectedDashboard>
    </AdminProvider>
  );
}

function ProtectedDashboard({
  locale,
  dictionary,
  mobileOpen,
  setMobileOpen,
  children
}: {
  locale: Locale;
  dictionary: Dictionary;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const { admin, loading, error, reload } = useAdmin();

  if (loading) return <BrandLoadingScreen />;
  if (error || !admin) {
    return (
      <main className="standalone-state">
        <ErrorState message={error ?? dictionary.loginFailed} onRetry={reload} />
      </main>
    );
  }

  return (
    <div className="dashboard-shell">
        <Sidebar locale={locale} dictionary={dictionary} open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="dashboard-main">
          <Topbar locale={locale} dictionary={dictionary} onMenu={() => setMobileOpen(true)} />
          <main className="page-content">{children}</main>
          <footer className="dashboard-footer">
            {dictionary.footerBrand} • {new Date().getFullYear()} • {dictionary.footerVersion}{" "}
            {process.env.NEXT_PUBLIC_DASHBOARD_VERSION ?? "1.0.0"}
          </footer>
        </div>
    </div>
  );
}
