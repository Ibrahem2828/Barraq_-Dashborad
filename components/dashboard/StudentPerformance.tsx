"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import { detailEndpoint, endpoints } from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import { dashboardKeys } from "@/lib/query/keys";

/** Brand names: the same in both languages (as on the AI usage page). */
export const characterLabels: Record<string, string> = {
  fahes: "فاحص",
  khota: "خُطى",
  rasheed: "رشيد",
  kholasa: "خُلاصة",
  sada: "صدى"
};

export const characterOrder = ["fahes", "kholasa", "rasheed", "khota", "sada"] as const;

export type PerformanceFilters = Record<string, string>;

interface Summary {
  period_days: number;
  students_count: number;
  active_students: number;
  needs_attention: number;
  quizzes_submitted: number;
  average_score: number | null;
  ai_requests: number;
  ai_completed: number;
  ai_failed: number;
  ai_by_character: Record<string, number>;
  score_distribution: Record<string, number>;
}

interface RecentAttempt {
  quiz_title: string;
  subject: string | null;
  percentage: number | null;
  correct_answers_count: number;
  wrong_answers_count: number;
  unanswered_count: number;
  duration_seconds: number | null;
  submitted_at: string | null;
}

interface RecentAIActivity {
  character: string;
  task_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface Detail {
  period_days: number;
  recent_attempts: RecentAttempt[];
  recent_ai_activity: RecentAIActivity[];
}

/** Only the filters the API understands; empty values are left to its defaults. */
export function performanceParams(filters: PerformanceFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const key of ["organization", "classroom", "days"]) {
    if (filters[key]) params[key] = filters[key];
  }
  return params;
}

/** A score as a coloured badge: green from 70, amber from 50, red below. */
export function formatPercent(value: number, locale: string): string {
  return (value / 100).toLocaleString(locale === "en" ? "en-US" : "ar-SY", {
    style: "percent",
    maximumFractionDigits: 1
  });
}

export function ScoreBadge({ value }: { value: unknown }) {
  const locale = useLocale();
  if (value === null || value === undefined || value === "") return <span className="muted">—</span>;
  const score = Number(value);
  const tone = score >= 70 ? "completed" : score >= 50 ? "pending" : "failed";
  return <Badge value={tone} label={formatPercent(score, locale)} />;
}

export function taskLabel(task: string, dictionary: Dictionary): string {
  const labels: Record<string, string> = {
    fahes_generate_quiz: dictionary.perfTaskQuiz,
    khota_generate_plan: dictionary.perfTaskPlan,
    rasheed_recommendations: dictionary.perfTaskRecommendations,
    kholasa_generate_summary: dictionary.perfTaskSummary,
    sada_transcribe_audio: dictionary.perfTaskTranscription
  };
  return labels[task] ?? task;
}

/** Finished states read in the operator's language; in-flight ones say "pending". */
export function jobStatusLabel(status: string, dictionary: Dictionary): string {
  if (status === "completed") return dictionary.completed;
  if (status === "failed") return dictionary.failed;
  if (status === "canceled") return dictionary.statusCanceledJob;
  return dictionary.pending;
}

export function placementNames(value: unknown, separator: string): string {
  return Array.isArray(value) && value.length
    ? value.map((item) => String((item as Record<string, unknown>).name ?? "")).join(separator)
    : "—";
}

/** "فاحص 3 · خُلاصة 1" -- only the characters the student actually used. */
export function characterUse(counts: unknown, separator: string): string {
  if (!counts || typeof counts !== "object") return "—";
  const used = characterOrder
    .map((key) => [key, Number((counts as Record<string, unknown>)[key] ?? 0)] as const)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${characterLabels[key]} ${count}`);
  return used.length ? used.join(separator) : "—";
}

function useQueryRetry() {
  return (failureCount: number, reason: unknown) => {
    if (isUnauthorizedError(reason)) return false;
    return failureCount < 1;
  };
}

export function StudentPerformanceSummary({ filters }: { filters: PerformanceFilters }) {
  const dictionary = useDictionary();
  const locale = useLocale();
  const numberLocale = locale === "en" ? "en-US" : "ar-SY";
  const params = performanceParams(filters);
  const retry = useQueryRetry();

  const result = useQuery({
    queryKey: [...dashboardKeys.studentPerformanceSummary, params],
    queryFn: async () => (await api.get<Summary>(endpoints.admin.studentPerformanceSummary, params)).data,
    retry
  });

  if (result.isPending) {
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }
  if (result.error) {
    if (isUnauthorizedError(result.error)) return null;
    return (
      <ErrorState
        message={result.error instanceof Error ? result.error.message : dictionary.loadFailed}
        onRetry={() => void result.refetch()}
      />
    );
  }

  const summary = result.data;
  if (!summary) return null;
  const period = `${dictionary.perfInPeriod} ${summary.period_days.toLocaleString(numberLocale)} ${dictionary.perfDaysWord}`;
  // MetricCard formats bare numbers in Arabic; hand it the operator's locale instead.
  const count = (value: number) => value.toLocaleString(numberLocale);
  const average = summary.average_score === null ? "—" : formatPercent(summary.average_score, locale);
  const distribution: Array<[string, string, string]> = [
    ["85_plus", dictionary.perf85plus, "completed"],
    ["70_84", dictionary.perf70to84, "completed"],
    ["50_69", dictionary.perf50to69, "pending"],
    ["below_50", dictionary.perfBelow50, "failed"],
    ["no_quizzes", dictionary.perfNoQuizzes, "neutral"]
  ];
  const maxBucket = Math.max(1, ...distribution.map(([key]) => summary.score_distribution[key] ?? 0));
  const maxCharacter = Math.max(1, ...characterOrder.map((key) => summary.ai_by_character[key] ?? 0));

  return (
    <>
      <div className="metrics-grid">
        <MetricCard title={dictionary.perfStudents} value={count(summary.students_count)} detail={dictionary.perfInScope} icon="users" tone="purple" />
        <MetricCard title={dictionary.perfActive} value={count(summary.active_students)} detail={period} icon="users" tone="green" />
        <MetricCard
          title={dictionary.perfNeedsAttention}
          value={count(summary.needs_attention)}
          detail={dictionary.perfNeedsAttentionBadge}
          icon="support"
          tone="red"
        />
        <MetricCard title={dictionary.perfAverage} value={average} detail={period} icon="quiz" tone="blue" />
        <MetricCard title={dictionary.perfQuizzes} value={count(summary.quizzes_submitted)} detail={period} icon="quiz" tone="gold" />
        <MetricCard title={dictionary.perfAiRequests} value={count(summary.ai_requests)} detail={period} icon="spark" tone="pink" />
      </div>

      <div className="ai-usage-grid perf-grid">
        <Card className="perf-panel">
          <header>
            <h3>{dictionary.perfDistribution}</h3>
          </header>
          <ul className="perf-bars">
            {distribution.map(([key, label, tone]) => {
              const count = summary.score_distribution[key] ?? 0;
              return (
                <li key={key}>
                  <span>{label}</span>
                  <div className="perf-bar-track" aria-hidden="true">
                    <div className={`perf-bar perf-bar--${tone}`} style={{ inlineSize: `${(count / maxBucket) * 100}%` }} />
                  </div>
                  <strong>{count.toLocaleString(numberLocale)}</strong>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="perf-panel">
          <header>
            <h3>{dictionary.perfByCharacter}</h3>
          </header>
          <ul className="perf-bars">
            {characterOrder.map((key) => {
              const count = summary.ai_by_character[key] ?? 0;
              return (
                <li key={key}>
                  <span>{characterLabels[key]}</span>
                  <div className="perf-bar-track" aria-hidden="true">
                    <div className={`perf-bar perf-bar--${key}`} style={{ inlineSize: `${(count / maxCharacter) * 100}%` }} />
                  </div>
                  <strong>{count.toLocaleString(numberLocale)}</strong>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}

export function StudentPerformanceDetail({ row, filters }: { row: Record<string, unknown>; filters: PerformanceFilters }) {
  const studentId = String(row.id);
  const dictionary = useDictionary();
  const locale = useLocale();
  const tag = locale === "en" ? "en-US" : "ar-SY";
  const separator = locale === "en" ? ", " : "، ";
  const params = performanceParams(filters);
  const retry = useQueryRetry();

  const result = useQuery({
    queryKey: ["dashboard", "student-performance", studentId, params],
    queryFn: async () =>
      (await api.get<Detail>(detailEndpoint(endpoints.admin.studentPerformance, studentId), params)).data,
    retry
  });

  const when = (value: string | null) =>
    value ? new Date(value).toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" }) : "—";

  if (result.isPending) return <LoadingState />;
  if (result.error) {
    return (
      <ErrorState
        message={result.error instanceof Error ? result.error.message : dictionary.loadFailed}
        onRetry={() => void result.refetch()}
      />
    );
  }
  const detail = result.data;
  if (!detail) return null;

  return (
    <div className="perf-detail">
      <header className="perf-detail__head">
        <div className="user-cell">
          <span className="avatar" aria-hidden="true">
            {String(row.full_name || row.email || "?").slice(0, 1)}
          </span>
          <span>
            <strong>{String(row.full_name || "—")}</strong>
            <small>{String(row.email ?? "")}</small>
          </span>
        </div>
        {row.needs_attention ? (
          <Badge value="failed" label={dictionary.perfNeedsAttentionBadge} />
        ) : (
          <Badge value="active" label={dictionary.perfOnTrack} />
        )}
      </header>
      <dl className="perf-facts">
        <div>
          <dt>{dictionary.colClass}</dt>
          <dd>{placementNames(row.classes, separator)}</dd>
        </div>
        <div>
          <dt>{dictionary.perfQuizzes}</dt>
          <dd>{Number(row.quizzes_submitted ?? 0).toLocaleString(tag)}</dd>
        </div>
        <div>
          <dt>{dictionary.perfAverage}</dt>
          <dd>
            <ScoreBadge value={row.average_score} />
          </dd>
        </div>
        <div>
          <dt>{dictionary.perfAiRequests}</dt>
          <dd>{Number(row.ai_requests ?? 0).toLocaleString(tag)}</dd>
        </div>
        <div>
          <dt>{dictionary.perfAiUse}</dt>
          <dd>{characterUse(row.ai_by_character, " · ")}</dd>
        </div>
        <div>
          <dt>{dictionary.perfLastActivity}</dt>
          <dd>{when(typeof row.last_activity_at === "string" ? row.last_activity_at : null)}</dd>
        </div>
      </dl>
      <p className="muted perf-privacy">{dictionary.perfPrivacyNote}</p>

      <h4>{dictionary.perfRecentAttempts}</h4>
      {detail.recent_attempts.length === 0 ? (
        <p className="muted">{dictionary.perfNoAttempts}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{dictionary.perfQuiz}</th>
                <th scope="col">{dictionary.perfScore}</th>
                <th scope="col">{dictionary.perfCorrectWrong}</th>
                <th scope="col">{dictionary.perfDuration}</th>
                <th scope="col">{dictionary.perfSubmittedAt}</th>
              </tr>
            </thead>
            <tbody>
              {detail.recent_attempts.map((attempt, index) => (
                <tr key={`${attempt.submitted_at}-${index}`}>
                  <td>
                    <strong>{attempt.quiz_title}</strong>
                    {attempt.subject ? <small className="muted"> · {attempt.subject}</small> : null}
                  </td>
                  <td>
                    <ScoreBadge value={attempt.percentage} />
                  </td>
                  <td>
                    {attempt.correct_answers_count} / {attempt.wrong_answers_count}
                  </td>
                  <td>
                    {attempt.duration_seconds
                      ? `${Math.max(1, Math.round(attempt.duration_seconds / 60))} ${dictionary.perfMinutesShort}`
                      : "—"}
                  </td>
                  <td>{when(attempt.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h4>{dictionary.perfRecentAi}</h4>
      {detail.recent_ai_activity.length === 0 ? (
        <p className="muted">{dictionary.perfNoAi}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{dictionary.perfCharacter}</th>
                <th scope="col">{dictionary.perfTask}</th>
                <th scope="col">{dictionary.status}</th>
                <th scope="col">{dictionary.perfRequestedAt}</th>
              </tr>
            </thead>
            <tbody>
              {detail.recent_ai_activity.map((job, index) => (
                <tr key={`${job.created_at}-${index}`}>
                  <td>{characterLabels[job.character] ?? job.character}</td>
                  <td>{taskLabel(job.task_type, dictionary)}</td>
                  <td>
                    <Badge value={job.status} label={jobStatusLabel(job.status, dictionary)} />
                  </td>
                  <td>{when(job.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
