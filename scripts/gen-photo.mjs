// Generate a blank-product photo with OpenAI images. Keeps a running spend log and stops at the budget.
//   node --env-file=.env.local scripts/gen-photo.mjs <out.png> <1024x1536|1536x1024|1024x1024> <low|medium|high> "<prompt>"
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const [out, size, quality, prompt] = process.argv.slice(2);
const LOG = "scripts/.gen-spend.json", BUDGET = 20; // USD
const spent = existsSync(LOG) ? JSON.parse(readFileSync(LOG, "utf8")) : { usd: 0, n: 0 };
if (spent.usd >= BUDGET) throw new Error(`budget reached: $${spent.usd.toFixed(2)}`);
const r = await fetch("https://api.openai.com/v1/images/generations", {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: JSON.stringify({ model: "gpt-image-2", prompt, size, quality, n: 1 }),
});
const j = await r.json();
if (!r.ok) throw new Error(JSON.stringify(j.error));
writeFileSync(out, Buffer.from(j.data[0].b64_json, "base64"));
// ponytail: cost from token usage at gpt-image list prices ($5/M text in, $40/M image out); check the invoice for truth
const u = j.usage ?? {}, usd = ((u.input_tokens ?? 0) * 5 + (u.output_tokens ?? 0) * 40) / 1e6;
spent.usd += usd; spent.n++;
writeFileSync(LOG, JSON.stringify(spent));
console.log(`${out}  $${usd.toFixed(3)}  (total $${spent.usd.toFixed(2)} / ${spent.n} images)`, JSON.stringify(u));
