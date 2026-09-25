import { describe, expect, it } from "vitest";
import { recordKey } from "@/lib/api/record-key";
import { detailEndpoint } from "@/lib/api/endpoints";

/**
 * Editing a school sent PATCH admin/organizations/undefined/ (404): the shared
 * ResourcePage built detail URLs from `id`, but organizations and classes are
 * looked up by `public_id` and carry no `id`.
 */
describe("recordKey", () => {
  it("uses public_id for tenant resources that have no id", () => {
    const school = { public_id: "3f1c2d4e-0000-4000-8000-000000000001", name: "مدرسة" };
    expect(recordKey(school)).toBe(school.public_id);
    expect(detailEndpoint("admin/organizations/", recordKey(school)!)).not.toContain("undefined");
  });

  it("prefers public_id when a record carries both", () => {
    expect(recordKey({ id: 7, public_id: "abc" })).toBe("abc");
  });

  it("falls back to the numeric id everywhere else", () => {
    expect(recordKey({ id: 12, name: "Admin" })).toBe("12");
    expect(recordKey({ id: 0 })).toBe("0");
  });

  it("returns null instead of the string 'undefined' when there is no key", () => {
    expect(recordKey({ name: "no key" })).toBeNull();
    expect(recordKey(null)).toBeNull();
    expect(recordKey({ public_id: "" })).toBeNull();
  });
});
