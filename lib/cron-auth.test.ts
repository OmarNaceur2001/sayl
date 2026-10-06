import { describe, expect, it } from "vitest";
import { hasValidCronAuthorization } from "./cron-auth";

describe("hasValidCronAuthorization", () => {
  it("rejects when the configured secret or authorization header is missing", () => {
    expect(hasValidCronAuthorization("Bearer secret", undefined)).toBe(false);
    expect(hasValidCronAuthorization(null, "secret")).toBe(false);
  });

  it("accepts only a bearer token that matches the configured secret", () => {
    expect(hasValidCronAuthorization("Bearer secret", "secret")).toBe(true);
    expect(hasValidCronAuthorization("bearer secret", "secret")).toBe(true);
    expect(hasValidCronAuthorization("secret", "secret")).toBe(false);
    expect(hasValidCronAuthorization("Basic secret", "secret")).toBe(false);
    expect(hasValidCronAuthorization("Bearer wrong", "secret")).toBe(false);
    expect(hasValidCronAuthorization("Bearer secret extra", "secret")).toBe(false);
  });
});
