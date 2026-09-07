"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function SupportPage() {
  const dictionary = useDictionary();

  return (
    <ResourcePage
      title={dictionary.support}
      description={dictionary.supportDesc}
      endpoint={endpoints.admin.supportTickets}
      filters={[
        {
          key: "status",
          label: dictionary.status,
          options: [
            { label: dictionary.ticketOpen, value: "open" },
            { label: dictionary.ticketInProgress, value: "in_progress" },
            { label: dictionary.ticketResolved, value: "resolved" },
            { label: dictionary.ticketClosed, value: "closed" }
          ]
        },
        {
          key: "priority",
          label: dictionary.priority,
          options: [
            { label: dictionary.priorityLow, value: "low" },
            { label: dictionary.priorityMedium, value: "medium" },
            { label: dictionary.priorityHigh, value: "high" },
            { label: dictionary.priorityUrgent, value: "urgent" }
          ]
        }
      ]}
      rowActions={[
        {
          label: dictionary.markResolved,
          variant: "primary",
          visible: (row) => !["resolved", "closed"].includes(String(row.status)),
          endpoint: (row) => `${endpoints.admin.supportTickets}${row.id}/`,
          method: "PATCH",
          body: () => ({ status: "resolved" })
        },
        {
          label: dictionary.closeTicket,
          variant: "danger",
          visible: (row) => String(row.status) !== "closed",
          endpoint: (row) => `${endpoints.admin.supportTickets}${row.id}/`,
          method: "PATCH",
          body: () => ({ status: "closed" }),
          confirm: dictionary.closeTicketConfirm
        }
      ]}
      columns={[
        { key: "id", label: "#", type: "number" },
        { key: "user", label: dictionary.colUser, type: "user" },
        { key: "subject", label: dictionary.colTopic },
        { key: "category", label: dictionary.colCategory, type: "status" },
        { key: "priority", label: dictionary.priority, type: "status" },
        { key: "status", label: dictionary.status, type: "status" },
        { key: "messages_count", label: dictionary.colMessages, type: "number" },
        { key: "created_at", label: dictionary.colCreated, type: "date" },
        { key: "updated_at", label: dictionary.colUpdated, type: "date" }
      ]}
    />
  );
}
