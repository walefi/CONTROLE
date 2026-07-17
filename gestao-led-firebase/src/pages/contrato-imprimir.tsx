import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MonitorPlay } from "lucide-react";
import { useColecao } from "@/hooks/use-colecao";
import { STATUS_META } from "@/lib/constants";
import { brl, fmtData } from "@/lib/format";
import type { Contrato, ContratoItem, Produto } from "@/lib/types";
import { StatusBadge } from "@/components/badges";
import { PrintButton } from "@/components/contratos/print-button";
import { buttonVariants } from "@/components/ui/button";

function Info({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <div className="mt-0.5 text-sm font-medium text-zinc-900">{valor}</div>
    </div>
  );
}

export default function ContratoImprimir() {
  const { id } = useParams<{ id: string }>();
  const { dados: contratos, carregando } = useColecao<Contrato>("contratos");
  const { dados: todosItens } = useColecao<ContratoItem>("contrato_itens");
  const { dados: produtos } = useColecao<Produto>("produtos");

  const contrato = contratos.find((c) => c.id === id) ?? null;
  const produtoPorId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);
  const itens = useMemo(
    () =>
      todosItens
        .filter((i) => i.id_contrato === id)
        .map((i) => ({ ...i, produto: produtoPorId.get(i.id_produto) ?? null })),
    [todosItens, id, produtoPorId]
  );

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!contrato) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Contrato não encontrado.</p>
        <Link to="/contratos" className={buttonVariants({ variant: "outline" })}>
          Voltar
        </Link>
      </div>
    );
  }

  const totalUnidades = itens.reduce((s, i) => s + i.quantidade, 0);
  const valorTotal = itens.reduce(
    (s, i) => s + i.quantidade * (i.produto?.valor_revenda ?? 0),
    0
  );
  const emitidoEm = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to={`/contratos/${contrato.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Contrato
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-xl bg-white p-8 text-zinc-900 ring-1 ring-foreground/10 print:rounded-none print:p-0 print:ring-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <MonitorPlay className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold">LED Manager</p>
              <p className="text-xs text-zinc-500">
                Gestão de Estoque & Contratos de Painéis de LED
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-wide">
              Resumo do Contrato
            </p>
            <p className="font-mono text-sm text-zinc-600">{contrato.ano_prov}</p>
            <p className="text-xs text-zinc-500">Emitido em {emitidoEm}</p>
          </div>
        </div>

        <div className="my-6 h-px bg-zinc-200" />

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Info label="Cliente" valor={contrato.cliente} />
          <Info
            label="Status"
            valor={
              <span className="flex items-center gap-2">
                <StatusBadge status={contrato.status} />
                <span className="text-xs text-zinc-500">
                  {STATUS_META[contrato.status].hint}
                </span>
              </span>
            }
          />
          <Info label="Tamanho do Painel" valor={contrato.tamanho_painel || "—"} />
          <Info label="Prazo de Entrega" valor={fmtData(contrato.prazo)} />
        </div>

        {contrato.observacoes && (
          <div className="mt-4">
            <Info
              label="Observações"
              valor={
                <span className="whitespace-pre-wrap font-normal">
                  {contrato.observacoes}
                </span>
              }
            />
          </div>
        )}

        <h2 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Componentes Vinculados ao Contrato
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-300 text-left">
              <th className="py-2 pr-2 font-semibold">#</th>
              <th className="py-2 pr-2 font-semibold">Componente</th>
              <th className="py-2 pr-2 font-semibold">Categoria</th>
              <th className="py-2 pr-2 font-semibold">Lote</th>
              <th className="py-2 pr-2 text-right font-semibold">Qtd</th>
              <th className="py-2 pr-2 text-right font-semibold">Valor Unit.</th>
              <th className="py-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-sm text-zinc-500">
                  Nenhum componente vinculado a este contrato.
                </td>
              </tr>
            )}
            {itens.map((item, indice) => (
              <tr key={item.id} className="border-b border-zinc-200">
                <td className="py-2 pr-2 text-zinc-500">{indice + 1}</td>
                <td className="py-2 pr-2 font-medium">
                  {item.produto?.item ?? "Produto removido"}
                </td>
                <td className="py-2 pr-2">{item.produto?.categoria ?? "—"}</td>
                <td className="py-2 pr-2 font-mono text-xs">
                  {item.produto?.lote || "—"}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{item.quantidade}</td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {brl(item.produto?.valor_revenda ?? 0)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {brl(item.quantidade * (item.produto?.valor_revenda ?? 0))}
                </td>
              </tr>
            ))}
          </tbody>
          {itens.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-zinc-300 font-semibold">
                <td colSpan={4} className="py-2 pr-2">
                  Total
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{totalUnidades}</td>
                <td />
                <td className="py-2 text-right tabular-nums">{brl(valorTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        <div className="mt-16 grid grid-cols-2 gap-12">
          <div className="border-t border-zinc-400 pt-2 text-center text-xs text-zinc-500">
            Responsável
          </div>
          <div className="border-t border-zinc-400 pt-2 text-center text-xs text-zinc-500">
            Cliente
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-400">
          Documento gerado pelo LED Manager em {emitidoEm}
        </p>
      </div>
    </div>
  );
}
