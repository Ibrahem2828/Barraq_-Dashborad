"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { classMemberActionEndpoint, classMembersEndpoint, endpoints } from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import type { AnyRecord } from "@/types/api";

interface Member {
  id: number;
  user_email?: string;
  user_full_name?: string;
  status: string;
  joined_at?: string | null;
}

interface ClassOption {
  public_id: string;
  name: string;
  organization?: string;
}

/**
 * The members of one class, and the two things an operator does to them.
 *
 * Removal keeps the row and marks it removed: a learner who leaves and
 * comes back must not be blocked by their own history, and a class roster
 * with no record of who was in it last term is not a roster.
 *
 * Transfer offers only classes in the same organization. The backend
 * refuses a cross-organization move outright -- moving a learner between
 * schools is an enrolment decision, not a seating change -- so offering it
 * here would only produce an error the operator cannot act on.
 */
export function ClassMembersPanel({ classroom }: { classroom: AnyRecord }) {
  const dictionary = useDictionary();
  const publicId = String(classroom.public_id ?? "");
  const organization = String(classroom.organization ?? "");

  const [members, setMembers] = useState<Member[] | null>(null);
  const [siblings, setSiblings] = useState<ClassOption[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [target, setTarget] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ results?: Member[] } | Member[]>(
        classMembersEndpoint(publicId)
      );
      const payload = response.data as { results?: Member[] } | Member[];
      setMembers(Array.isArray(payload) ? payload : (payload.results ?? []));
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      setMembers([]);
    }
  }, [publicId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!organization) return;
    let cancelled = false;
    api
      .get<{ results?: ClassOption[] }>(endpoints.admin.classes, {
        organization,
        page_size: 100
      })
      .then((response) => {
        if (cancelled) return;
        // Same organization only, and never this class itself.
        setSiblings((response.data?.results ?? []).filter((row) => row.public_id !== publicId));
      })
      .catch(() => {
        if (!cancelled) setSiblings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [organization, publicId]);

  async function act(member: Member, action: "remove" | "transfer") {
    if (action === "remove" && !window.confirm(dictionary.removeMemberConfirm)) return;
    const targetClass = target[member.id];
    if (action === "transfer" && !targetClass) return;

    setBusy(member.id);
    try {
      await api.post(classMemberActionEndpoint(publicId, action), {
        membership: member.id,
        ...(action === "transfer" ? { target_classroom: targetClass } : {})
      });
      toast.success(action === "remove" ? dictionary.memberRemoved : dictionary.memberTransferred);
      await load();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setBusy(null);
    }
  }

  if (members === null) return <p>{dictionary.loading}</p>;

  return (
    <section aria-label={dictionary.members} className="flex flex-col gap-3">
      <h4>{dictionary.members}</h4>
      {members.length === 0 ? (
        <p className="muted">{dictionary.noMembers}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">{dictionary.colUser}</th>
              <th scope="col">{dictionary.status}</th>
              <th scope="col">{dictionary.actions}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const active = member.status === "active";
              return (
                <tr key={member.id}>
                  <td>
                    <strong>{member.user_full_name ?? "—"}</strong>
                    <br />
                    <small>{member.user_email ?? ""}</small>
                  </td>
                  <td>
                    <Badge value={member.status} />
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="danger"
                        disabled={!active || busy === member.id}
                        onClick={() => act(member, "remove")}
                      >
                        {dictionary.removeMember}
                      </Button>
                      {siblings.length > 0 ? (
                        <>
                          <label className="sr-only" htmlFor={`transfer-${member.id}`}>
                            {dictionary.transferTo}
                          </label>
                          <select
                            id={`transfer-${member.id}`}
                            value={target[member.id] ?? ""}
                            disabled={!active || busy === member.id}
                            onChange={(event) =>
                              setTarget((current) => ({
                                ...current,
                                [member.id]: event.target.value
                              }))
                            }
                          >
                            <option value="">{dictionary.transferTo}</option>
                            {siblings.map((option) => (
                              <option key={option.public_id} value={option.public_id}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="secondary"
                            disabled={!active || !target[member.id] || busy === member.id}
                            onClick={() => act(member, "transfer")}
                          >
                            {dictionary.transferMember}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
