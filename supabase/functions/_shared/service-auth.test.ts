import { describe, expect, it } from "vitest";
import { hasExactServiceCredential } from "./service-auth";

describe("hasExactServiceCredential", () => {
  it("accepts an exact configured bearer", () => {
    expect(hasExactServiceCredential("Bearer cron-secret", ["cron-secret", "service-key"])).toBe(true);
    expect(hasExactServiceCredential("Bearer service-key", ["cron-secret", "service-key"])).toBe(true);
  });

  it("rejects an unsigned JWT that merely claims service_role", () => {
    const forged = "eyJhbGciOiJub25lIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.";
    expect(hasExactServiceCredential(`Bearer ${forged}`, ["real-service-key"])).toBe(false);
  });

  it("never lets empty configuration authenticate an empty bearer", () => {
    expect(hasExactServiceCredential("Bearer ", [""])).toBe(false);
    expect(hasExactServiceCredential(null, [""])).toBe(false);
  });

  it("rejects malformed schemes, suffixes, and embedded whitespace", () => {
    expect(hasExactServiceCredential("bearer service-key", ["service-key"])).toBe(false);
    expect(hasExactServiceCredential("Bearer service-key extra", ["service-key"])).toBe(false);
    expect(hasExactServiceCredential("Bearer service-key ", ["service-key"])).toBe(false);
    expect(hasExactServiceCredential("service-key", ["service-key"])).toBe(false);
  });
});
