"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";

export default function AdminsPage() {
  const dictionary = useDictionary();
  const locale = useLocale();
  const join = locale === "en" ? ", " : "، ";

  return (
    <ResourcePage
      title={dictionary.adminsTitle}
      description={dictionary.adminsDesc}
      endpoint={endpoints.admin.admins}
      filters={[
        {
          key: "is_active",
          label: dictionary.status,
          options: [
            { label: dictionary.active, value: "true" },
            { label: dictionary.inactive, value: "false" }
          ]
        }
      ]}
      columns={[
        { key: "id", label: "#", type: "number" },
        { key: "full_name", label: dictionary.colName },
        { key: "email", label: dictionary.colEmailShort },
        {
          key: "is_superuser",
          label: dictionary.superAdmin,
          render: (row) => (row.is_superuser ? dictionary.yes : dictionary.no)
        },
        {
          key: "roles",
          label: dictionary.colRoles,
          render: (row) =>
            Array.isArray(row.roles)
              ? row.roles
                  .map((role) => (typeof role === "object" && role ? String((role as Record<string, unknown>).name ?? "") : String(role)))
                  .join(join)
              : "—"
        },
        {
          key: "is_active",
          label: dictionary.status,
          render: (row) => (row.is_active ? dictionary.active : dictionary.inactive)
        },
        { key: "created_at", label: dictionary.addedAt, type: "date" }
      ]}
    />
  );
}
