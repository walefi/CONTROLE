import { useMemo } from "react";
import { useColecao } from "@/hooks/use-colecao";
import type { Contrato, ContratoItem, Produto } from "@/lib/types";
import { Kanban, type CartaoContrato } from "@/components/contratos/kanban";
import { NovoContratoDialog } from "@/components/contratos/novo-contrato-dialog";

export default function Contratos() {
  const { dados: contratos } = useColecao<Contrato>("contratos");
  const { dados: itens } = useColecao<ContratoItem>("contrato_itens");
  const { dados: produtos } = useColecao<Produto>("produtos");

  const cards: CartaoContrato[] = useMemo(() => {
    const produtoPorId = new Map(produtos.map((p) => [p.id, p]));
    return contratos.map((c) => {
      const doContrato = itens.filter((i) => i.id_contrato === c.id);
      return {
        ...c,
        totalItens: doContrato.reduce((s, i) => s + i.quantidade, 0),
        valorTotal: doContrato.reduce(
          (s, i) => s + i.quantidade * (produtoPorId.get(i.id_produto)?.valor_revenda ?? 0),
          0
        ),
      };
    });
  }, [contratos, itens, produtos]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe os pedidos por status. Clique em um card para ver os detalhes.
          </p>
        </div>
        <NovoContratoDialog />
      </div>
      <Kanban contratos={cards} />
    </div>
  );
}
