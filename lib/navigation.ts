import type { Dictionary } from "@/lib/i18n/dictionaries";

export type IconName = "grid" | "users" | "shield" | "book" | "file" | "calendar" | "quiz" | "spark" | "star" | "gem" | "credit" | "support" | "history" | "health";

export interface NavItem {
  key: keyof Dictionary;
  href: string;
  icon: IconName;
  permission?: string;
  section?: string;
}

export const navigation: NavItem[] = [
  { key: "overview", href: "", icon: "grid", permission: "dashboard.view", section: "dashboard" },
  { key: "users", href: "/users", icon: "users", permission: "users.view", section: "users" },
  { key: "admins", href: "/admins", icon: "shield", permission: "admins.view", section: "admins" },
  { key: "roles", href: "/roles", icon: "shield", permission: "roles.view", section: "roles" },
  { key: "education", href: "/education", icon: "book", section: "subjects" },
  { key: "sources", href: "/sources", icon: "file", section: "sources" },
  { key: "studyPlans", href: "/study-plans", icon: "calendar", section: "study_plans" },
  { key: "quizzes", href: "/quizzes", icon: "quiz", section: "quizzes" },
  { key: "aiJobs", href: "/ai-jobs", icon: "spark", section: "ai" },
  { key: "aiFeedback", href: "/ai-feedback", icon: "star", section: "ai" },
  { key: "aiResults", href: "/ai-results", icon: "gem", section: "ai" },
  { key: "subscriptions", href: "/subscriptions", icon: "credit", section: "subscriptions" },
  { key: "support", href: "/support", icon: "support", section: "support" },
  { key: "auditLogs", href: "/audit-logs", icon: "history", permission: "audit.view", section: "audit" },
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
