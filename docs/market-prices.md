# Market price calibration (2026-11-25)

Sample prices for the foreign-language sites are the Israeli price list × fx × a per-product level (`src/i18n/markets.ts`).
Levels were set so a reference basket lands near the regular price of each market's leading online print shop.

| Market | Source | VAT | Shipping (standard / free from) |
|---|---|---|---|
| USA (en, USD) | vistaprint.com | prices excl. sales tax | ~$7.95 / $100 |
| Germany (de, EUR) | vistaprint.de | 19% | 4.49 € / 70 € incl. |
| France (fr, EUR) | vistaprint.fr | 20% | 5.80 € HT / 60 € HT |
| Spain (es, EUR) | vistaprint.es | 21% | 6.99 € / 70 € (economy) |
| Italy (it, EUR) | vistaprint.it | 22% | 5.95 € / 70 € |
| UAE (ar, AED) | printo.ae, themerchlist.com | 5% | free in Dubai/Sharjah/Ajman; free over AED 250 |

Reference basket (regular prices, Black Friday discounts ignored), e.g. Germany incl. VAT: 250 business cards 12.99 €,
500 A5 flyers 13.99 €, roll-up 66.99 €, T-shirt 13.49 € (1) / 8.72 € (25), hoodie 33.99 € / 23.24 €, mug 10.99 € / 9.25 € (50),
250 round stickers 49.90 €, tote 4.32 € (50), pen 0.60 € (250). USA: 250 cards $19.99, roll-up $119.99, tee $16.99 / $12.49,
mug $13.29 / $11.32. UAE: 250 cards AED 115, 500 flyers AED 270, roll-up 100×200 AED 145, tee AED 40.56 (25), mug AED 16.28 (50).

Caveats: shop defaults differ from our specs (paper weight, poster/canvas size), so poster/canvas levels are estimates;
a single level per product can't match both small and bulk quantities exactly (mugs). Re-check after Black Friday.
