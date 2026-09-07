"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { normalizeList } from "@/lib/api/normalize";
import type { AnyRecord, ListPayload, Paginated } from "@/types/api";

export interface ResourceQuery {
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export function useResource(endpoint: string, query: ResourceQuery) {
  const [data, setData] = useState<Paginated<AnyRecord>>({ count: 0, next: null, previous: null, results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api.get<ListPayload<AnyRecord>>(endpoint, query)
      .then((response) => { if (alive) setData(normalizeList(response.data)); })
      .catch((reason: unknown) => { if (alive) setError(reason instanceof Error ? reason.message : "تعذر تحميل البيانات"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryKey is query's stable identity; re-running on every new `query` object reference (not just on real changes) would refetch every render.
  }, [endpoint, revision, queryKey]);

  return { data, loading, error, reload };
}
