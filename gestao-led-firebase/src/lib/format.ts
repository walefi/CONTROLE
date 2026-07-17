import type { Timestamp } from "firebase/firestore";

export function brl(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtData(data: Date | string | null | undefined) {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function fmtDataHora(ts: Timestamp | null | undefined) {
  if (!ts) return "—";
  return ts.toDate().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
