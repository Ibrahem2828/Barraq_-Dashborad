"use client";

import { TabbedResources } from "@/components/data/TabbedResources";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function SubscriptionsPage() {
  const dictionary = useDictionary();

  return (
    <TabbedResources
      tabs={[
        {
          id: "plans",
          label: dictionary.plansTab,
          title: dictionary.plansTitle,
          description: dictionary.plansDesc,
          endpoint: endpoints.admin.subscriptionPlans,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "code", label: dictionary.colCode },
            { key: "name", label: dictionary.colPlanName },
            { key: "price", label: dictionary.colPrice },
            { key: "billing_cycle", label: dictionary.colBillingCycle, type: "status" },
            {
              key: "is_active",
              label: dictionary.status,
              render: (row) => (row.is_active ? dictionary.active : dictionary.inactive)
            },
            { key: "sort_order", label: dictionary.colSortOrder, type: "number" }
          ]
        },
        {
          id: "users",
          label: dictionary.userSubsTab,
          title: dictionary.userSubsTitle,
          description: dictionary.userSubsDesc,
          endpoint: endpoints.admin.userSubscriptions,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "user", label: dictionary.colUser, type: "user" },
            { key: "plan_name", label: dictionary.colPlan },
            { key: "status", label: dictionary.status, type: "status" },
            { key: "started_at", label: dictionary.colStart, type: "date" },
            { key: "ends_at", label: dictionary.colEnd, type: "date" },
            {
              key: "auto_renew",
              label: dictionary.autoRenew,
              render: (row) => (row.auto_renew ? dictionary.yes : dictionary.no)
            }
          ]
        },
        {
          id: "usage",
          label: dictionary.usageTab,
          title: dictionary.usageTitle,
          description: dictionary.usageDesc,
          endpoint: endpoints.admin.subscriptionUsage,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "user", label: dictionary.colUser, type: "user" },
            { key: "character", label: dictionary.character, type: "status" },
            { key: "used", label: dictionary.colUsed, type: "number" },
            { key: "limit", label: dictionary.colLimit, type: "number" },
            { key: "period_start", label: dictionary.periodStart, type: "date" },
            { key: "period_end", label: dictionary.periodEnd, type: "date" }
          ]
        }
      ]}
    />
  );
}
