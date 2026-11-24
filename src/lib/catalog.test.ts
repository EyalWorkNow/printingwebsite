// run: node --experimental-strip-types src/lib/catalog.test.ts
import assert from "node:assert";
import { priceLine, totals, normalize, findProduct, fromPrice, printDpi, dpiLevel, addBusinessDays, PRODUCTS } from "./catalog.ts";

// base + option tiers, rounded per unit
const bc = priceLine({ productId: "business-card", quantity: 100 }); // defaults: standard, landscape, 1 side, no lamination, straight, matte300
assert.equal(bc.unitPrice, 0.95);
assert.equal(bc.subtotal, 95);
const bc2 = priceLine({ productId: "business-card", quantity: 500, options: { sides: "2", lamination: "matte", corners: "round" } });
assert.equal(bc2.unitPrice, 0.48); // 0.27 + 0.06 + 0.05 + 0.1
assert.equal(bc2.subtotal, 240);
// production surcharge: express +50%
assert.equal(priceLine({ productId: "business-card", quantity: 100, production: "express" }).unitPrice, 1.43); // 0.95*1.5=1.425
// setup fee
assert.equal(priceLine({ productId: "flyer", quantity: 1000 }).subtotal, 1000 * 0.22 + 20);

// rules: square card hides orientation; eco paper hides lamination (forced back to "none")
assert.deepEqual(normalize(findProduct("business-card")!, { size: "square", orientation: "portrait" }).orientation, undefined);
assert.equal(normalize(findProduct("business-card")!, { paper: "eco300", lamination: "gloss" }).lamination, "none");

// split quantities (shirt sizes)
const sh = priceLine({ productId: "tshirt", split: { S: 4, M: 6 }, options: { color: "black", print: "front" } });
assert.equal(sh.quantity, 10);
assert.equal(sh.unitPrice, 27 + 6);
assert.deepEqual(sh.split, { S: 4, M: 6 });
assert.equal(priceLine({ productId: "tshirt", quantity: 3 }).split?.S, 3); // no split → default size
assert.throws(() => priceLine({ productId: "tshirt", split: { XS: 2 } }), /לא קיימת/);

// quantity validation
assert.throws(() => priceLine({ productId: "business-card", quantity: 50 }), /מינימלית/);
assert.throws(() => priceLine({ productId: "business-card", quantity: 120 }), /כפולות/);
assert.equal(priceLine({ productId: "business-card", quantity: 150 }).quantity, 150);
assert.throws(() => priceLine({ productId: "business-card", quantity: 20000 }), /מקסימלית/);
assert.throws(() => priceLine({ productId: "nope", quantity: 5 }), /לא קיים/);
assert.throws(() => priceLine({ productId: "mug", quantity: 1.5 }), /מינימלית/);
// unknown production / option values fall back to defaults instead of trusting the client
assert.equal(priceLine({ productId: "poster", quantity: 1, production: "saver" }).production, "standard");
assert.equal(priceLine({ productId: "poster", quantity: 1, options: { size: "evil" } }).options.size, "a3");
// artwork id must look like our upload ids
assert.equal(priceLine({ productId: "poster", quantity: 1, artwork: "../../etc/passwd" }).artwork, undefined);

// order totals: free home shipping over 500, VAT 18%
assert.deepEqual(totals([{ subtotal: 100 }], "home"), { subtotal: 100, shipping: 39, vat: 25.02, total: 164.02, shippingMethod: "home" });
assert.equal(totals([{ subtotal: 300 }, { subtotal: 250 }], "home").shipping, 0);
assert.equal(totals([{ subtotal: 600 }], "express").shipping, 79);
assert.equal(totals([{ subtotal: 10 }], "pickup").total, 11.8);
for (const p of PRODUCTS) assert.ok(fromPrice(p) > 0, p.id); // every product prices with defaults
console.log("catalog ok");

assert.equal(printDpi([9, 5], 1063, 591), 300);
assert.equal(printDpi([9, 5], 591, 1063), 300);
assert.equal(dpiLevel(printDpi([42, 59.4], 1000, 1400)), "low");
assert.equal(addBusinessDays(new Date(2026, 10, 26), 1).getDay(), 0); // Thu + 1 business day → Sun
assert.equal(addBusinessDays(new Date(2026, 10, 22), 5).getDate(), 29); // Sun + 5 → next Sun
console.log("dpi + dates ok");
