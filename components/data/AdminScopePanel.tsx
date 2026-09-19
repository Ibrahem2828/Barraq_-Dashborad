"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { adminAssignRolesEndpoint, endpoints } from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import type { AnyRecord } from "@/types/api";

interface Option {
  public_id: string;
  name: string;
}

type ScopeType = "global" | "organization" | "class";

function parseRoleCodes(input: string): string[] {
  return input
    .split(/[,،]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Assigning a role and choosing the data it applies to, in one place.
 *
 * They belong together because the backend now refuses to guess: a scoped
 * operator must say what they are granting, and nobody can grant reach they
 * do not already hold. A text box that could only name roles would leave a
 * scoped manager unable to delegate at all, and would quietly re-create the
 * assumption this phase removed -- that every assignment means "the whole
 * platform".
 *
 * The pickers are filled from what the backend returns for this operator, so
 * they offer only what it would accept. The rule still lives on the server;
 * this just avoids presenting choices that are going to be refused.
 */
export function AdminScopePanel({
  admin,
  onAssigned
}: {
  admin: AnyRecord;
  onAssigned: () => void | Promise<void>;
}) {
  const dictionary = useDictionary();
  const [roleCodes, setRoleCodes] = useState("");
  const [scopeType, setScopeType] = useState<ScopeType>("organization");
  const [target, setTarget] = useState("");
  const [organizations, setOrganizations] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<{ results?: Option[] }>(endpoints.admin.organizations, { page_size: 100 }),
      api.get<{ results?: Option[] }>(endpoints.admin.classes, { page_size: 200 })
    ])
      .then(([orgs, cls]) => {
        if (cancelled) return;
        setOrganizations(orgs.data?.results ?? []);
        setClasses(cls.data?.results ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setOrganizations([]);
          setClasses([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const targets = scopeType === "class" ? classes : organizations;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const codes = parseRoleCodes(roleCodes);
    if (!codes.length) {
      setError(dictionary.promptRequired);
      return;
    }
    if (scopeType !== "global" && !target) {
      setError(dictionary.promptRequired);
      return;
    }

    const scope =
      scopeType === "global"
        ? { scope_type: "global" }
        : scopeType === "organization"
          ? { scope_type: "organization", organization: target }
          : { scope_type: "class", classroom: target };

    setBusy(true);
    setError(null);
    try {
      await api.post(adminAssignRolesEndpoint(String(admin.id)), {
        role_codes: codes,
        scopes: [scope]
      });
      toast.success(dictionary.adminRolesAssigned);
      setRoleCodes("");
      await onAssigned();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label={dictionary.assignRoles} className="flex flex-col gap-3">
      <h4>{dictionary.assignRoles}</h4>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <label className="flex flex-col gap-1">
          <span>{dictionary.roleCodesHint}</span>
          <input
            value={roleCodes}
            placeholder={dictionary.assignRolesPrompt}
            onChange={(event) => setRoleCodes(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span>{dictionary.yourScope}</span>
          <select
            value={scopeType}
            onChange={(event) => {
              setScopeType(event.target.value as ScopeType);
              setTarget("");
            }}
          >
            <option value="organization">{dictionary.scopeOrganization}</option>
            <option value="class">{dictionary.scopeClass}</option>
            <option value="global">{dictionary.scopeGlobal}</option>
          </select>
        </label>

        {scopeType === "global" ? null : (
          <label className="flex flex-col gap-1">
            <span>
              {scopeType === "class" ? dictionary.colClass : dictionary.colOrganization}
            </span>
            <select value={target} onChange={(event) => setTarget(event.target.value)}>
              <option value="">—</option>
              {targets.map((option) => (
                <option key={option.public_id} value={option.public_id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {error ? <p role="alert">{error}</p> : null}
        <div>
          <Button type="submit" disabled={busy}>
            {dictionary.assignRoles}
          </Button>
        </div>
      </form>
    </section>
  );
}
