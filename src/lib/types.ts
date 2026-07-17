import type { Status } from "./constants";

export type ActionResult = { ok: boolean; message: string; id?: number };

export type ProdutoRow = {
  id: number;
  categoria: string;
  item: string;
  lote: string;
  descricao: string;
  qtdTotal: number;
  qtdManutencao: number;
  qtdProvisionado: number;
  qtdDisponivel: number;
  valorCusto: number;
  valorRevenda: number;
};

export type ContratoCard = {
  id: number;
  anoProv: string;
  status: Status;
  cliente: string;
  tamanhoPainel: string;
  prazo: Date | null;
  totalItens: number;
  valorTotal: number;
};

export type ItemContratoRow = {
  id: number;
  produtoId: number;
  quantidade: number;
  produto: {
    item: string;
    categoria: string;
    lote: string;
    valorRevenda: number;
    qtdDisponivel: number;
  };
};
