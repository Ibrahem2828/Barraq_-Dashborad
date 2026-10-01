"use client";

import { useEffect, useMemo, useState } from "react";

import { LibraryUploadModal, type AudienceOption, type Option } from "@/components/data/LibraryUploadModal";
import { ResourcePage } from "@/components/data/ResourcePage";
import { useAdmin } from "@/components/providers/AdminProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { detailEndpoint, endpoints } from "@/lib/api/endpoints";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import type { AnyRecord } from "@/types/api";

function rowsOf(data: unknown): AnyRecord[] {
  if (Array.isArray(data)) return data as AnyRecord[];
  const results = (data as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? (results as AnyRecord[]) : [];
}

const characterLabels: Record<string, string> = {
  fahes: "فاحص",
  kholasa: "خُلاصة",
  khota: "خُطى",
  sada: "صدى"
};

/**
 * Classroom Shared Library: files a school or a class shares with its
 * students. Targets offered for upload are only those the backend lists for
 * this account; it re-checks each one against the caller's scope.
 */
export default function ClassLibraryPage() {
  const dictionary = useDictionary();
  const locale = useLocale();
  const { can } = useAdmin();
  const canManage = can("library.manage");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [organizations, setOrganizations] = useState<AnyRecord[]>([]);
  const [classes, setClasses] = useState<AnyRecord[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);

  useEffect(() => {
    let cancelled = false;
    const listed = (endpoint: string) =>
      api
        .get<unknown>(endpoint, { page_size: 100 })
        .then((response) => rowsOf(response.data))
        .catch(() => [] as AnyRecord[]);
    void Promise.all([
      listed(endpoints.admin.organizations),
      listed(endpoints.admin.classes),
      listed(endpoints.admin.subjects)
    ]).then(([orgRows, classRows, subjectRows]) => {
      if (cancelled) return;
      setOrganizations(orgRows);
      setClasses(classRows.filter((row) => row.status !== "archived"));
      setSubjects(
        subjectRows
          .filter((row) => row.is_active !== false)
          .map((row) => ({
            value: String(row.id),
            label: row.grade_level ? `${String(row.name)} — ${String(row.grade_level)}` : String(row.name)
          }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo<Option[]>(
    () => [
      { value: "handout", label: dictionary.libCatHandout },
      { value: "worksheet", label: dictionary.libCatWorksheet },
      { value: "past_exam", label: dictionary.libCatPastExam },
      { value: "recording", label: dictionary.libCatRecording },
      { value: "other", label: dictionary.libCatOther }
    ],
    [dictionary]
  );
  const categoryLabel = useMemo(() => new Map(categories.map((c) => [c.value, c.label])), [categories]);

  const audiences = useMemo<AudienceOption[]>(() => {
    const orgNames = new Map(organizations.map((row) => [String(row.public_id), String(row.name ?? "")]));
    return [
      ...organizations.map((row) => ({
        value: `org:${String(row.public_id)}`,
        label: `${dictionary.libWholeOrganization} — ${String(row.name ?? "")}`
      })),
      ...classes.map((row) => {
        const orgName = orgNames.get(String(row.organization));
        return {
          value: `class:${String(row.public_id)}`,
          label: orgName ? `${orgName} — ${String(row.name ?? "")}` : String(row.name ?? "")
        };
      })
    ];
  }, [organizations, classes, dictionary]);

  const separator = locale === "en" ? ", " : "، ";
  const tag = locale === "en" ? "en-US" : "ar-SY";

  return (
    <>
      <ResourcePage
        title={dictionary.classLibrary}
        description={dictionary.classLibraryDesc}
        endpoint={endpoints.admin.classLibrary}
        reloadKey={reloadKey}
        headerActions={
          canManage ? (
            <Button onClick={() => setUploadOpen(true)}>{dictionary.libUpload}</Button>
          ) : null
        }
        filters={[
          ...(classes.length
            ? [
                {
                  key: "classroom",
                  label: dictionary.colClass,
                  options: classes.map((row) => ({ label: String(row.name ?? ""), value: String(row.public_id) }))
                }
              ]
            : []),
          { key: "category", label: dictionary.libCategory, options: categories },
          {
            key: "status",
            label: dictionary.status,
            options: [
              { label: dictionary.libStatusActive, value: "active" },
              { label: dictionary.libStatusArchived, value: "archived" }
            ]
          }
        ]}
        emptyState={{ title: dictionary.libEmptyTitle, description: dictionary.libEmptyDesc }}
        allowDelete={canManage}
        deleteConfirm={dictionary.libDeleteConfirm}
        mutationToasts={{ deleteSuccess: dictionary.libDeleted }}
        rowActions={
          canManage
            ? [
                {
                  label: dictionary.libArchive,
                  variant: "secondary",
                  method: "PATCH",
                  visible: (row) => row.status === "active",
                  endpoint: (row) => detailEndpoint(endpoints.admin.classLibrary, String(row.public_id)),
                  body: () => ({ status: "archived" }),
                  successToast: dictionary.libArchived
                },
                {
                  label: dictionary.libRestore,
                  variant: "primary",
                  method: "PATCH",
                  visible: (row) => row.status === "archived",
                  endpoint: (row) => detailEndpoint(endpoints.admin.classLibrary, String(row.public_id)),
                  body: () => ({ status: "active" }),
                  successToast: dictionary.libRestored
                }
              ]
            : []
        }
        columns={[
          {
            key: "title",
            label: dictionary.libTitleLabel,
            mobile: "title",
            render: (row) => (
              <span className="lib-title">
                <strong>{String(row.title ?? "")}</strong>
                <small className="muted">{String(row.original_filename ?? "")}</small>
              </span>
            )
          },
          {
            key: "category",
            label: dictionary.libCategory,
            mobile: true,
            render: (row) => <Badge value="info" label={categoryLabel.get(String(row.category)) ?? String(row.category)} />
          },
          {
            key: "classroom_name",
            label: dictionary.libAudienceCol,
            mobile: true,
            render: (row) => (
              <span className="perf-nowrap">
                {row.classroom_name
                  ? `${String(row.organization_name ?? "")} — ${String(row.classroom_name)}`
                  : `${dictionary.libWholeOrganization} — ${String(row.organization_name ?? "")}`}
              </span>
            )
          },
          { key: "subject_name", label: dictionary.libSubject },
          {
            key: "file_size",
            label: dictionary.libSize,
            render: (row) => {
              const bytes = Number(row.file_size ?? 0);
              return bytes < 1024 * 1024
                ? `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(tag)} ${dictionary.libKb}`
                : `${(bytes / (1024 * 1024)).toLocaleString(tag, { maximumFractionDigits: 1 })} ${dictionary.libMb}`;
            }
          },
          {
            key: "characters",
            label: dictionary.libCharacters,
            render: (row) =>
              Array.isArray(row.characters) && row.characters.length
                ? row.characters.map((c) => characterLabels[String(c)] ?? String(c)).join(separator)
                : "—"
          },
          { key: "uploaded_by_name", label: dictionary.libUploadedBy },
          {
            key: "status",
            label: dictionary.status,
            mobile: true,
            render: (row) =>
              row.status === "active" ? (
                <Badge value="active" label={dictionary.libStatusActive} />
              ) : (
                <Badge value="inactive" label={dictionary.libStatusArchived} />
              )
          },
          {
            key: "download",
            label: dictionary.libDownload,
            render: (row) => (
              <a
                className="lib-download"
                href={`/api/bff/${endpoints.admin.classLibrary}${String(row.public_id)}/download/`}
                download
              >
                {dictionary.libDownload}
              </a>
            )
          },
          { key: "created_at", label: dictionary.createdAt, type: "date", mobile: true }
        ]}
        mobileCards
      />
      <LibraryUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => setReloadKey((key) => key + 1)}
        audiences={audiences}
        subjects={subjects}
        categories={categories}
      />
    </>
  );
}
