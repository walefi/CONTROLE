export function brl(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtData(data: Date | string | null | undefined) {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function dateInputValue(data: Date | string | null | undefined) {
  if (!data) return "";
  return new Date(data).toISOString().slice(0, 10);
}
