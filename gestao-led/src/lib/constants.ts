export const CATEGORIAS = [
  "Módulo",
  "Fonte",
  "Processadora",
  "Receiver",
  "Gabinete",
  "Outros",
] as const;

export const STATUS_LIST = [
  "ORCAMENTO",
  "PROVISIONADO",
  "SUSPENSO",
  "JA_SAIU",
  "CANCELADO",
] as const;

export type Status = (typeof STATUS_LIST)[number];

export const STATUS_META: Record<
  Status,
  { label: string; badge: string; dot: string; hint: string }
> = {
  ORCAMENTO: {
    label: "Orçamento",
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
    hint: "Sem impacto no estoque.",
  },
  PROVISIONADO: {
    label: "Provisionado",
    badge: "border-blue-200 bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
    hint: "Itens reservados: somam na Qtd Provisionado e reduzem a disponibilidade.",
  },
  SUSPENSO: {
    label: "Suspenso",
    badge: "border-amber-200 bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
    hint: "Contrato pausado, mas a reserva dos itens no estoque é mantida.",
  },
  JA_SAIU: {
    label: "Já Saiu",
    badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    hint: "Baixa definitiva: subtrai da Qtd Total e libera a Qtd Provisionado.",
  },
  CANCELADO: {
    label: "Cancelado",
    badge: "border-red-200 bg-red-100 text-red-700",
    dot: "bg-red-500",
    hint: "Reservas liberadas: os itens voltam a ficar disponíveis.",
  },
};

export const CATEGORIA_BADGE: Record<string, string> = {
  Módulo: "border-violet-200 bg-violet-50 text-violet-700",
  Fonte: "border-orange-200 bg-orange-50 text-orange-700",
  Processadora: "border-sky-200 bg-sky-50 text-sky-700",
  Receiver: "border-teal-200 bg-teal-50 text-teal-700",
  Gabinete: "border-stone-200 bg-stone-100 text-stone-700",
  Outros: "border-gray-200 bg-gray-100 text-gray-700",
};

export const ESTOQUE_BAIXO = 10;

export const STATUS_ATIVOS: Status[] = ["ORCAMENTO", "PROVISIONADO", "SUSPENSO"];
