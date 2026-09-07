"use client";

import { TabbedResources } from "@/components/data/TabbedResources";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function EducationPage() {
  const dictionary = useDictionary();

  return (
    <TabbedResources
      tabs={[
        {
          id: "stages",
          label: dictionary.stagesTab,
          title: dictionary.stagesTitle,
          description: dictionary.stagesDesc,
          endpoint: endpoints.admin.educationStages,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "name", label: dictionary.colName },
            { key: "code", label: dictionary.colCode },
            { key: "order", label: dictionary.ordering, type: "number" },
            {
              key: "is_active",
              label: dictionary.status,
              render: (row) => (row.is_active ? dictionary.active : dictionary.inactive)
            }
          ]
        },
        {
          id: "subjects",
          label: dictionary.subjectsTab,
          title: dictionary.subjectsTitle,
          description: dictionary.subjectsDesc,
          endpoint: endpoints.admin.subjects,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "name", label: dictionary.colSubject },
            { key: "code", label: dictionary.colCode },
            { key: "stage_name", label: dictionary.colStage },
            { key: "color", label: dictionary.colColor },
            {
              key: "is_active",
              label: dictionary.status,
              render: (row) => (row.is_active ? dictionary.active : dictionary.inactive)
            }
          ]
        }
      ]}
    />
  );
}
