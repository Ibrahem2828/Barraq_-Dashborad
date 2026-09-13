"use client";

import type { FormField } from "@/components/data/ResourceFormModal";
import { valuesToPayload } from "@/components/data/ResourceFormModal";
import { ResourcePage } from "@/components/data/ResourcePage";
import { adminAssignRolesEndpoint, endpoints } from "@/lib/api/endpoints";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import type { AnyRecord } from "@/types/api";

function parseRoleCodes(input: string): string[] {
  return input
    .split(/[,،]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function AdminsPage() {
  const dictionary = useDictionary();
  const locale = useLocale();
  const join = locale === "en" ? ", " : "، ";

  const createFields: FormField[] = [
    { key: "email", label: dictionary.email, type: "email", required: true },
    { key: "full_name", label: dictionary.colName, required: true },
    { key: "phone_number", label: dictionary.phoneNumber },
    { key: "password", label: dictionary.password, type: "password", required: true, minLength: 8 },
    { key: "role_codes", label: dictionary.roleCodesHint, placeholder: dictionary.assignRolesPrompt },
    { key: "is_staff", label: dictionary.isStaff, type: "checkbox" },
    { key: "is_superuser", label: dictionary.superAdmin, type: "checkbox" }
  ];

  const editFields: FormField[] = [
    { key: "full_name", label: dictionary.colName, required: true },
    { key: "phone_number", label: dictionary.phoneNumber },
    { key: "is_active", label: dictionary.active, type: "checkbox" },
    { key: "is_staff", label: dictionary.isStaff, type: "checkbox" },
    { key: "is_superuser", label: dictionary.superAdmin, type: "checkbox" }
  ];

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
      createConfig={{
        title: dictionary.createAdmin,
        fields: createFields,
        toBody: (values) => {
          const payload = valuesToPayload(values, createFields.filter((field) => field.key !== "role_codes"));
          const role_codes = parseRoleCodes(String(values.role_codes ?? ""));
          if (role_codes.length) payload.role_codes = role_codes;
          return payload;
        }
      }}
      editConfig={{
        title: dictionary.editAdmin,
        fields: editFields,
        fromRow: (row: AnyRecord) => ({
          full_name: String(row.full_name ?? ""),
          phone_number: String(row.phone_number ?? ""),
          is_active: Boolean(row.is_active),
          is_staff: Boolean(row.is_staff),
          is_superuser: Boolean(row.is_superuser)
        })
      }}
      allowDelete
      deleteConfirm={dictionary.deleteAdminConfirm}
      mutationToasts={{
        createSuccess: dictionary.adminCreated,
        updateSuccess: dictionary.adminUpdated,
        deleteSuccess: dictionary.adminDeleted
      }}
      rowActions={[
        {
          label: dictionary.assignRoles,
          variant: "primary",
          endpoint: (row) => adminAssignRolesEndpoint(String(row.id)),
          successToast: dictionary.adminRolesAssigned,
          compose: {
            title: dictionary.assignRoles,
            label: dictionary.roleCodesHint,
            placeholder: dictionary.assignRolesPrompt,
            buildBody: (input) => {
              const role_codes = parseRoleCodes(input);
              if (!role_codes.length) throw new Error(dictionary.promptRequired);
              return { role_codes };
            }
          }
        }
      ]}
      columns={[
        { key: "id", label: "#", type: "number" },
        { key: "full_name", label: dictionary.colName, mobile: "title" },
        { key: "email", label: dictionary.colEmailShort, mobile: true },
        {
          key: "is_superuser",
          label: dictionary.superAdmin,
          render: (row) => (row.is_superuser ? dictionary.yes : dictionary.no)
        },
        {
          key: "roles",
          label: dictionary.colRoles,
          mobile: true,
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
          mobile: true,
          render: (row) => (row.is_active ? dictionary.active : dictionary.inactive)
        },
        { key: "created_at", label: dictionary.addedAt, type: "date" }
      ]}
      mobileCards
    />
  );
}
