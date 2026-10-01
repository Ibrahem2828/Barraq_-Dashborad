"use client";

import { useCallback, useEffect, useState } from "react";

import { ResourcePage } from "@/components/data/ResourcePage";
import {
  ScoreBadge,
  StudentPerformanceDetail,
  StudentPerformanceSummary,
  characterUse,
  type PerformanceFilters
} from "@/components/dashboard/StudentPerformance";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import type { AnyRecord } from "@/types/api";

interface Option {
  label: string;
  value: string;
}

function rowsOf(data: unknown): AnyRecord[] {
  if (Array.isArray(data)) return data as AnyRecord[];
  const results = (data as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? (results as AnyRecord[]) : [];
}

function names(value: unknown, separator: string): string {
  return Array.isArray(value) && value.length
    ? value.map((item) => String((item as AnyRecord).name ?? "")).join(separator)
    : "—";
}

/**
 * How an organization's students work: quizzes, scores and AI use.
 *
 * Pickers list only the organizations and classes the backend returns for
 * this account; the backend re-checks every filter against the caller's
 * scope (404 outside it), and reports AI use as metadata only.
 */
export default function StudentPerformancePage() {
  const dictionary = useDictionary();
  const locale = useLocale();
  const separator = locale === "en" ? ", " : "، ";
  const [filters, setFilters] = useState<PerformanceFilters>({});
  const [organizations, setOrganizations] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);

  useEffect(() => {
    let cancelled = false;
    const listed = (endpoint: string) =>
      api
        .get<unknown>(endpoint, { page_size: 100 })
        .then((response) => rowsOf(response.data))
        .catch(() => [] as AnyRecord[]);
    void Promise.all([listed(endpoints.admin.organizations), listed(endpoints.admin.classes)]).then(
      ([orgRows, classRows]) => {
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
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const onFiltersChange = useCallback((values: Record<string, string>) => setFilters({ ...values }), []);

  const filterConfig = [
    ...(organizations.length > 1
      ? [{ key: "organization", label: dictionary.colOrganization, options: organizations }]
      : []),
    ...(classes.length ? [{ key: "classroom", label: dictionary.colClass, options: classes }] : []),
    {
      key: "days",
      label: dictionary.perfPeriod,
      emptyLabel: dictionary.perfLast30,
      options: [
        { label: dictionary.perfLast7, value: "7" },
        { label: dictionary.perfLast90, value: "90" },
        { label: dictionary.perfLast365, value: "365" }
      ]
    }
  ];

  return (
    <>
      <ResourcePage
        title={dictionary.studentPerformance}
        description={dictionary.studentPerformanceDesc}
        endpoint={endpoints.admin.studentPerformance}
        filters={filterConfig}
        onFiltersChange={onFiltersChange}
        defaultOrdering="-last_ai"
        orderingOptions={[
          { label: dictionary.perfSortRecentAi, value: "-last_ai" },
          { label: dictionary.perfSortLowScore, value: "score" },
          { label: dictionary.perfSortHighScore, value: "-score" },
          { label: dictionary.perfSortMostQuizzes, value: "-quizzes" },
          { label: dictionary.perfSortMostAi, value: "-ai" },
          { label: dictionary.perfSortName, value: "name" }
        ]}
        emptyState={{ title: dictionary.perfEmptyTitle, description: dictionary.perfEmptyDesc }}
        hideDetailFields
        renderDetailExtra={(row) => <StudentPerformanceDetail row={row} filters={filters} />}
        summary={<StudentPerformanceSummary filters={filters} />}
        columns={[
          {
            key: "full_name",
            label: dictionary.perfStudent,
            mobile: "title",
            render: (row) => (
              <div className="user-cell">
                <span className="avatar" aria-hidden="true">
                  {String(row.full_name || row.email || "?").slice(0, 1)}
                </span>
                <span>
                  <strong>{String(row.full_name || "—")}</strong>
                  <small>{String(row.email ?? "")}</small>
                </span>
              </div>
            )
          },
          {
            key: "classes",
            label: dictionary.colClass,
            mobile: true,
            render: (row) => <span className="perf-nowrap">{names(row.classes, separator)}</span>
          },
          { key: "quizzes_submitted", label: dictionary.perfQuizzes, type: "number", mobile: true },
          {
            key: "average_score",
            label: dictionary.perfAverage,
            mobile: true,
            render: (row) => <ScoreBadge value={row.average_score} />
          },
          { key: "ai_requests", label: dictionary.perfAiRequests, type: "number" },
          {
            key: "ai_by_character",
            label: dictionary.perfAiUse,
            render: (row) => <span className="perf-nowrap">{characterUse(row.ai_by_character, " · ")}</span>
          },
          { key: "last_activity_at", label: dictionary.perfLastActivity, type: "date", mobile: true },
          {
            key: "needs_attention",
            label: dictionary.perfStatus,
            mobile: true,
            render: (row) =>
              row.needs_attention ? (
                <Badge value="failed" label={dictionary.perfNeedsAttentionBadge} />
              ) : (
                <Badge value="active" label={dictionary.perfOnTrack} />
              )
          }
        ]}
        mobileCards
      />
    </>
  );
}
