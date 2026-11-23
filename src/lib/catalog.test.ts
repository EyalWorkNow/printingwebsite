// run: node --experimental-strip-types src/lib/catalog.test.ts
import assert from "node:assert";
import { quote } from "./catalog.ts";

const q = quote("business-cards", 500);
assert.equal(q.unitPrice, 0.45);
assert.equal(q.subtotal, 255); // 500*0.45 + 30 setup
assert.equal(q.shipping, 39);
assert.equal(q.total, Math.round((255 + 39) * 1.18 * 100) / 100);
assert.equal(quote("flyers", 2000, "A4").shipping, 0); // free over 500
assert.equal(quote("posters", 9).unitPrice, 45); // tier boundary: 9 < 10
assert.equal(quote("posters", 10).unitPrice, 32);
assert.throws(() => quote("business-cards", 50), /מינימלית/);
assert.throws(() => quote("nope", 5), /לא קיים/);
assert.throws(() => quote("mugs", 1.5), /מינימלית/);
console.log("catalog ok");
