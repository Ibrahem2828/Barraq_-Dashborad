"use client";

import { useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useResource } from "@/components/data/useResource";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { AnyRecord, Locale } from "@/types/api";

export interface Column {
  key: string;
  label: string;
  type?: "text" | "date" | "status" | "number" | "user" | "json";
  render?: (row: AnyRecord) => ReactNode;
}

export interface RowAction {
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  visible?: (row: AnyRecord) => boolean;
  endpoint: (row: AnyRecord) => string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: (row: AnyRecord) => unknown;
  confirm?: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

function valueAt(row: AnyRecord, key: string): unknown {
  return key.split(".").reduce<unknown>(
    (current, part) => (current && typeof current === "object" ? (current as AnyRecord)[part] : undefined),
    row
  );
}

function localeTag(locale: Locale) {
  return locale === "en" ? "en-US" : "ar-SY";
}

function formatValue(
  value: unknown,
  type: Column["type"],
  dictionary: Dictionary,
  locale: Locale
): ReactNode {
  const tag = localeTag(locale);
  if (value === null || value === undefined || value === "") return <span className="muted">—</span>;
  if (type === "status") return <Badge value={value} />;
  if (type === "date") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" });
  }
  if (type === "number") return Number(value).toLocaleString(tag);
  if (type === "user" && typeof value === "object") {
    const user = value as AnyRecord;
    return (
      <div className="user-cell">
        <span className="avatar" aria-hidden="true">
          {String(user.full_name ?? user.email ?? "?").slice(0, 1)}
        </span>
        <span>
          <strong>{String(user.full_name ?? "—")}</strong>
          <small>{String(user.email ?? "")}</small>
        </span>
      </div>
    );
  }
  if (type === "json") return <code className="json-preview">{JSON.stringify(value)}</code>;
  if (typeof value === "boolean") return value ? dictionary.yes : dictionary.no;
  if (Array.isArray(value)) return value.join(locale === "en" ? ", " : "، ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ResourcePage({
  title,
  description,
  endpoint,
  columns,
  filters = [],
  rowActions = [],
  defaultOrdering = "-created_at",
  pageSize = 20
}: {
  title: string;
  description: string;
  endpoint: string;
  columns: Column[];
  filters?: FilterConfig[];
  rowActions?: RowAction[];
  defaultOrdering?: string;
  pageSize?: number;
}) {
  const dictionary = useDictionary();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ordering, setOrdering] = useState(defaultOrdering);
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<AnyRecord | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useMemo(
    () => ({ search, ordering, page, page_size: pageSize, ...filterValues }),
    [search, ordering, page, pageSize, filterValues]
  );
  const { data, loading, error, reload } = useResource(endpoint, query);
  const pages = Math.max(1, Math.ceil(data.count / pageSize));

  async function executeAction(action: RowAction, row: AnyRecord) {
    if (action.confirm && !window.confirm(action.confirm)) return;
    const key = `${action.label}-${String(row.id ?? row.public_id ?? "record")}`;
    setActionBusy(key);
    setActionError(null);
    try {
      const target = action.endpoint(row);
      const method = action.method ?? "POST";
      if (method === "PATCH") await api.patch(target, action.body?.(row) ?? {});
      else if (method === "DELETE") await api.delete(target);
      else await api.post(target, action.body?.(row));
      setSelected(null);
      reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setActionBusy(null);
    }
  }

  const visibleActions = selected ? rowActions.filter((action) => action.visible?.(selected) ?? true) : [];

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="secondary" onClick={reload}>
            <Icon name="refresh" />
            {dictionary.refresh}
          </Button>
        }
      />
      <Card>
        {actionError ? (
          <div className="inline-error" role="alert">
            {actionError}
          </div>
        ) : null}
        <form
          className="toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <label className="search-box">
            <Icon name="search" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={dictionary.searchRecords}
              aria-label={dictionary.searchRecordsAria}
            />
            <button type="submit">{dictionary.searchAction}</button>
          </label>
          <div className="filters">
            {filters.map((filter) => (
              <label key={filter.key}>
                <span>{filter.label}</span>
                <select
                  value={filterValues[filter.key] ?? ""}
                  aria-label={filter.label}
                  onChange={(event) => {
                    setPage(1);
                    setFilterValues((current) => ({ ...current, [filter.key]: event.target.value }));
                  }}
                >
                  <option value="">{dictionary.all}</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              <span>{dictionary.ordering}</span>
              <select
                value={ordering}
                aria-label={dictionary.ordering}
                onChange={(event) => {
                  setPage(1);
                  setOrdering(event.target.value);
                }}
              >
                <option value="-created_at">{dictionary.newest}</option>
                <option value="created_at">{dictionary.oldest}</option>
                <option value="id">{dictionary.idAsc}</option>
                <option value="-id">{dictionary.idDesc}</option>
              </select>
            </label>
          </div>
        </form>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data.results.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} scope="col">
                      {column.label}
                    </th>
                  ))}
                  <th className="actions-column" scope="col">
                    {dictionary.actions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((row, index) => (
                  <tr key={String(row.id ?? row.public_id ?? index)}>
                    {columns.map((column) => (
                      <td key={column.key}>
                        {column.render ? column.render(row) : formatValue(valueAt(row, column.key), column.type, dictionary, locale)}
                      </td>
                    ))}
                    <td>
                      <button type="button" className="table-action" onClick={() => setSelected(row)}>
                        <Icon name="eye" />
                        {dictionary.details}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="pagination">
          <span>
            {data.count.toLocaleString(localeTag(locale))} {dictionary.records}
          </span>
          <div>
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              {dictionary.previous}
            </Button>
            <span>
              {dictionary.page} {page} {dictionary.pageOf} {pages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= pages}
              onClick={() => setPage((value) => Math.min(pages, value + 1))}
            >
              {dictionary.next}
            </Button>
          </div>
        </footer>
      </Card>
      <Modal open={Boolean(selected)} title={dictionary.recordDetails} onClose={() => setSelected(null)}>
        {selected ? (
          <>
            <dl className="record-details">
              {Object.entries(selected).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>
                    {formatValue(
                      value,
                      typeof value === "object"
                        ? "json"
                        : key.includes("date") || key.endsWith("_at")
                          ? "date"
                          : key === "status"
                            ? "status"
                            : "text",
                      dictionary,
                      locale
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {visibleActions.length ? (
              <div className="record-actions">
                {visibleActions.map((action) => {
                  const key = `${action.label}-${String(selected.id ?? selected.public_id ?? "record")}`;
                  return (
                    <Button
                      key={action.label}
                      variant={action.variant ?? "secondary"}
                      disabled={actionBusy !== null}
                      onClick={() => executeAction(action, selected)}
                    >
                      {actionBusy === key ? dictionary.executing : action.label}
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : null}
      </Modal>
    </>
  );
}
