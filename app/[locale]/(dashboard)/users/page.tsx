"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function UsersPage() {
  const dictionary = useDictionary();

  return (
    <ResourcePage
      title={dictionary.usersTitle}
      description={dictionary.usersDesc}
      endpoint={endpoints.admin.users}
      filters={[
        {
          key: "is_active",
          label: dictionary.status,
          options: [
            { label: dictionary.active, value: "true" },
            { label: dictionary.suspended, value: "false" }
          ]
        }
      ]}
      rowActions={[
        {
          label: dictionary.suspendAccount,
          variant: "danger",
          visible: (row) => Boolean(row.is_active),
          endpoint: (row) => `${endpoints.admin.users}${row.id}/suspend/`,
          confirm: dictionary.suspendConfirm
        },
        {
          label: dictionary.activateAccount,
          variant: "primary",
          visible: (row) => !Boolean(row.is_active),
          endpoint: (row) => `${endpoints.admin.users}${row.id}/activate/`
        }
      ]}
      columns={[
        { key: "id", label: "#", type: "number" },
        { key: "email", label: dictionary.colEmailShort },
        { key: "full_name", label: dictionary.colName },
        { key: "role", label: dictionary.colRole, type: "status" },
        {
          key: "is_active",
          label: dictionary.status,
          render: (row) => (row.is_active ? dictionary.active : dictionary.suspended)
        },
        { key: "sources_count", label: dictionary.colSources, type: "number" },
        { key: "study_plans_count", label: dictionary.colPlans, type: "number" },
        { key: "quizzes_count", label: dictionary.colQuizzes, type: "number" },
        { key: "created_at", label: dictionary.createdAt, type: "date" }
      ]}
    />
  );
}
