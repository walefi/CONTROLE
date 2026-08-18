import { Loader2 } from "lucide-react";
import { useColecao } from "@/hooks/use-colecao";
import type { Contrato, ContratoItem, Produto } from "@/lib/types";
import { CalculadoraClient } from "@/components/calculadora/calculadora-client";

export default function CalculadoraPage() {
  const { dados: produtos, carregando: carregandoProdutos } = useColecao<Produto>("produtos");
  const { dados: contratos, carregando: carregandoContratos } = useColecao<Contrato>("contratos");
  const { dados: itens } = useColecao<ContratoItem>("contrato_itens");

  if (carregandoProdutos || carregandoContratos) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return <CalculadoraClient produtos={produtos} contratos={contratos} itens={itens} />;
}
