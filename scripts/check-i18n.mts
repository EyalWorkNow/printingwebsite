// Validates a translation against the Hebrew source:
//   node --experimental-strip-types scripts/check-i18n.mts <lang>
// dictionary (src/i18n/dict/<lang>.ts) + catalog strings (src/i18n/catalog/<lang>.json):
// same keys and shapes, same array lengths, same {placeholders}, no Hebrew letters left.
import he from "../src/i18n/dict/he.ts";
import { readFileSync } from "node:fs";
const lang = process.argv[2];
if (!lang) throw new Error("usage: check-i18n.mts <lang>");
const dict = (await import(`../src/i18n/dict/${lang}.ts`)).default;
const heCat = JSON.parse(readFileSync(new URL("../src/i18n/catalog/he.json", import.meta.url), "utf8"));
const cat = JSON.parse(readFileSync(new URL(`../src/i18n/catalog/${lang}.json`, import.meta.url), "utf8"));
const errs: string[] = [];
const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const HEB = /[֐-׿]/;
function cmp(a: unknown, b: unknown, path: string) {
  if (typeof a === "string") {
    if (typeof b !== "string") return errs.push(`${path}: expected string`);
    if (!b.trim()) errs.push(`${path}: empty`);
    if (ph(a) !== ph(b)) errs.push(`${path}: placeholders {${ph(a)}} ≠ {${ph(b)}}`);
    if (lang !== "he" && HEB.test(b)) errs.push(`${path}: contains Hebrew`);
    return;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return errs.push(`${path}: expected array`);
    if (a.length !== b.length) errs.push(`${path}: array length ${b.length} ≠ ${a.length}`);
    a.forEach((x, i) => cmp(x, b[i], `${path}[${i}]`));
    return;
  }
  if (a && typeof a === "object") {
    if (!b || typeof b !== "object") return errs.push(`${path}: expected object`);
    for (const k of Object.keys(a)) if (!(k in (b as object))) errs.push(`${path}.${k}: missing`);
    for (const k of Object.keys(b as object)) if (!(k in (a as object))) errs.push(`${path}.${k}: extra key`);
    for (const k of Object.keys(a)) if (k in (b as object)) cmp((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
  }
}
cmp(he, dict, "dict");
for (const k of Object.keys(heCat)) {
  if (!(k in cat)) { errs.push(`catalog ${k}: missing`); continue; }
  if (typeof cat[k] !== "string" || !cat[k].trim()) errs.push(`catalog ${k}: empty`);
  else if (lang !== "he" && HEB.test(cat[k])) errs.push(`catalog ${k}: contains Hebrew`);
}
for (const k of Object.keys(cat)) if (!(k in heCat)) errs.push(`catalog ${k}: extra key`);
console.log(errs.length ? errs.join("\n") + `\n✗ ${lang}: ${errs.length} problems` : `✓ ${lang}: dictionary + ${Object.keys(cat).length} catalog strings OK`);
process.exit(errs.length ? 1 : 0);
