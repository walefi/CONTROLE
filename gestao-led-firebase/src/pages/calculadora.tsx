import { Loader2 } from "lucide-react";
import { useColecao } from "@/hooks/use-colecao";
import type { Contrato, Produto } from "@/lib/types";
import { CalculadoraClient } from "@/components/calculadora/calculadora-client";

export default function CalculadoraPage() {
  const { dados: produtos, carregando: carregandoProdutos } = useColecao<Produto>("produtos");
  const { dados: contratos, carregando: carregandoContratos } = useColecao<Contrato>("contratos");

  if (carregandoProdutos || carregandoContratos) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return <CalculadoraClient produtos={produtos} contratos={contratos} />;
}
