"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { paidPlanOptions, type PlanOption } from "@/lib/subscriptions/activation";
import type { AnyRecord } from "@/types/api";

function rowsOf(data: unknown): AnyRecord[] {
  if (Array.isArray(data)) return data as AnyRecord[];
  const results = (data as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? (results as AnyRecord[]) : [];
}

/**
 * The paid plans an operator may activate, read from the live catalogue so
 * the list never drifts from what the backend will accept. When the catalogue
 * cannot be read (an account without `subscription_plans.view`), the list is
 * empty and the form falls back to typing the plan code; the backend still
 * validates it either way.
 */
export function useActivationPlans(enabled: boolean): PlanOption[] {
  const [options, setOptions] = useState<PlanOption[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    api
      .get<unknown>(endpoints.admin.subscriptionPlans, { page_size: 100 })
      .then((response) => {
        if (!cancelled) setOptions(paidPlanOptions(rowsOf(response.data)));
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return options;
}
