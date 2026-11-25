// UI audit: contrast (WCAG), horizontal overflow, off-screen elements, tap targets, page errors —
// 25 screens × mobile/tablet/desktop × light/dark. Needs the dev server on :3007 and Playwright + Chrome:
//   npm i -D playwright && node scripts/audit-ui.mjs [filter]
// The "product-art" scenario uploads a small test image named low.png from the working directory.
import { chromium } from "playwright";
const B = "http://localhost:3007";
// PREFIX=/en (etc.) audits that language; only scenarios that don't click Hebrew-labelled buttons run there
const P = process.env.PREFIX ?? "";
const LANG_SAFE = new Set(["home", "products", "category", "product-1", "empty-cart", "faq", "about", "terms", "accessibility", "404"]);
const ADMIN = { username: "123123123", password: "123123123" };
const VIEWPORTS = [["mobile", 375, 812], ["tablet", 820, 1100], ["desktop", 1440, 900]];
const THEMES = ["light", "dark"];
const only = process.argv[2]; // optional filter

// --- in-page checker ---------------------------------------------------------
const CHECK = () => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const out = { contrast: [], offscreen: [], tap: [] };
  const vw = document.documentElement.clientWidth;
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    // elements sticking out horizontally (ignore deliberate scrollers' children and sr-only)
    if ((r.right > vw + 1 || r.left < -1) && !el.closest("[class*='overflow-x-auto'],[class*='overflow-hidden'],.sr-only") && cs.position !== "fixed")
      out.offscreen.push(`${el.querySelectorAll("*").length}:${el.tagName.toLowerCase()}.${(el.className?.baseVal ?? el.className ?? "").toString().split(" ").slice(0, 3).join(".")} ${Math.round(r.left)}..${Math.round(r.right)} "${(el.textContent || "").trim().slice(0, 30)}"`);
    // tap targets on touch layouts
    if (vw < 700 && el.matches("a[href],button,select,input:not([type=hidden]),[role=tab]") && !el.closest(".sr-only") && cs.opacity !== "0") {
      const inline = el.tagName === "A" && cs.display === "inline" && el.closest("p,li,dd,span"); // links inside sentences are exempt (WCAG 2.5.8)
      const target = el.closest("label") ?? el; const tr = target.getBoundingClientRect();
      if (!inline && (tr.height < 24 || tr.width < 24) && !el.matches("input[type=radio],input[type=checkbox]")) out.tap.push(`${el.tagName.toLowerCase()} ${Math.round(tr.width)}×${Math.round(tr.height)} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}"`);
    }
    const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!text || el.closest("svg,.sr-only,[aria-hidden=true]")) continue;
    const fg = rgba(cs.color); if (fg[3] === 0) continue; // gradient text (bg-clip) — checked by eye
    if (el.closest(":disabled,[aria-disabled=true]")) continue; // WCAG exempts inactive controls
    const layers = []; let img = false, opacity = 1;
    for (let a = el; a; a = a.parentElement) {
      const s = getComputedStyle(a); opacity *= Number(s.opacity);
      if (s.backgroundImage !== "none" && !s.backgroundImage.includes("conic")) { img = true; break; }
      const c = rgba(s.backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] >= 1) break;
      if (a.querySelector?.(":scope > img, :scope > span > img")) { /* image underneath a positioned label */ }
    }
    if (img) continue;
    let bg = [255, 255, 255, 1]; if (!layers.length || layers.at(-1)[3] < 1) bg = rgba(getComputedStyle(document.body).backgroundColor);
    for (const l of layers.reverse()) bg = over(l, bg);
    const fgc = over([fg[0], fg[1], fg[2], fg[3] * opacity], bg);
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const cr = ratio(fgc, bg);
    if (cr < need) out.contrast.push(`${cr.toFixed(2)} (<${need}) "${el.textContent.trim().slice(0, 40)}" fg=${cs.color} on rgb(${bg.slice(0, 3).map(Math.round)})`);
  }
  out.overflow = document.documentElement.scrollWidth - vw;
  return out;
};

// --- page scenarios ------------------------------------------------------------
const addToCart = async (p, id) => { await p.goto(B + "/p/" + id); await p.waitForLoadState("networkidle"); for (let i = 0; i < 3; i++) await p.getByRole("button", { name: "המשך" }).first().click(); await p.getByRole("button", { name: "הוספה לעגלה" }).click(); };
const SCEN = [
  ["home", async (p) => p.goto(B + P + "/")], ["products", async (p) => p.goto(B + P + "/products")], ["category", async (p) => p.goto(B + P + "/c/apparel")],
  ["product-1", async (p) => p.goto(B + P + "/p/business-card")],
  ["product-qty", async (p) => { await p.goto(B + P + "/p/business-card"); await p.getByRole("button", { name: "המשך" }).first().click(); }],
  ["product-split", async (p) => { await p.goto(B + P + "/p/tshirt"); await p.getByRole("button", { name: "שחור" }).click(); await p.getByRole("button", { name: "המשך" }).first().click(); }],
  ["product-prod", async (p) => { await p.goto(B + P + "/p/mug"); for (let i = 0; i < 2; i++) await p.getByRole("button", { name: "המשך" }).first().click(); }],
  ["product-art", async (p) => { await p.goto(B + P + "/p/poster"); for (let i = 0; i < 3; i++) await p.getByRole("button", { name: "המשך" }).first().click(); await p.locator("input[type=file]").setInputFiles("low.png"); await p.waitForSelector("text=הועלה"); await p.locator("details summary").first().click(); }],
  ["product-added", async (p) => { await addToCart(p, "pen"); }],
  ["cart", async (p) => { await addToCart(p, "cap"); await p.goto(B + P + "/cart"); }],
  ["checkout-1", async (p) => { await addToCart(p, "tote"); await p.goto(B + P + "/checkout"); await p.getByRole("button", { name: "המשך לבחירת משלוח" }).click(); }],
  ["checkout-pay", async (p) => { await addToCart(p, "tote"); await p.goto(B + P + "/checkout"); await p.getByPlaceholder("שם מלא").fill("בדיקה"); await p.getByPlaceholder("טלפון נייד").fill("0501234567");
    await p.getByRole("button", { name: "המשך לבחירת משלוח" }).click(); await p.getByText("איסוף עצמי", { exact: true }).click(); await p.getByRole("button", { name: "המשך לתשלום" }).click();
    await p.getByRole("button", { name: /^תשלום/ }).click(); }],
  ["empty-cart", async (p) => p.goto(B + P + "/cart")],
  ["faq", async (p) => { await p.goto(B + P + "/faq"); await p.locator("details summary").first().click(); }], ["about", async (p) => p.goto(B + P + "/about")],
  ["contact", async (p) => { await p.goto(B + P + "/contact"); await p.getByRole("button", { name: "שליחה" }).click(); }],
  ["terms", async (p) => p.goto(B + P + "/terms")], ["accessibility", async (p) => p.goto(B + P + "/accessibility")], ["404", async (p) => p.goto(B + P + "/no-such-page")],
  ["chat", async (p) => { await p.goto(B + P + "/faq"); await p.getByRole("button", { name: /פתיחת צ'אט/ }).click(); }],
  ["admin-orders", async (p) => { await p.goto(B + "/admin"); await p.locator("details summary").first().click(); }, true],
  ["admin-catalog", async (p) => p.goto(B + "/admin/catalog"), true],
  ["admin-editor", async (p) => p.goto(B + "/admin/catalog/tshirt"), true],
  ["admin-new", async (p) => { await p.goto(B + "/admin/catalog"); await p.getByRole("button", { name: "מוצר חדש" }).click(); }, true],
  ["admin-settings", async (p) => p.goto(B + "/admin/catalog/settings"), true],
];

const b = await chromium.launch({ channel: "chrome" });
let fails = 0;
for (const [vp, w, h] of VIEWPORTS) for (const theme of THEMES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: theme, httpCredentials: ADMIN, isMobile: vp === "mobile", hasTouch: vp !== "desktop" });
  await ctx.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
  for (const [name, go] of SCEN) {
    if (only && !name.includes(only)) continue;
    if (P && !LANG_SAFE.has(name)) continue;
    const p = await ctx.newPage(); const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    try { await go(p); await p.waitForLoadState("networkidle"); await p.waitForTimeout(350); } catch (e) { errs.push("scenario: " + e.message.split("\n")[0]); }
    const isDark = await p.evaluate(() => document.documentElement.classList.contains("dark"));
    const r = await p.evaluate(CHECK);
    const bad = [...r.contrast.map((x) => "contrast " + x), ...r.offscreen.sort((a, b) => parseInt(a) - parseInt(b)).slice(0, 5).map((x) => "offscreen " + x), ...r.tap.slice(0, 6).map((x) => "tap " + x), ...(r.overflow > 0 ? [`overflow ${r.overflow}px`] : []), ...errs, ...(isDark !== (theme === "dark") ? ["theme not applied"] : [])];
    if (bad.length) { fails += bad.length; console.log(`✗ ${vp}/${theme}/${name}`); for (const x of [...new Set(bad)].slice(0, 12)) console.log("   " + x); }
    if (process.env.SHOT) await p.screenshot({ path: `au-${vp}-${theme}-${name}.png`, fullPage: true });
    await p.close();
  }
  await ctx.close();
}
console.log(fails ? `\n${fails} issues` : "\nall clean");
await b.close();
