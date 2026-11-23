// Countries Votex can take payments in (Paystack markets) and their usual currency.
// Currency is never hardcoded elsewhere: organisers pick it here and events copy it (master plan §5).

export type Country = { code: string; name: string; currency: string };

export const COUNTRIES: Country[] = [
  { code: "GH", name: "Ghana", currency: "GHS" },
  { code: "NG", name: "Nigeria", currency: "NGN" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF" },
];

export const CURRENCIES: { code: string; name: string }[] = [
  { code: "GHS", name: "Ghana cedi" },
  { code: "NGN", name: "Nigerian naira" },
  { code: "KES", name: "Kenyan shilling" },
  { code: "ZAR", name: "South African rand" },
  { code: "XOF", name: "West African CFA franc" },
  { code: "USD", name: "US dollar" },
];

export function countryCurrency(country: string): string {
  return COUNTRIES.find((c) => c.code === country)?.currency ?? "GHS";
}
