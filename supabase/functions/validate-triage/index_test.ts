import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("validate-triage - should return 401 without auth", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-triage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      triageCaseId: "test-case-id",
      action: "confirm",
      validatedESI: 3,
    }),
  });

  assertEquals(response.status, 401);
  await response.text();
});

Deno.test("validate-triage - should handle OPTIONS preflight", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-triage`, {
    method: "OPTIONS",
  });

  assertEquals(response.status, 200);
  assertExists(response.headers.get("access-control-allow-origin"));
  await response.text();
});

Deno.test("validate-triage - should require triageCaseId", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-triage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action: "confirm" }),
  });

  const status = response.status;
  await response.text();
  assertEquals(status >= 400, true);
});

Deno.test("validate-triage - override requires rationale", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-triage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      triageCaseId: "test-case-id",
      action: "override",
      validatedESI: 2,
      // Missing overrideRationale
    }),
  });

  const status = response.status;
  await response.text();
  assertEquals(status >= 400, true);
});
