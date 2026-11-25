import type { Locale } from "./config";
import type { MarketPricing } from "./localize";
import type { MarketAdjust } from "@/lib/catalog";

// Sample prices per market, calibrated 2026-11-25 against the regular (non-Black-Friday) prices of each market's leading
// online print shop (Vistaprint .com/.de/.fr/.es/.it; Printo.ae + TheMerchList for the UAE) — see docs/market-prices.md.
// level = local price ÷ (Israeli price × fx), per product; products outside the researched basket use their category's level.
// Shipping prices/thresholds are before VAT (VAT is added on top, as on the Israeli site).
const paper = (card: number, flyer: number, brochure: number, letterhead: number, notebook: number) =>
  ({ "business-card": card, flyer, brochure, letterhead, notebook });
const signs = (sticker: number, poster: number, rollup: number, canvas: number) => ({ sticker, poster, "roll-up": rollup, canvas });
const wear = (k: number) => ({ tshirt: k, hoodie: k, jacket: k, "kids-tshirt": k, cap: k });
const promo = (mug: number, pen: number, tote: number, other: number) => ({ mug, pen, tote, bottle: other, sleeve: other, charger: other });

export const MARKETS: Record<Exclude<Locale, "he">, MarketPricing> = {
  // USA — prices exclude sales tax; Vistaprint: free shipping from $100
  en: { market: { currency: "USD", vat: 0, intl: "en-US", weekend: [0, 6] }, fx: 0.27, level: 1.6,
    byProduct: { ...paper(0.31, 2, 1.5, 1.2, 1.5), ...signs(2, 1.6, 1.7, 1.4), ...wear(1.63), ...promo(1.6, 1.5, 1.65, 1.6) },
    shipping: { pickup: { active: false }, home: { price: 7.95, freeFrom: 100, days: 4 }, express: { price: 24.95, days: 2 } } },
  // Germany — 19% MwSt; standard 4.49 € incl., free from 70 € incl.
  de: { market: { currency: "EUR", vat: 0.19, intl: "de-DE", weekend: [0, 6] }, fx: 0.25, level: 1,
    byProduct: { ...paper(0.2, 0.22, 0.3, 0.3, 0.86), ...signs(0.84, 1.4, 0.87, 0.93), ...wear(1.1), ...promo(1.25, 0.92, 1.3, 1.1) },
    shipping: { pickup: { active: false }, home: { price: 3.77, freeFrom: 59, days: 3 }, express: { price: 12.56, days: 1 } } },
  // France — 20% TVA; standard 5.80 € HT, free from 60 € HT
  fr: { market: { currency: "EUR", vat: 0.2, intl: "fr-FR", weekend: [0, 6] }, fx: 0.25, level: 1,
    byProduct: { ...paper(0.22, 0.35, 0.4, 0.4, 0.9), ...signs(0.8, 1.6, 0.97, 0.94), ...wear(1.1), ...promo(1.3, 1.5, 1.4, 1.1) },
    shipping: { pickup: { active: false }, home: { price: 5.8, freeFrom: 60, days: 3 }, express: { price: 13.25, days: 1 } } },
  // Spain — 21% IVA; standard 6.99 € incl., free from 70 € incl.
  es: { market: { currency: "EUR", vat: 0.21, intl: "es-ES", weekend: [0, 6] }, fx: 0.25, level: 1,
    byProduct: { ...paper(0.21, 0.33, 0.4, 0.4, 0.9), ...signs(0.8, 1.5, 0.96, 0.9), ...wear(1.1), ...promo(1.25, 1.5, 1.4, 1.1) },
    shipping: { pickup: { active: false }, home: { price: 5.78, freeFrom: 58, days: 3 }, express: { price: 12.36, days: 1 } } },
  // Italy — 22% IVA; standard 5.95 € incl., free from 70 € incl.
  it: { market: { currency: "EUR", vat: 0.22, intl: "it-IT", weekend: [0, 6] }, fx: 0.25, level: 1,
    byProduct: { ...paper(0.22, 0.28, 0.35, 0.35, 0.9), ...signs(0.85, 1.4, 0.95, 0.9), ...wear(1.08), ...promo(1.4, 0.9, 1.6, 1.1) },
    shipping: { pickup: { active: false }, home: { price: 4.88, freeFrom: 57, days: 3 }, express: { price: 12.21, days: 1 } } },
  // UAE — 5% VAT; free delivery above ~AED 250 (TheMerchList), Printo free within Dubai/Sharjah/Ajman
  ar: { market: { currency: "AED", vat: 0.05, intl: "ar-AE-u-nu-latn", weekend: [0, 6] }, fx: 0.99, level: 1.3,
    byProduct: { ...paper(0.49, 1.27, 1.2, 1, 1.07), ...signs(1.6, 2.5, 0.55, 2), ...wear(1.4), ...promo(0.9, 1, 2, 1.2) },
    shipping: { pickup: { active: false }, home: { price: 25, freeFrom: 238, days: 2 }, express: { price: 50, days: 1 } } },
};

/** A market's pricing with the owner's adjustments from the admin (catalog.markets[lang]) applied. */
export function marketPricing(lang: Exclude<Locale, "he">, a?: MarketAdjust): MarketPricing {
  const m = MARKETS[lang];
  return a ? { ...m, fx: a.fx && a.fx > 0 ? a.fx : m.fx, adj: a.adj, productAdj: a.products } : m;
}
