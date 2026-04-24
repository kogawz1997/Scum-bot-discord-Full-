import { describe, expect, it } from "vitest";
import {
  OWNER_BASE_PATH,
  OWNER_LOGIN_PATH,
  OWNER_PAGE_KEYS,
  OWNER_PAGE_PATHS,
  buildOwnerPagePath,
  resolveOwnerRouteFromPath,
  resolveOwnerPageFromPath,
  resolveOwnerPrototypeRoute,
} from "./owner-routes.js";

describe("owner-routes", () => {
  it("keeps the owner login surface separate from the dashboard surface", () => {
    expect(resolveOwnerPrototypeRoute("/")).toBe("dashboard");
    expect(resolveOwnerPrototypeRoute(OWNER_LOGIN_PATH)).toBe("login");
  });

  it("accepts a trailing slash for the login surface", () => {
    expect(resolveOwnerPrototypeRoute(`${OWNER_LOGIN_PATH}/`)).toBe("login");
    expect(resolveOwnerPrototypeRoute("/owner/login/")).toBe("login");
  });

  it("defines a stable URL path for every owner page", () => {
    expect(OWNER_PAGE_KEYS).toEqual([
      "overview",
      "tenants",
      "create-tenant",
      "tenant-dossier",
      "packages",
      "package-detail",
      "billing",
      "invoice-detail",
      "payment-attempt-detail",
      "subscriptions",
      "subscription-detail",
      "fleet",
      "fleet-diagnostics",
      "runtime-detail",
      "observability",
      "diagnostics-evidence",
      "incidents",
      "support",
      "support-context",
      "recovery",
      "backup-detail",
      "security",
      "access-posture",
      "settings",
      "platform-controls",
      "automation",
      "profile",
    ]);

    expect(OWNER_PAGE_PATHS.overview).toBe(OWNER_BASE_PATH);
    expect(OWNER_PAGE_PATHS.tenants).toBe("/owner/tenants");
    expect(OWNER_PAGE_PATHS["create-tenant"]).toBe("/owner/tenants/new");
    expect(OWNER_PAGE_PATHS.packages).toBe("/owner/packages");
    expect(OWNER_PAGE_PATHS.billing).toBe("/owner/billing");
    expect(OWNER_PAGE_PATHS.fleet).toBe("/owner/runtime");
    expect(OWNER_PAGE_PATHS.observability).toBe("/owner/observability");
    expect(OWNER_PAGE_PATHS.settings).toBe("/owner/settings");
    expect(OWNER_PAGE_PATHS.profile).toBe("/owner/profile");

    for (const page of OWNER_PAGE_KEYS) {
      expect(buildOwnerPagePath(page)).toBe(OWNER_PAGE_PATHS[page]);
      expect(resolveOwnerPageFromPath(OWNER_PAGE_PATHS[page])).toBe(page);
    }
  });

  it("uses overview for root and unknown page paths", () => {
    expect(resolveOwnerPageFromPath("/")).toBe("overview");
    expect(resolveOwnerPageFromPath("/unknown")).toBe("overview");
    expect(buildOwnerPagePath("missing")).toBe("/owner");
  });

  it("supports detail URLs with selected record ids", () => {
    expect(resolveOwnerRouteFromPath("/owner/tenants/tenant-a")).toEqual({
      page: "tenant-dossier",
      recordId: "tenant-a",
    });
    expect(resolveOwnerRouteFromPath("/owner/billing/invoice/inv-42")).toEqual({
      page: "invoice-detail",
      recordId: "inv-42",
    });
    expect(resolveOwnerRouteFromPath("/owner/runtime/agents-bots/runtime-7")).toEqual({
      page: "runtime-detail",
      recordId: "runtime-7",
    });
    expect(buildOwnerPagePath("tenant-dossier", "tenant-a")).toBe("/owner/tenants/tenant-a");
    expect(buildOwnerPagePath("invoice-detail", "inv-42")).toBe("/owner/billing/invoice/inv-42");
    expect(buildOwnerPagePath("runtime-detail", "runtime-7")).toBe("/owner/runtime/agents-bots/runtime-7");
  });

  it("keeps legacy owner-web URLs usable inside the new owner prototype", () => {
    expect(resolveOwnerRouteFromPath("/owner")).toEqual({ page: "overview", recordId: "" });
    expect(resolveOwnerRouteFromPath("/owner/runtime")).toEqual({ page: "fleet", recordId: "" });
    expect(resolveOwnerRouteFromPath("/owner/billing/attempts")).toEqual({ page: "billing", recordId: "" });
    expect(resolveOwnerRouteFromPath("/overview")).toEqual({ page: "overview", recordId: "" });
    expect(resolveOwnerRouteFromPath("/packages")).toEqual({ page: "packages", recordId: "" });
    expect(resolveOwnerRouteFromPath("/owner/tenants/tenant-a")).toEqual({
      page: "tenant-dossier",
      recordId: "tenant-a",
    });
    expect(resolveOwnerRouteFromPath("/owner/billing/invoice/inv-42")).toEqual({
      page: "invoice-detail",
      recordId: "inv-42",
    });
    expect(resolveOwnerRouteFromPath("/owner/runtime/agents-bots/runtime-7")).toEqual({
      page: "runtime-detail",
      recordId: "runtime-7",
    });
  });
});
