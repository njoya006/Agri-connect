import { format, parseISO } from "date-fns";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date, pattern = "MMM d, yyyy") {
  if (!value) return "";
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, pattern);
}

export function truncateText(text: string, length = 120) {
  if (!text) return "";
  if (text.length <= length) return text;
  return `${text.slice(0, length)}…`;
}

export function formatCurrency(amount: number | string, currency: string = "USD", locale = "en-US") {
  if (amount === undefined || amount === null || amount === "") return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}
