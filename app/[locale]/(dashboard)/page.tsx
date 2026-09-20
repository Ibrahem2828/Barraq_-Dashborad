"use client";

import { OrganizationOverview } from "@/components/dashboard/OrganizationOverview";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { useAdmin } from "@/components/providers/AdminProvider";
import { EmptyState } from "@/components/ui/States";
import { selectOverview } from "@/lib/auth/overview-scope";
import { useDictionary } from "@/lib/i18n/useDictionary";

/**
 * The first screen after signing in, chosen by what the operator
 * administers. The rule itself lives in `selectOverview` so it can be
 * tested; this only renders the answer.
 */
export default function DashboardPage() {
  const dictionary = useDictionary();
  const { admin } = useAdmin();
  const overview = selectOverview(admin ?? null);

  if (overview.kind === "platform") return <OverviewDashboard />;
  if (overview.kind === "organization") {
    return <OrganizationOverview organizations={overview.organizations} />;
  }

  // A class-only supervisor, or an account whose scope has not been granted
  // yet. Neither has an organization to summarise, and inventing numbers
  // for them would be worse than saying so plainly.
  return <EmptyState title={dictionary.noScope} description={dictionary.emptySupervisorsDesc} />;
}
