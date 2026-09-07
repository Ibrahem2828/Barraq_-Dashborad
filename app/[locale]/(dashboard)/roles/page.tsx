"use client";

import { TabbedResources } from "@/components/data/TabbedResources";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function RolesPage() {
  const dictionary = useDictionary();

  return (
    <TabbedResources
      tabs={[
        {
          id: "roles",
          label: dictionary.rolesTab,
          title: dictionary.rolesTitle,
          description: dictionary.rolesDesc,
          endpoint: endpoints.admin.roles,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "code", label: dictionary.colCode },
            { key: "name", label: dictionary.colName },
            { key: "description", label: dictionary.colDescription },
            {
              key: "is_system",
              label: dictionary.isSystem,
              render: (row) => (row.is_system ? dictionary.yes : dictionary.no)
            },
            {
              key: "is_active",
              label: dictionary.status,
              render: (row) => (row.is_active ? dictionary.active : dictionary.inactive)
            }
          ]
        },
        {
          id: "permissions",
          label: dictionary.permissionsTab,
          title: dictionary.permissionsTitle,
          description: dictionary.permissionsDesc,
          endpoint: endpoints.admin.permissions,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "code", label: dictionary.colCode },
            { key: "name", label: dictionary.colName },
            { key: "category", label: dictionary.colCategory, type: "status" },
            { key: "description", label: dictionary.colDescription }
          ]
        }
      ]}
    />
  );
}
