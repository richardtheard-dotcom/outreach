// Run: PW=<path to playwright-core> node tests/e2e.js   (headless Chromium over file://)
const { chromium } = require(process.env.PW || "playwright-core");
const path = require("path");
const os = require("os");
const root = path.resolve(__dirname, "..");
const url = f => "file:///" + path.join(root, f).replace(/\\/g, "/");
let fails = 0;
const check = (name, ok, extra) => { if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : " :: " + extra)); };

(async () => {
  const exe = process.env.CHROME || path.join(os.homedir(), "AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe");
  const browser = await chromium.launch({ executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  let dialog = false;
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));
  page.on("dialog", async d => { if (d.type() === "alert") dialog = true; await d.accept(); });

  for (const f of ["index.html", "checkin.html", "results.html", "dashboard.html"]) {
    await page.goto(url(f));
    check("loads " + f, (await page.title()).length > 0);
    check("nav highlight " + f, await page.locator(".nav-link.is-active").count() === 1 || f === "results.html");
  }
  check("no console errors on load", errors.length === 0, errors.join("|"));
  check("theme toggle persists", await (async () => {
    await page.goto(url("index.html"));
    await page.click("#theme-toggle");
    const t1 = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.goto(url("checkin.html"));
    const t2 = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.click("#theme-toggle");
    return t1 === t2;
  })());

  // Wizard validation
  await page.goto(url("checkin.html"));
  await page.fill("#email", "not-an-email");
  await page.click("#next-btn");
  check("bad email rejected", /email/i.test(await page.textContent("#step-error")) && await page.locator("#email").count() === 1);
  await page.fill("#email", "");
  await page.click("#next-btn");
  check("empty email rejected", (await page.textContent("#step-error")).length > 0);
  await page.fill("#email", "<img/src=x/onerror=alert(1)>@example.com");
  await page.click("#next-btn");
  check("moves to stress step", await page.locator('input[name="stress"]').count() === 5);
  check("focus on step heading", await page.evaluate(() => document.activeElement.id) === "step-title");
  await page.click("#next-btn");
  check("missing stress rejected", /face|stress/i.test(await page.textContent("#step-error")));
  await page.click('label[for="stress-0"]');
  await page.click("#next-btn");
  await page.click('label[for="struggling-2"]'); await page.click("#next-btn");
  await page.click("#back-btn");
  check("back keeps answer", await page.locator("#struggling-2").isChecked());
  await page.click("#back-btn");
  check("back keeps stress", await page.locator("#stress-0").isChecked());
  await page.click("#next-btn"); await page.click("#next-btn");
  await page.click('label[for="assignments-2"]'); await page.click("#next-btn");
  await page.click('label[for="helpType-0"]'); await page.click("#next-btn");
  await page.click('label[for="followup-2"]');
  await page.click("#next-btn");
  check("submit button disabled while loading", await page.locator("#next-btn").isDisabled());
  await page.waitForURL(/results\.html/);
  await page.waitForSelector(".match-card", { timeout: 5000 });
  const cards = await page.locator(".match-card h2").allTextContents();
  check("results show counselor + tutor", cards.join() === "Dr. Patel,Ms. Lee", cards.join());
  check("High shows 988 note", /988/.test(await page.textContent(".note")));
  check("why section present", await page.locator(".why").count() === 2);
  check("appointment shown", /Immediate/.test(await page.textContent(".match-grid")));

  // Dashboard + XSS
  await page.goto(url("dashboard.html"));
  check("dashboard has the row", await page.locator("tbody tr").count() === 1);
  check("email rendered as text", (await page.textContent("tbody tr td:nth-child(2)")).includes("<img/src=x/onerror=alert(1)>"));
  check("no injected img", await page.locator("tbody img").count() === 0);
  check("no alert fired", !dialog);
  // Spaced payload cannot pass the form, so inject it straight into storage as a tampered record.
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("sp_state_v1"));
    st.students[0].email = "<img src=x onerror=alert(1)>";
    localStorage.setItem("sp_state_v1", JSON.stringify(st));
  });
  await page.reload();
  check("tampered email shown as plain text", (await page.textContent("tbody tr td:nth-child(2)")) === "<img src=x onerror=alert(1)>" && await page.locator("tbody img").count() === 0 && !dialog);

  async function checkin(email, stressIdx, strug, assign, help, follow) {
    await page.goto(url("checkin.html"));
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(url("checkin.html"));
    await page.fill("#email", email); await page.click("#next-btn");
    await page.click(`label[for="stress-${stressIdx}"]`); await page.click("#next-btn");
    await page.click(`label[for="struggling-${strug}"]`); await page.click("#next-btn");
    await page.click(`label[for="assignments-${assign}"]`); await page.click("#next-btn");
    await page.click(`label[for="helpType-${help}"]`); await page.click("#next-btn");
    await page.click(`label[for="followup-${follow}"]`); await page.click("#next-btn");
    await page.waitForSelector(".match-card", { timeout: 6000 });
    return page.locator(".match-card h2").allTextContents();
  }
  const low = await checkin("low@x.com", 4, 0, 0, 1, 0);
  check("low result", low.join() === "Ms. Rodriguez,Mr. Garcia", low.join());
  const med = await checkin("med@x.com", 2, 2, 2, 2, 0);
  check("medium result", med.join() === "Mr. Thompson,Ms. Nguyen", med.join());
  await page.goto(url("dashboard.html"));
  check("3 rows", await page.locator("tbody tr").count() === 3);
  await page.click('.chip:has-text("Low")');
  check("filter Low", await page.locator("tbody tr").count() === 1);
  await page.click('.chip:has-text("All")');
  await page.fill("#search", "med@");
  check("search email", await page.locator("tbody tr").count() === 1);
  await page.fill("#search", "");
  await page.click('th[data-key="risk"] button');
  check("sort aria-sort", await page.getAttribute('th[data-key="risk"]', "aria-sort") === "ascending");
  check("first asc is Low", /Low/.test(await page.textContent("tbody tr:first-child")));
  check("tiles total 3", (await page.textContent(".tile .num")) === "3");
  check("workload bars", await page.locator(".bar-row").count() === 3);
  check("staff demo label", /Staff view, demo only/.test(await page.textContent(".staff-banner")));
  await page.screenshot({ path: path.join(os.tmpdir(), "dash1280.png") });

  // 360px layout
  const mob = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const mp = await mob.newPage();
  const merr = [];
  mp.on("pageerror", e => merr.push(String(e)));
  for (const f of ["index.html", "checkin.html", "results.html", "dashboard.html"]) {
    await mp.goto(url(f));
    const over = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check("no horizontal scroll 360 " + f, !over);
  }
  await mp.goto(url("checkin.html"));
  await mp.fill("#email", "m@x.com"); await mp.click("#next-btn");
  check("mood picker fits 360", !(await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await mp.screenshot({ path: path.join(os.tmpdir(), "mood360.png") });
  check("no page errors 360", merr.length === 0, merr.join("|"));

  // Keyboard-only run
  const kp = await ctx.newPage();
  await kp.goto(url("checkin.html"));
  await kp.evaluate(() => sessionStorage.clear());
  await kp.goto(url("checkin.html"));
  await kp.focus("#email");
  await kp.keyboard.type("kb@x.com");
  await kp.keyboard.press("Enter");
  check("kb: enter advances", await kp.locator('input[name="stress"]').count() === 5);
  await kp.keyboard.press("Tab");
  await kp.keyboard.press("Space");
  await kp.keyboard.press("ArrowRight");
  check("kb: radio arrow selects", await kp.locator("#stress-1").isChecked());
  await kp.keyboard.press("Enter");
  check("kb: enter on radio advances", await kp.locator('input[name="struggling"]').count() === 3);
  const outline = await kp.evaluate(() => { document.querySelector("#struggling-0").focus(); return getComputedStyle(document.querySelector("#struggling-0 + .option-body")).outlineStyle; });
  check("visible focus style on option card", outline !== "none");

  // Clear demo data
  await page.goto(url("dashboard.html"));
  await page.click("#clear-btn");
  check("clear demo data", await page.locator("tbody tr").count() === 0 && (await page.textContent(".tile .num")) === "0");

  // Reduced motion
  const rm = await browser.newContext({ reducedMotion: "reduce" });
  const rp = await rm.newPage();
  await rp.goto(url("index.html"));
  const anim = await rp.evaluate(() => getComputedStyle(document.querySelector(".btn-primary")).transitionDuration);
  check("reduced motion removes transitions", /^0s/.test(anim), anim);

  console.log(fails ? fails + " FAILED" : "ALL PASSED");
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
