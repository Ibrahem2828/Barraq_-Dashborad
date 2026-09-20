import { describe, expect, it } from "vitest";

import { selectOverview } from "@/lib/auth/overview-scope";
import type { AdminScope } from "@/types/api";

const organizationScope: AdminScope = {
  type: "organization",
  organization: { public_id: "org-a", name: "School A" },
};

// A real class scope carries its organization too -- the backend attaches
// it so the UI can say which school the class belongs to. Testing against
// a stripped-down version would have hidden the bug this fixture found.
const classScope: AdminScope = {
  type: "class",
  classroom: { public_id: "class-a", name: "10-A" },
  organization: { public_id: "org-a", name: "School A" },
};

describe("which overview an operator sees", () => {
  it("sends a superuser to the platform overview", () => {
    expect(selectOverview({ is_superuser: true, scopes: [] })).toEqual({ kind: "platform" });
  });

  it("sends an explicitly global grant to the platform overview", () => {
    expect(selectOverview({ is_superuser: false, scopes: [{ type: "global" }] })).toEqual({
      kind: "platform",
    });
  });

  it("sends a scoped manager to their own organization", () => {
    // The regression this exists for: the platform overview is refused for
    // a scoped account, so routing them there turned a correct refusal into
    // a load failure on the first screen after signing in.
    const result = selectOverview({ is_superuser: false, scopes: [organizationScope] });

    expect(result).toEqual({ kind: "organization", organizations: [organizationScope] });
  });

  it("keeps every organization an operator reaches, so they can switch", () => {
    const second: AdminScope = {
      type: "organization",
      organization: { public_id: "org-b", name: "School B" },
    };

    const result = selectOverview({ is_superuser: false, scopes: [organizationScope, second] });

    expect(result).toEqual({ kind: "organization", organizations: [organizationScope, second] });
  });

  it("does not promote a scoped account to the platform overview", () => {
    for (const scopes of [[organizationScope], [classScope], [organizationScope, classScope]]) {
      expect(selectOverview({ is_superuser: false, scopes }).kind).not.toBe("platform");
    }
  });

  it("shows nothing rather than inventing numbers for an unscoped account", () => {
    expect(selectOverview({ is_superuser: false, scopes: [] })).toEqual({ kind: "none" });
    expect(selectOverview({ is_superuser: false, scopes: undefined })).toEqual({ kind: "none" });
    expect(selectOverview(null)).toEqual({ kind: "none" });
  });

  it("treats a class-only supervisor as having no organization to summarise", () => {
    // Even though the scope names an organization. It is there so the UI can
    // label the class, not because this account may total that school --
    // the backend refuses them the organization overview.
    expect(selectOverview({ is_superuser: false, scopes: [classScope] })).toEqual({ kind: "none" });
  });
});
