"use client";

import { useEffect, useMemo, useState } from "react";

import { ResourcePage } from "@/components/data/ResourcePage";
import type { FormField } from "@/components/data/ResourceFormModal";
import { valuesToPayload } from "@/components/data/ResourceFormModal";
import { useAdmin } from "@/components/providers/AdminProvider";
import { endpoints, userActionEndpoint } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { api } from "@/lib/api/client";
import type { AnyRecord } from "@/types/api";

interface Option {
  label: string;
  value: string;
}

/** Rows from a list endpoint, paginated or not. */
function rowsOf(data: unknown): AnyRecord[] {
  if (Array.isArray(data)) return data as AnyRecord[];
  const results = (data as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? (results as AnyRecord[]) : [];
}

/**
 * Pickers are built from what the backend lists for this account, so a
 * scoped manager is only offered its own organizations and classes. That is
 * convenience: the backend re-checks every value against the caller's scope.
 */
function useCreateOptions(enabled: boolean, canListRoles: boolean) {
  const [organizations, setOrganizations] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [roles, setRoles] = useState<Option[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const listed = (endpoint: string) =>
      api
        .get<unknown>(endpoint, { page_size: 100 })
        .then((response) => rowsOf(response.data))
        .catch(() => [] as AnyRecord[]);

    void Promise.all([
      listed(endpoints.admin.organizations),
      listed(endpoints.admin.classes),
      canListRoles ? listed(endpoints.admin.roles) : Promise.resolve([] as AnyRecord[])
    ]).then(([orgRows, classRows, roleRows]) => {
      if (cancelled) return;
      const orgNames = new Map(orgRows.map((row) => [String(row.public_id), String(row.name ?? "")]));
      setOrganizations(orgRows.map((row) => ({ label: String(row.name ?? ""), value: String(row.public_id) })));
      setClasses(
        classRows
          .filter((row) => row.status !== "archived")
          .map((row) => {
            const orgName = orgNames.get(String(row.organization));
            const name = String(row.name ?? "");
            return { label: orgName ? `${orgName} — ${name}` : name, value: String(row.public_id) };
          })
      );
      // super_admin is a platform-wide grant: it is made on the admins page,
      // never as a side effect of adding a member to an organization.
      setRoles(
        roleRows
          .filter((row) => row.is_active !== false && row.code !== "super_admin")
          .map((row) => ({ label: String(row.name ?? row.code), value: String(row.code) }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, canListRoles]);

  return useMemo(() => ({ organizations, classes, roles }), [organizations, classes, roles]);
}

export default function UsersPage() {
  const dictionary = useDictionary();
  const { admin, can } = useAdmin();
  const canCreate = can("users.create");
  // A scoped manager can only add people to an organization it runs; the
  // backend refuses an organization-less account from it, so say so up front.
  const platformWide = Boolean(
    admin?.is_superuser || admin?.scopes?.some((scope) => scope.type === "global")
  );
  const canGrantRoles = can("admins.assign_roles") && can("roles.view");
  const options = useCreateOptions(canCreate, canGrantRoles);

  // Memoized: the form modal resets its values whenever `fields` changes identity.
  const createFields = useMemo<FormField[]>(() => [
    { key: "email", label: dictionary.email, type: "email", required: true },
    { key: "full_name", label: dictionary.colName, required: true },
    { key: "phone_number", label: dictionary.phoneNumber },
    { key: "password", label: dictionary.password, type: "password", required: true, minLength: 10 },
    {
      key: "organization",
      label: dictionary.colOrganization,
      type: "select",
      required: !platformWide,
      emptyLabel: platformWide ? dictionary.noOrganization : dictionary.chooseOrganization,
      options: options.organizations
    },
    {
      key: "classroom",
      label: dictionary.colClass,
      type: "select",
      emptyLabel: dictionary.noClass,
      options: options.classes
    },
    {
      key: "member_type",
      label: dictionary.memberType,
      type: "select",
      // Empty means the backend default, a student membership.
      emptyLabel: dictionary.memberTypeStudent,
      options: [{ label: dictionary.memberTypeStaff, value: "staff" }]
    },
    ...(canGrantRoles
      ? [
          {
            key: "role_code",
            label: dictionary.dashboardRole,
            type: "select" as const,
            emptyLabel: dictionary.noDashboardRole,
            options: options.roles
          }
        ]
      : [])
  ], [dictionary, options, canGrantRoles, platformWide]);

  const editFields: FormField[] = [
    { key: "full_name", label: dictionary.colName, required: true },
    { key: "phone_number", label: dictionary.phoneNumber },
    { key: "is_active", label: dictionary.active, type: "checkbox" }
  ];

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
      createConfig={
        canCreate
          ? {
              title: dictionary.createRecord,
              fields: createFields,
              toBody: (values) => {
                const payload = valuesToPayload(
                  values,
                  createFields.filter((field) => field.key !== "role_code")
                );
                const roleCode = String(values.role_code ?? "").trim();
                if (roleCode) payload.role_codes = [roleCode];
                return payload;
              }
            }
          : undefined
      }
      editConfig={{
        title: dictionary.editUser,
        fields: editFields,
        fromRow: (row) => ({
          full_name: String(row.full_name ?? ""),
          phone_number: String(row.phone_number ?? ""),
          is_active: Boolean(row.is_active)
        })
      }}
      mutationToasts={{
        createSuccess: dictionary.userCreated,
        updateSuccess: dictionary.userUpdated
      }}
      rowActions={[
        {
          label: dictionary.suspendAccount,
          variant: "danger",
          visible: (row) => Boolean(row.is_active),
          endpoint: (row) => userActionEndpoint(String(row.id), "suspend"),
          confirm: dictionary.suspendConfirm,
          successToast: dictionary.userSuspended
        },
        {
          label: dictionary.activateAccount,
          variant: "primary",
          visible: (row) => !Boolean(row.is_active),
          endpoint: (row) => userActionEndpoint(String(row.id), "activate"),
          successToast: dictionary.userActivated
        },
        {
          label: dictionary.cancelSubscription,
          variant: "danger",
          endpoint: (row) => userActionEndpoint(String(row.id), "cancel-subscription"),
          confirm: dictionary.cancelSubscriptionConfirm,
          successToast: dictionary.userSubscriptionCancelled
        },
        {
          label: dictionary.changeSubscription,
          variant: "secondary",
          endpoint: (row) => userActionEndpoint(String(row.id), "change-subscription"),
          ask: {
            message: dictionary.changeSubscriptionPrompt,
            buildBody: (input) => ({ plan_code: input })
          },
          successToast: dictionary.userSubscriptionChanged
        }
      ]}
      columns={[
        { key: "id", label: "#", type: "number" },
        { key: "email", label: dictionary.colEmailShort, mobile: true },
        { key: "full_name", label: dictionary.colName, mobile: "title" },
        { key: "role", label: dictionary.colRole, type: "status", mobile: true },
        {
          key: "is_active",
          label: dictionary.status,
          mobile: true,
          render: (row) => (row.is_active ? dictionary.active : dictionary.suspended)
        },
        { key: "sources_count", label: dictionary.colSources, type: "number" },
        { key: "study_plans_count", label: dictionary.colPlans, type: "number" },
        { key: "quizzes_count", label: dictionary.colQuizzes, type: "number" },
        { key: "created_at", label: dictionary.createdAt, type: "date" }
      ]}
      mobileCards
    />
  );
}
