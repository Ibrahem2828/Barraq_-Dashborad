import type { Dictionary } from "@/lib/i18n/dictionaries";

export type IconName = "grid" | "users" | "shield" | "book" | "file" | "calendar" | "quiz" | "spark" | "star" | "gem" | "credit" | "support" | "history" | "health";

export interface NavItem {
  key: keyof Dictionary;
  href: string;
  icon: IconName;
  permission?: string;
  section?: string;
}

/**
 * `section` and `permission` must use the backend's own identifiers --
 * SECTION_PERMISSIONS and DEFAULT_PERMISSIONS in
 * apps/admin_dashboard/services.py. A key that does not exist there
 * resolves to `undefined` in `allowed_sections` and silently hides the item
 * from every non-superuser admin, which is how education, study plans and
 * audit logs became invisible.
 */
export const navigation: NavItem[] = [
  { key: "overview", href: "", icon: "grid", permission: "dashboard.view", section: "dashboard" },
  { key: "users", href: "/users", icon: "users", permission: "users.view", section: "users" },
  { key: "admins", href: "/admins", icon: "shield", permission: "admins.view", section: "admins" },
  { key: "roles", href: "/roles", icon: "shield", permission: "roles.view", section: "roles" },
  { key: "education", href: "/education", icon: "book", section: "subjects" },
  { key: "sources", href: "/sources", icon: "file", section: "sources" },
  { key: "studyPlans", href: "/study-plans", icon: "calendar", section: "study" },
  { key: "quizzes", href: "/quizzes", icon: "quiz", section: "quizzes" },
  { key: "aiJobs", href: "/ai-jobs", icon: "spark", section: "ai" },
  { key: "aiFeedback", href: "/ai-feedback", icon: "star", section: "ai" },
  { key: "aiResults", href: "/ai-results", icon: "gem", section: "ai" },
  { key: "subscriptions", href: "/subscriptions", icon: "credit", section: "subscriptions" },
  { key: "support", href: "/support", icon: "support", section: "support" },
  { key: "auditLogs", href: "/audit-logs", icon: "history", permission: "audit_logs.view", section: "audit_logs" },
  { key: "system", href: "/system", icon: "health", permission: "system.health", section: "system" }
];

/** Resolve the navigation access rule for a dashboard pathname. */
export function matchNavItem(pathname: string, locale: string): NavItem | undefined {
  const base = `/${locale}`;
  const normalized = pathname.replace(/\/+$/, "") || base;

  if (normalized === base) {
    return navigation.find((item) => item.href === "");
  }

  const matches = navigation
    .filter((item) => item.href)
    .map((item) => ({ item, full: `${base}${item.href}` }))
    .filter(({ full }) => normalized === full || normalized.startsWith(`${full}/`))
    .sort((a, b) => b.full.length - a.full.length);

  return matches[0]?.item;
}
