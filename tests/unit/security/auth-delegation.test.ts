import { describe, expect, test } from "vitest";
import { AuthDelegation } from "../../../src/security/auth-delegation.js";

describe("AuthDelegation", () => {
  test("creates without Key Vault when KEY_VAULT_URL is not set", () => {
    const auth = new AuthDelegation();
    expect(auth).toBeDefined();
  });

  test("checkReadiness returns skipped when no Key Vault configured", async () => {
    const auth = new AuthDelegation();
    const result = await auth.checkReadiness();
    expect(result.keyVault).toBe("skipped");
  });
});
