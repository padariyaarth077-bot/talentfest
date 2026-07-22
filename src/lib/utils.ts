import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function eventLabel(ev: { city: string }) {
  return `TelentFest ${ev.city} — ${ev.city}`;
}

export function eventName(ev: { city: string }) {
  return `TelentFest ${ev.city}`;
}
