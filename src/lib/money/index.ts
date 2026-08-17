const currencyFractionDigits: Record<string, number> = {
  BGN: 2,
  EUR: 2,
};

export function parseMoneyToMinor(value: string, currency: string): bigint {
  const normalized = value.trim().replace(",", ".");
  const fractionDigits = currencyFractionDigits[currency] ?? 2;
  const pattern = new RegExp(`^-?\\d+(?:\\.\\d{0,${fractionDigits}})?$`);

  if (!pattern.test(normalized)) {
    throw new TypeError("Невалидна парична стойност.");
  }

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ""] = unsigned.split(".");
  const minor = BigInt(
    `${whole}${fraction.padEnd(fractionDigits, "0")}`.replace(/^0+(?=\d)/, ""),
  );

  return negative ? -minor : minor;
}

export function formatMoneyFromMinor(
  amountMinor: bigint,
  currency: string,
  locale = "bg-BG",
) {
  const fractionDigits = currencyFractionDigits[currency] ?? 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(amountMinor) / 10 ** fractionDigits);
}

export function calculateLineTotalMinor(
  quantity: string,
  unitPriceMinor: bigint,
): bigint {
  const [whole, fraction = ""] = quantity.trim().replace(",", ".").split(".");
  const scale = 10n ** BigInt(fraction.length);
  const scaledQuantity = BigInt(`${whole}${fraction}`);
  const numerator = scaledQuantity * unitPriceMinor;
  const quotient = numerator / scale;
  const remainder = numerator % scale;
  return quotient + (remainder * 2n >= scale ? 1n : 0n);
}

