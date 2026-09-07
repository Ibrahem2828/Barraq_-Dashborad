"use client";

import { TabbedResources } from "@/components/data/TabbedResources";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function AIResultsPage() {
  const dictionary = useDictionary();

  const common = [
    { key: "id", label: "#", type: "number" as const },
    { key: "user", label: dictionary.colUser, type: "user" as const },
    { key: "source", label: dictionary.colSource },
    { key: "created_at", label: dictionary.createdAt, type: "date" as const }
  ];

  return (
    <TabbedResources
      tabs={[
        {
          id: "recommendations",
          label: dictionary.rasheedTab,
          title: dictionary.rasheedTitle,
          description: dictionary.rasheedDesc,
          endpoint: endpoints.admin.aiRecommendations,
          columns: [
            ...common,
            { key: "title", label: dictionary.colTitle },
            { key: "priority", label: dictionary.priority, type: "status" },
            {
              key: "is_read",
              label: dictionary.isRead,
              render: (row) => (row.is_read ? dictionary.yes : dictionary.no)
            }
          ]
        },
        {
          id: "summaries",
          label: dictionary.kholasaTab,
          title: dictionary.kholasaTitle,
          description: dictionary.kholasaDesc,
          endpoint: endpoints.admin.aiSummaries,
          columns: [
            ...common,
            { key: "title", label: dictionary.colTitle },
            { key: "summary_type", label: dictionary.summaryLevel, type: "status" },
            { key: "status", label: dictionary.status, type: "status" }
          ]
        },
        {
          id: "transcriptions",
          label: dictionary.sadaTab,
          title: dictionary.sadaTitle,
          description: dictionary.sadaDesc,
          endpoint: endpoints.admin.aiTranscriptions,
          columns: [
            ...common,
            { key: "language", label: dictionary.language },
            {
              key: "duration_seconds",
              label: dictionary.duration,
              render: (row) => `${Math.round(Number(row.duration_seconds ?? 0))} ${dictionary.secondsShort}`
            },
            { key: "status", label: dictionary.status, type: "status" }
          ]
        }
      ]}
    />
  );
}
