/**
 * TelentFest Load Test Script
 * 
 * Prerequisites: Node.js 18+
 * 
 * Usage:
 *   node tests/load-test.js
 * 
 * This script tests the registration and pass system under concurrent load.
 * It uses native fetch() and Promise concurrency — no external dependencies.
 */

const TARGET_URL = process.env.TEST_URL || "http://localhost:3000";
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || "50", 10);
const TEST_DURATION_SECONDS = parseInt(process.env.TEST_DURATION || "30", 10);

const results = {
  totalRequests: 0,
  successful: 0,
  failed: 0,
  errors: [] as string[],
  durations: [] as number[],
};

async function fetchWithTiming(url: string, options?: RequestInit): Promise<Response> {
  const start = Date.now();
  try {
    const res = await fetch(url, options);
    results.durations.push(Date.now() - start);
    results.totalRequests++;
    if (res.ok) results.successful++;
    else results.failed++;
    return res;
  } catch (err: any) {
    results.totalRequests++;
    results.failed++;
    results.errors.push(`${url}: ${err.message}`);
    throw err;
  }
}

async function testEventList() {
  try {
    const res = await fetchWithTiming(`${TARGET_URL}/api/events`);
    const body = await res.text();
    return { ok: res.ok, bodyLength: body.length };
  } catch { return { ok: false, bodyLength: 0 }; }
}

async function testRegistrationPage() {
  try {
    const res = await fetchWithTiming(`${TARGET_URL}/entry-pass`);
    const body = await res.text();
    return { ok: res.ok, bodyLength: body.length };
  } catch { return { ok: false, bodyLength: 0 }; }
}

async function testVerifyPage() {
  try {
    const res = await fetchWithTiming(`${TARGET_URL}/verify-pass/dummy-test-id?t=test-token`);
    return { ok: true };
  } catch { return { ok: false }; }
}

async function simulateRegistration() {
  const phone = `+919000${String(1000 + Math.floor(Math.random() * 8999)).padStart(4, "0")}`;
  const email = `test${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;

  try {
    const res = await fetchWithTiming(`${TARGET_URL}/api/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Load",
        lastName: "Test",
        phone,
        email,
        aadhaar: "123456789012",
        aadhaarConsent: true,
        eventId: "test-event-id",
        activityCategoryId: "test-category-id",
        guest1Name: "",
        guest1Phone: "",
        guest2Name: "",
        guest2Phone: "",
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch { return { ok: false, status: 0 }; }
}

async function runScenario(name: string, fn: () => Promise<any>, users: number, durationSec: number) {
  console.log(`\n=== Scenario: ${name} (${users} users, ${durationSec}s) ===`);
  const startTime = Date.now();
  const userPromises: Promise<void>[] = [];

  for (let i = 0; i < users; i++) {
    userPromises.push(
      (async () => {
        const endTime = startTime + durationSec * 1000;
        while (Date.now() < endTime) {
          try { await fn(); } catch { /* ignore individual failures */ }
          // Small stagger to avoid thundering herd
          await new Promise((r) => setTimeout(r, Math.random() * 200));
        }
      })(),
    );
  }

  await Promise.all(userPromises);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Completed: ${results.totalRequests} requests in ${elapsed}s`);
  console.log(`  Successful: ${results.successful}`);
  console.log(`  Failed: ${results.failed}`);
  if (results.durations.length > 0) {
    const sorted = [...results.durations].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    console.log(`  Avg duration: ${avg.toFixed(0)}ms`);
    console.log(`  P50: ${sorted[Math.floor(sorted.length * 0.5)]}ms`);
    console.log(`  P95: ${sorted[Math.floor(sorted.length * 0.95)]}ms`);
    console.log(`  P99: ${sorted[Math.floor(sorted.length * 0.99)]}ms`);
  }
  if (results.errors.length > 0) {
    console.log(`  Errors (first 5): ${results.errors.slice(0, 5).join(", ")}`);
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("TelentFest Load Test");
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Concurrent users: ${CONCURRENT_USERS}`);
  console.log(`Test duration: ${TEST_DURATION_SECONDS}s`);
  console.log("=".repeat(60));

  // Scenario A: Event list
  await runScenario("Event list loading", testEventList, CONCURRENT_USERS, Math.min(TEST_DURATION_SECONDS, 15));

  // Scenario B: Registration form
  await runScenario("Registration form loading", testRegistrationPage, CONCURRENT_USERS, Math.min(TEST_DURATION_SECONDS, 15));

  // Scenario C: QR verification
  await runScenario("Pass verification", testVerifyPage, CONCURRENT_USERS, Math.min(TEST_DURATION_SECONDS, 10));

  // Scenario D: Registration creation (lower volume)
  await runScenario("Concurrent registrations", simulateRegistration, Math.min(CONCURRENT_USERS, 20), Math.min(TEST_DURATION_SECONDS, 10));

  console.log("\n" + "=".repeat(60));
  console.log("Load Test Complete");
  console.log(`Total requests: ${results.totalRequests}`);
  console.log(`Success rate: ${results.totalRequests > 0 ? ((results.successful / results.totalRequests) * 100).toFixed(1) : 0}%`);
  console.log("=".repeat(60));
}

main().catch(console.error);
