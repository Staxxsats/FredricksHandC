/**
 * Phase 1 exit-criterion journey, in a phone-sized browser:
 * homeowner submits a request -> owner signs in and acts on the saved lead.
 *
 * Requires the app running (npm run dev or npm start) with demo data (npm run db:seed-dev).
 *   BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = await import("playwright"));
}

const BASE = process.env.BASE_URL || "http://localhost:3000";
const PW = process.env.DEV_STAFF_PASSWORD || "dev-password-change-me";
const SHOTS = process.env.SHOTS_DIR || "tests/e2e/screens";
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(["PASS", name]);
    console.log("PASS", name);
  } catch (e) {
    results.push(["FAIL", name]);
    console.log("FAIL", name, "\n   ", e.message.split("\n")[0]);
  }
}
function assert(c, m) {
  if (!c) throw new Error(m);
}

const browser = await chromium.launch();
const fakeIp = `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
const phone = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, extraHTTPHeaders: { "x-forwarded-for": fakeIp } });
const p = await phone.newPage();
let ref = "";
const uniquePhone = `404555${String(Math.floor(1000 + Math.random() * 8999))}`;

await step("homepage renders with request CTA, no tel: links while phone is unset", async () => {
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  assert(await p.getByRole("heading", { level: 1, name: /Call Frederick's/ }).isVisible(), "hero h1 missing");
  assert((await p.locator('a[href^="tel:"]').count()) === 0, "found a tel: link without a configured phone");
  assert(!(await p.content()).match(/Augustus|Call Gus/i), "legacy brand name found");
  await p.screenshot({ path: `${SHOTS}/01-home-375.png` });
});

await step("issue card pre-selects the request flow", async () => {
  await p.getByRole("link", { name: /No heat/ }).first().click();
  await p.waitForURL(/\/book\?issue=no-heat/);
  assert(await p.locator('input[name="issue"][value="no-heat"]').isChecked(), "issue not preselected");
});

await step("safety language appears for a gas smell", async () => {
  await p.fill("#f-notes", "I think I smell gas near the furnace");
  assert(await p.getByText("Safety first").isVisible(), "safety panel not shown");
  await p.screenshot({ path: `${SHOTS}/02-safety-375.png`, fullPage: true });
  await p.fill("#f-notes", "Furnace clicks but no heat comes out.");
});

await step("validation errors are announced and block progress", async () => {
  await p.getByRole("button", { name: "Continue" }).click();
  await p.getByRole("button", { name: "Continue" }).click(); // step 2 empty
  assert(await p.getByRole("alert").filter({ hasText: "Please fix" }).isVisible(), "error summary missing");
  assert((await p.locator("#f-zip").getAttribute("aria-invalid")) === "true", "zip not marked invalid");
});

await step("out-of-area ZIP gets an honest message and no form", async () => {
  await p.fill("#f-zip", "90210");
  await p.getByText("No", { exact: true }).click();
  await p.getByText("I'm flexible", { exact: true }).click();
  await p.getByRole("button", { name: "Continue" }).click();
  await p.getByRole("heading", { name: "We're not in your area yet" }).waitFor();
  assert(await p.getByText(/not currently taking service requests in/).isVisible(), "out-of-area copy missing");
  await p.screenshot({ path: `${SHOTS}/03-out-of-area-375.png` });
  await p.getByRole("button", { name: "Try a different ZIP" }).click();
});

await step("in-area request completes all 5 steps", async () => {
  await p.fill("#f-zip", "30078");
  await p.getByRole("button", { name: "Continue" }).click();
  await p.getByRole("heading", { name: "Your system and timing" }).waitFor();
  await p.selectOption("#f-systemType", "not_sure");
  await p.getByText("Home I live in").click();
  await p.fill("#f-street", "100 Demo Lane");
  await p.fill("#f-city", "Snellville");
  await p.selectOption("#f-preferredWindow", "morning");
  assert(await p.getByText("(request only)").isVisible(), "preferred time not labeled request-only");
  await p.screenshot({ path: `${SHOTS}/04-step3-375.png`, fullPage: true });
  await p.getByRole("button", { name: "Continue" }).click();
  await p.fill("#f-name", "Demo Homeowner");
  await p.fill("#f-phone", uniquePhone);
  await p.getByText("I own it").click();
  assert(!(await p.locator('input[type="checkbox"]').nth(1).isChecked()), "marketing consent pre-checked");
  await p.getByText(/may contact me by phone/).click();
  await p.screenshot({ path: `${SHOTS}/05-step4-375.png`, fullPage: true });
  await p.getByRole("button", { name: "Continue" }).click();
  await p.getByRole("heading", { name: "Review and send" }).waitFor();
});

await step("network failure shows 'Not sent'; retry succeeds without duplicate", async () => {
  // The server rejects forms completed in under 4s as bot traffic; a real person is never that fast.
  await p.waitForTimeout(4500);
  await p.route("**/api/requests", (r) => r.abort("failed"));
  await p.getByRole("button", { name: "Send request" }).click();
  await p.getByText("Not sent", { exact: true }).waitFor({ timeout: 10000 });
  assert(!(await p.getByText("Request received").isVisible()), "claimed success during failure");
  await p.screenshot({ path: `${SHOTS}/06-network-fail-375.png`, fullPage: true });
  await p.unroute("**/api/requests");
  await p.getByRole("button", { name: "Try again" }).click();
  await p.getByText("Request received").waitFor();
  ref = (await p.locator("strong.font-mono").innerText()).trim();
  assert(/^FHC-[A-Z0-9]{6}$/.test(ref), "bad ref " + ref);
  assert(await p.getByText("This is not a confirmed appointment yet.").isVisible(), "missing not-confirmed notice");
  assert(!(await p.getByText(/you're booked|appointment confirmed/i).count()), "false booking language");
  await p.screenshot({ path: `${SHOTS}/07-received-375.png`, fullPage: true });
});

await step("unauthenticated visitor cannot see leads", async () => {
  const anon = await browser.newContext();
  const a = await anon.newPage();
  await a.goto(BASE + "/admin");
  assert(a.url().includes("/admin/login"), "admin not protected: " + a.url());
  const r = await a.request.get(BASE + "/admin/leads/00000000-0000-0000-0000-000000000000", { maxRedirects: 0 });
  assert([302, 303, 307, 308].includes(r.status()) || (await r.text()).includes("Staff sign in"), "lead page reachable anonymously");
  await anon.close();
});

const office = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { "x-forwarded-for": fakeIp } });
const o = await office.newPage();
let leadUrl = "";

await step("owner signs in and sees the new lead in the inbox", async () => {
  await o.goto(BASE + "/admin/login");
  await o.fill("#email", "owner@example.test");
  await o.fill("#password", PW);
  await o.getByRole("button", { name: "Sign in" }).click();
  await o.waitForURL(BASE + "/admin");
  const link = o.getByRole("link", { name: ref });
  await link.waitFor();
  await o.screenshot({ path: `${SHOTS}/08-inbox.png` });
  await link.click();
  await o.waitForURL(/\/admin\/leads\//);
  leadUrl = o.url();
  assert(await o.getByText("Demo Homeowner").isVisible(), "customer not shown");
  assert((await o.locator("text=lead.created").count()) === 1, "exactly one lead.created audit expected");
});

await step("owner moves lead new -> contacted -> qualified -> confirmed, with audit", async () => {
  await o.getByRole("button", { name: "Mark contacted" }).click();
  await o.getByText("Status updated").waitFor();
  await o.getByRole("button", { name: "Mark qualified" }).click();
  await o.getByText("Status updated").waitFor();
  await o.fill("#when-confirmed", "2026-11-12T09:00");
  await o.getByRole("button", { name: "Confirm appointment" }).click();
  await o.getByText(/Confirmed for Nov 12, 9:00 AM/).waitFor();
  for (const t of ["new → contacted", "contacted → qualified", "qualified → confirmed"]) {
    assert(await o.getByText(t).isVisible(), "audit missing " + t);
  }
  await o.screenshot({ path: `${SHOTS}/09-lead-confirmed.png`, fullPage: true });
});

await step("technician cannot open an unassigned lead", async () => {
  const tc = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": fakeIp } });
  const t = await tc.newPage();
  await t.goto(BASE + "/admin/login");
  await t.fill("#email", "tech@example.test");
  await t.fill("#password", PW);
  await t.getByRole("button", { name: "Sign in" }).click();
  await t.waitForURL(BASE + "/admin");
  assert(!(await t.getByText(ref).count()), "tech sees unassigned lead in list");
  const res = await t.goto(leadUrl);
  assert(res.status() === 404, "tech got status " + res.status());
  await tc.close();
});

await step("no horizontal scroll at 320/375/430/768/1440 on key pages", async () => {
  const bad = [];
  for (const w of [320, 375, 430, 768, 1440]) {
    const c = await browser.newContext({ viewport: { width: w, height: 800 } });
    const pg = await c.newPage();
    for (const path of ["/", "/book", "/heating", "/cooling", "/repairs", "/maintenance", "/service-area", "/about", "/contact", "/privacy"]) {
      await pg.goto(BASE + path, { waitUntil: "networkidle" });
      const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w) bad.push(`${path}@${w}=${sw}`);
    }
    await c.close();
  }
  assert(!bad.length, bad.join(", "));
});

await step("sitemap, robots and health endpoints respond", async () => {
  for (const path of ["/sitemap.xml", "/robots.txt", "/api/health"]) {
    const r = await o.request.get(BASE + path);
    assert(r.ok(), path + " " + r.status());
  }
});

await browser.close();
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed. Reference used: ${ref}`);
process.exit(failed ? 1 : 0);
