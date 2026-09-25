import type { AnyRecord } from "@/types/api";

/**
 * The value a record's detail URL is built from.
 *
 * Tenant resources (organizations, classes, join requests, AI jobs) are looked
 * up by `public_id` and their serializers return no `id` at all; everything
 * else uses the numeric `id`. ResourcePage built edit/delete URLs from `id`
 * alone, so editing a school sent PATCH admin/organizations/undefined/ -> 404.
 */
export function recordKey(row: AnyRecord | null | undefined): string | null {
  if (!row) return null;
  const key = row.public_id ?? row.id;
  if (key === undefined || key === null || key === "") return null;
  return String(key);
}
