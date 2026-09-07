"use client";

import { useState } from "react";
import { AdminProvider } from "@/components/providers/AdminProvider";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
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
    </AdminProvider>
  );
}
