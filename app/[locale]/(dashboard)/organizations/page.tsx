"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import { endpoints, organizationActionEndpoint } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

/**
 * The list is whatever the backend returns, unfiltered by this page.
 *
 * A scoped manager already receives only their own organizations, and a
 * platform admin receives all of them. Re-filtering here would put a second
 * copy of the tenant rule in the client, where it can drift from the one
 * that actually protects the data.
 */
export default function OrganizationsPage() {
  const dictionary = useDictionary();

  return (
    <ResourcePage
      title={dictionary.organizations}
      description={dictionary.organizationsDesc}
      endpoint={endpoints.admin.organizations}
      hydrateDetail
      createConfig={{
        title: dictionary.createOrganization,
        fields: [
          { key: "name", label: dictionary.colName, required: true },
          {
            key: "organization_type",
            label: dictionary.colType,
            type: "select",
            options: [
              { label: dictionary.typeSchool, value: "school" },
              { label: dictionary.typeInstitute, value: "institute" }
            ]
          }
        ]
      }}
      editConfig={{
        title: dictionary.editOrganization,
        fields: [
          { key: "name", label: dictionary.colName, required: true },
          {
            key: "organization_type",
            label: dictionary.colType,
            type: "select",
            options: [
              { label: dictionary.typeSchool, value: "school" },
              { label: dictionary.typeInstitute, value: "institute" }
            ]
          },
          {
            key: "status",
            label: dictionary.status,
            type: "select",
            options: [
              { label: dictionary.statusActive, value: "active" },
              { label: dictionary.statusInactive, value: "inactive" }
            ]
          }
        ],
        // Archiving is a separate, confirmed action rather than a status a
        // careless edit can set: it stops new members joining.
        fromRow: (row) => ({
          name: String(row.name ?? ""),
          organization_type: String(row.organization_type ?? "school"),
          status: String(row.status ?? "active")
        })
      }}
      mutationToasts={{
        createSuccess: dictionary.organizationCreated,
        updateSuccess: dictionary.organizationUpdated
      }}
      filters={[
        {
          key: "status",
          label: dictionary.status,
          options: [
            { label: dictionary.statusActive, value: "active" },
            { label: dictionary.statusInactive, value: "inactive" },
            { label: dictionary.statusArchived, value: "archived" }
          ]
        },
        {
          key: "organization_type",
          label: dictionary.colType,
          options: [
            { label: dictionary.typeSchool, value: "school" },
            { label: dictionary.typeInstitute, value: "institute" }
          ]
        }
      ]}
      rowActions={[
        {
          label: dictionary.archiveOrganization,
          variant: "danger",
          visible: (row) => String(row.status) !== "archived",
          endpoint: (row) => organizationActionEndpoint(String(row.public_id), "archive"),
          method: "POST",
          confirm: dictionary.archiveOrganizationConfirm,
          successToast: dictionary.organizationArchived
        }
      ]}
      columns={[
        { key: "name", label: dictionary.colName, mobile: "title" },
        { key: "organization_type", label: dictionary.colType, type: "status", mobile: true },
        { key: "status", label: dictionary.status, type: "status", mobile: true },
        { key: "created_at", label: dictionary.colCreated, type: "date" }
      ]}
      mobileCards
    />
  );
}
