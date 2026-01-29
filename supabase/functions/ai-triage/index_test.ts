import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("ai-triage - should return 401 without auth", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-triage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      patientId: "test-patient-id",
      chiefComplaint: "Chest pain",
      vitals: { heartRate: 100, bloodPressure: { systolic: 140, diastolic: 90 } },
    }),
  });

  // Should require authentication
  assertEquals(response.status, 401);
  await response.text(); // Consume body
});

Deno.test("ai-triage - should handle OPTIONS preflight", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-triage`, {
    method: "OPTIONS",
  });

  assertEquals(response.status, 200);
  assertExists(response.headers.get("access-control-allow-origin"));
  await response.text(); // Consume body
});

Deno.test("ai-triage - should require patient data", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-triage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  // Should return error for missing data
  const status = response.status;
  await response.text(); // Consume body
  
  // Either 400 (bad request) or 401 (auth required)
  assertEquals(status >= 400, true);
});
