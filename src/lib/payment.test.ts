// run: node --experimental-strip-types src/lib/payment.test.ts
import assert from "node:assert";
import { luhn, cardBrand, formatCard, formatExpiry, expiryOk, israeliIdOk, maxInstallments } from "./payment.ts";

assert.ok(luhn("4580 0000 0000 0000")); // Isracard-Visa style test number
assert.ok(luhn("4111111111111111"));
assert.ok(!luhn("4111111111111112"));
assert.ok(!luhn("1234"));
assert.equal(cardBrand("4111"), "visa");
assert.equal(cardBrand("5500 0000"), "mastercard");
assert.equal(cardBrand("2221"), "mastercard");
assert.equal(cardBrand("3782"), "amex");
assert.equal(formatCard("4111111111111111"), "4111 1111 1111 1111");
assert.equal(formatCard("378282246310005"), "3782 822463 10005");
assert.equal(formatExpiry("1230"), "12/30");
const now = new Date(2026, 10, 24);
assert.ok(expiryOk("11/26", now));
assert.ok(!expiryOk("10/26", now));
assert.ok(!expiryOk("13/30", now));
assert.ok(israeliIdOk("000000018"));
assert.ok(israeliIdOk("18"));
assert.ok(!israeliIdOk("000000019"));
assert.ok(!israeliIdOk("0"));
assert.equal(maxInstallments(250), 1);
assert.equal(maxInstallments(1500), 3);
console.log("payment ok");
