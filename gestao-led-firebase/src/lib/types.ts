import type { Timestamp } from "firebase/firestore";
import type { Status } from "./constants";

export type Produto = {
  id: string;
  categoria: string;
  item: string;
  lote: string;
  descricao: string;
  qtd_total: number;
  qtd_manutencao: number;
  qtd_provisionado: number;
  valor_custo: number;
  valor_revenda: number;
  criado_em?: Timestamp | null;
};

export type Contrato = {
  id: string;
  ano_prov: string;
  status: Status;
  cliente: string;
  tamanho_painel: string;
  prazo: string;
  observacoes: string;
  criado_em?: Timestamp | null;
  atualizado_em?: Timestamp | null;
};

export type ContratoItem = {
  id: string;
  id_contrato: string;
  id_produto: string;
  quantidade: number;
};

export type LogRegistro = {
  id: string;
  data: Timestamp | null;
  usuario: string;
  acao: string;
  detalhes: string;
  id_produto?: string;
  lote?: string;
  quantidade_alterada?: number;
};

export type ProdutoForm = {
  categoria: string;
  item: string;
  lote: string;
  descricao: string;
  qtd_total: number;
  qtd_manutencao: number;
  valor_custo: number;
  valor_revenda: number;
};

export type ContratoForm = {
  ano_prov: string;
  cliente: string;
  tamanho_painel: string;
  prazo: string;
  observacoes: string;
  status?: Status;
};

export function qtdDisponivel(p: Pick<Produto, "qtd_total" | "qtd_manutencao" | "qtd_provisionado">) {
  return p.qtd_total - p.qtd_manutencao - p.qtd_provisionado;
}
