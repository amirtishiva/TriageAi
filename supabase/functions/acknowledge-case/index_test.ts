import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("acknowledge-case - should return 401 without auth", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/acknowledge-case`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      triageCaseId: "test-case-id",
    }),
  });

  assertEquals(response.status, 401);
  await response.text();
});

Deno.test("acknowledge-case - should handle OPTIONS preflight", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/acknowledge-case`, {
    method: "OPTIONS",
  });

  assertEquals(response.status, 200);
  assertExists(response.headers.get("access-control-allow-origin"));
  await response.text();
});

Deno.test("acknowledge-case - should require triageCaseId", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/acknowledge-case`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  const status = response.status;
  await response.text();
  assertEquals(status >= 400, true);
});

Deno.test("acknowledge-case - should reject non-existent case", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/acknowledge-case`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      triageCaseId: "00000000-0000-0000-0000-000000000000",
    }),
  });

  const status = response.status;
  await response.text();
  // Should fail - either 404 or 403 (unauthorized for non-existent case)
  assertEquals(status >= 400, true);
});
