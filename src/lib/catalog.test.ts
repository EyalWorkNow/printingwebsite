// run: node --experimental-strip-types src/lib/catalog.test.ts
import assert from "node:assert";
import * as C from "./catalog.ts";
import { normalize, printDpi, dpiLevel, addBusinessDays, catalogErrors, mergeProductEdit, DEFAULT_CATALOG as cat } from "./catalog.ts";
const priceLine = (i: C.LineInput) => C.priceLine(cat, i);
const totals = (l: { subtotal: number }[], m?: string) => C.totals(cat, l, m);
const findProduct = (id: string) => C.findProduct(cat, id);
const PRODUCTS = cat.products;
const fromPrice = (p: C.Product) => C.fromPrice(cat, p);

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
const sh = priceLine({ productId: "tshirt", split: { S: 4, M: 6 }, options: { color: "black", front: "large" } });
assert.equal(sh.quantity, 10);
assert.equal(sh.unitPrice, 27 + 6);
assert.deepEqual(sh.split, { S: 4, M: 6 });
assert.equal(priceLine({ productId: "tshirt", quantity: 3 }).split?.S, 3); // no split → default size
// front + back print: both priced, one file per side, unknown sides dropped
const fb = priceLine({ productId: "tshirt", quantity: 10, options: { front: "large", back: "large" }, files: [{ side: "front", artwork: "a.png" }, { side: "back", artwork: "b.pdf", placement: "גב" }, { side: "sleeve", artwork: "c.png" }] });
assert.equal(fb.unitPrice, 27 + 6 + 12); // 10 units: large front tier 6, large back tier 12
assert.deepEqual(fb.files?.map((f) => [f.side, f.artwork]), [["front", "a.png"], ["back", "b.pdf"]]);
assert.equal(fb.artwork, "a.png");
assert.equal(priceLine({ productId: "tshirt", quantity: 1, artwork: "x.png" }).files?.[0].side, "front"); // single-file (chat) still works
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
assert.deepEqual(totals([{ subtotal: 100 }], "home"), { subtotal: 100, shipping: 39, vat: 25.02, total: 164.02, shippingMethod: "home", shippingLabel: "שליח עד הבית", shippingDays: 2 });
assert.equal(totals([{ subtotal: 300 }, { subtotal: 250 }], "home").shipping, 0);
assert.equal(totals([{ subtotal: 600 }], "express").shipping, 79);
assert.equal(totals([{ subtotal: 10 }], "pickup").total, 11.8);
for (const p of PRODUCTS) assert.ok(fromPrice(p) > 0, p.id); // every product prices with defaults

// admin edits: inactive products/values, shipping switched off, validation, structure-safe merge
const off = structuredClone(cat);
off.products.find((p) => p.id === "poster")!.active = false;
assert.throws(() => C.priceLine(off, { productId: "poster", quantity: 1 }), /אינו זמין/);
off.products.find((p) => p.id === "business-card")!.options.find((o) => o.id === "lamination")!.values.find((v) => v.id === "matte")!.active = false;
assert.equal(C.priceLine(off, { productId: "business-card", quantity: 100, options: { lamination: "matte" } }).options.lamination, "none");
off.products.find((p) => p.id === "tshirt")!.options.find((o) => o.id === "size")!.values.find((v) => v.id === "S")!.active = false;
assert.throws(() => C.priceLine(off, { productId: "tshirt", split: { S: 2 } }), /לא קיימת/);
off.shipping.home.active = false;
assert.equal(C.totals(off, [{ subtotal: 10 }], "home").shippingMethod, "pickup");
assert.deepEqual(catalogErrors(cat), []);
assert.deepEqual(catalogErrors(off), []);
const bad = structuredClone(cat);
bad.products[0].base = [[100, 1], [50, 0.5]];
bad.products[1].qty.presets = [100, 50];
bad.shipping.pickup.active = false; bad.shipping.home.active = false; bad.shipping.express.active = false;
assert.equal(catalogErrors(bad).length, 3);
const zero = structuredClone(cat); zero.products[0].base = [[100, 0]];
assert.match(catalogErrors(zero).join(), /שגיאת מחירון/); // default combination would cost ₪0
const bc0 = findProduct("business-card")!;
const edited = mergeProductEdit(bc0, { ...bc0, id: "hacked", name: "כרטיס פרימיום", base: [[100, "2" as unknown as number]], options: [{ ...bc0.options[0], id: "size", values: [{ id: "standard", title: "רגיל", tiers: [[1, 0.5]] }] }] } as C.Product);
assert.equal(edited.id, "business-card"); // ids can't be changed by an edit
assert.equal(edited.base[0][1], 2);
assert.equal(edited.options[0].values[0].tiers?.[0][1], 0.5);
assert.equal(edited.options.length, 1); // the edit defines the option list (options can be deleted)
assert.deepEqual(edited.options[0].values[0].cm, [9, 5]); // code-defined extras survive the edit
const sq = mergeProductEdit(bc0, structuredClone(bc0));
assert.equal(sq.options[0].values[2].mockup, "card-sq");
assert.equal(sq.options.find((o) => o.id === "sides")?.kind, undefined);
const added = mergeProductEdit(bc0, { ...structuredClone(bc0), image: "/media/abc.webp", options: [...structuredClone(bc0.options),
  { id: "foil", title: "רדיד זהב", values: [{ id: "none", title: "ללא" }, { id: "gold", title: "זהב", tiers: [[1, 0.3]] }, { id: "BAD ID", title: "x" }] },
  { id: "../x", title: "evil", values: [] }] } as C.Product);
assert.equal(added.options.length, bc0.options.length + 1); // invalid option id dropped
assert.equal(added.options.at(-1)!.values.length, 2); // invalid value id dropped
assert.equal(added.image, "/media/abc.webp");
assert.equal(mergeProductEdit(bc0, { ...bc0, image: "https://evil.example/x.webp" }).image, bc0.image);
const cat2 = { ...cat, products: cat.products.map((p) => (p.id === "business-card" ? added : p)) };
assert.deepEqual(catalogErrors(cat2), []);
assert.equal(C.priceLine(cat2, { productId: "business-card", quantity: 100, options: { foil: "gold" } }).unitPrice, 1.25);
const fresh = C.newProduct("magnet", "מגנט", "promo", "card");
assert.deepEqual(catalogErrors({ ...cat, products: [...cat.products, fresh] }), []);
assert.match(catalogErrors({ ...cat, products: [...cat.products, { ...fresh, category: "nope" }] }).join(), /קטגוריה לא קיימת/);
assert.match(catalogErrors({ ...cat, products: [...cat.products, { ...fresh, id: "mug" }] }).join(), /אותו מזהה/);
console.log("catalog ok");

assert.equal(printDpi([9, 5], 1063, 591), 300);
assert.equal(printDpi([9, 5], 591, 1063), 300);
assert.equal(dpiLevel(printDpi([42, 59.4], 1000, 1400)), "low");
assert.equal(addBusinessDays(new Date(2026, 10, 26), 1).getDay(), 0); // Thu + 1 business day → Sun
assert.equal(addBusinessDays(new Date(2026, 10, 22), 5).getDate(), 29); // Sun + 5 → next Sun
console.log("dpi + dates ok");

// foreign markets: bulk paper unit prices are fractions of a cent — must price (not throw) and never show as 0
{
  const { localizeCatalog } = await import("../i18n/localize.ts");
  const { MARKETS } = await import("../i18n/markets.ts");
  const de = localizeCatalog(cat, {}, {}, cat.t ?? C.CATALOG_TEXT, MARKETS.de);
  const l = C.priceLine(de, { productId: "business-card", quantity: 5000 });
  assert.ok(l.unitPrice > 0 && l.unitPrice < 0.01 && l.subtotal > 10, `bulk € price ${l.unitPrice}/${l.subtotal}`);
  assert.equal(C.totals(de, [l]).vat, Math.round((l.subtotal + (l.subtotal >= 59 ? 0 : 3.77)) * 0.19 * 100) / 100); // 19% MwSt + shipping
  assert.ok(C.money(de)(0.0048).includes("0,0048"));
  console.log("markets ok");
}
