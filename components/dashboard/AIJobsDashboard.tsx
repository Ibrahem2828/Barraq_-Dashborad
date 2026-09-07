"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ResourcePage } from "@/components/data/ResourcePage";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";

interface Metrics {
  total: number;
  by_status: Array<{ status: string; count: number }>;
  by_character: Array<{ character: string; count: number }>;
  feedback_count: number;
  average_rating: number | null;
}

const emptyMetrics: Metrics = {
  total: 0,
  by_status: [],
  by_character: [],
  feedback_count: 0,
  average_rating: null
};

function normalizeMetrics(payload: Partial<Metrics> | null | undefined): Metrics {
  return {
    total: Number(payload?.total ?? 0),
    by_status: Array.isArray(payload?.by_status) ? payload.by_status : [],
    by_character: Array.isArray(payload?.by_character) ? payload.by_character : [],
    feedback_count: Number(payload?.feedback_count ?? 0),
    average_rating: typeof payload?.average_rating === "number" ? payload.average_rating : null
  };
}

/** Product character names stay brand-fixed. */
const characters = [
  { id: "fahes", name: "فاحص", image: "/brand/characters/fahes-removebg-preview.png", tone: "blue" },
  { id: "khota", name: "خُطى", image: "/brand/characters/khota-removebg-preview.png", tone: "red" },
  { id: "rasheed", name: "رشيد", image: "/brand/characters/rasheed-removebg-preview.png", tone: "green" },
  { id: "kholasa", name: "خُلاصة", image: "/brand/characters/kholasa-removebg-preview.png", tone: "pink" },
  { id: "sada", name: "صدى", image: "/brand/characters/sada-removebg-preview.png", tone: "purple" }
];

export function AIJobsDashboard() {
  const dictionary = useDictionary();
  const locale = useLocale();
  const numberLocale = locale === "en" ? "en-US" : "ar-SY";
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    api
      .get<Partial<Metrics>>(endpoints.admin.aiJobMetrics)
      .then((response) => setMetrics(normalizeMetrics(response.data)))
      .catch(() => setMetrics(null));
  }, []);

  const safe = metrics ?? emptyMetrics;
  const counts = new Map(safe.by_character.map((item) => [item.character, item.count]));

  return (
    <>
      <div className="character-grid">
        {characters.map((character) => (
          <Card key={character.id} interactive className={`character-card character-card--${character.tone}`}>
            <Image src={character.image} alt={character.name} width={92} height={92} />
            <div>
              <span>{character.name}</span>
              <strong>{(counts.get(character.id) ?? 0).toLocaleString(numberLocale)}</strong>
              <small>{dictionary.recordedJobs}</small>
            </div>
          </Card>
        ))}
      </div>
      {metrics ? (
        <Card className="ai-metrics-strip">
          <div>
            <span>{dictionary.totalJobs}</span>
            <strong>{safe.total.toLocaleString(numberLocale)}</strong>
          </div>
          <div>
            <span>{dictionary.feedbackCount}</span>
            <strong>{safe.feedback_count.toLocaleString(numberLocale)}</strong>
          </div>
          <div>
            <span>{dictionary.avgSatisfaction}</span>
            <strong>{safe.average_rating ? `${safe.average_rating.toFixed(2)} / 5` : "—"}</strong>
          </div>
          <div className="status-summary">
            {safe.by_status.map((item) => (
              <Badge key={item.status} value={item.status} label={`${item.status}: ${item.count}`} />
            ))}
          </div>
        </Card>
      ) : null}
      <ResourcePage
        title={dictionary.aiJobs}
        description={dictionary.aiJobsDesc}
        endpoint={endpoints.admin.aiJobs}
        filters={[
          {
            key: "status",
            label: dictionary.status,
            options: ["created", "queued", "submitted", "processing", "validating", "completed", "failed", "canceled"].map(
              (value) => ({
                label: value,
                value
              })
            )
          },
          {
            key: "character",
            label: dictionary.character,
            options: characters.map((item) => ({ label: item.name, value: item.id }))
          }
        ]}
        columns={[
          { key: "public_id", label: dictionary.jobId },
          { key: "character", label: dictionary.character, type: "status" },
          { key: "task_type", label: dictionary.taskType },
          { key: "status", label: dictionary.status, type: "status" },
          { key: "external_job_id", label: dictionary.externalJobId },
          { key: "result_type", label: dictionary.resultType },
          { key: "error_code", label: dictionary.errorCode },
          { key: "created_at", label: dictionary.createdAt, type: "date" },
          { key: "completed_at", label: dictionary.completedAt, type: "date" }
        ]}
        rowActions={[
          {
            label: dictionary.cancelJob,
            variant: "danger",
            visible: (row) => !["completed", "failed", "canceled"].includes(String(row.status)),
            endpoint: (row) => `${endpoints.admin.aiJobs}${row.public_id}/cancel/`,
            confirm: dictionary.cancelJobConfirm
          }
        ]}
      />
    </>
  );
}
