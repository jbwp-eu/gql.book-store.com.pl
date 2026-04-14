export function formatMoneyIso(amount: number, currency: string): string {
  // ISO currency code only (e.g. "12.00 PLN")
  if (!Number.isFinite(amount)) return `0.00 ${currency}`;
  return `${amount.toFixed(2)} ${currency}`;
}

