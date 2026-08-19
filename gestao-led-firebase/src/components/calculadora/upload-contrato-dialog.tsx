import { useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  extrairTudoDoContrato,
  pontuacaoItemEstoque,
  type DimensoesPainel,
  type ItemIdentificado,
  type LinhaContrato,
  type ResultadoIdentificacao,
} from "@/lib/contrato-pdf";
import { qtdDisponivel, type Produto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adicionarItem, criarContrato } from "@/services/contratos";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: Produto[];
  onContratoCriado: (itens: ItemIdentificado[], dimensoes: DimensoesPainel | null) => void;
};

const formatarValor = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Sugere o item de estoque com maior pontuação de similaridade (>= 0.75). */
function melhorItemEstoque(nome: string, produtos: Produto[]): string | null {
  let melhorId: string | null = null;
  let melhorScore = 0;
  for (const p of produtos) {
    const score = pontuacaoItemEstoque(nome, p.item);
    if (score > melhorScore) {
      melhorScore = score;
      melhorId = p.id;
    }
  }
  return melhorScore >= 0.75 ? melhorId : null;
}

export function UploadContratoDialog({ open, onOpenChange, produtos, onContratoCriado }: Props) {
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [resultado, setResultado] = useState<ResultadoIdentificacao | null>(null);
  const [nomes, setNomes] = useState<Record<number, string>>({});
  const [quantidades, setQuantidades] = useState<Record<number, string>>({});
  const [estoqueIds, setEstoqueIds] = useState<Record<number, string>>({});
  const [incluidos, setIncluidos] = useState<Record<number, boolean>>({});
  const [cliente, setCliente] = useState("");
  const [anoProv, setAnoProv] = useState("");
  const [prazo, setPrazo] = useState("");
  const [tamanhoPainel, setTamanhoPainel] = useState("");

  function reset() {
    setResultado(null);
    setNomeArquivo("");
    setNomes({});
    setQuantidades({});
    setEstoqueIds({});
    setIncluidos({});
    setCliente("");
    setAnoProv("");
    setPrazo("");
    setTamanhoPainel("");
    setLendo(false);
  }

  function fechar(o: boolean) {
    if (lendo || salvando) return;
    onOpenChange(o);
    if (!o) reset();
  }

  function alterarQuantidade(idx: number, valor: string) {
    const limpo = valor.replace(/\D/g, "");
    setQuantidades((q) => ({ ...q, [idx]: limpo }));
  }

  async function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setLendo(true);
    setNomeArquivo(arquivo.name);
    try {
      const res = await extrairTudoDoContrato(arquivo);
      if (res.linhas.length === 0) {
        throw new Error("Tabela de componentes não localizada");
      }
      setResultado(res);
      setCliente(res.cliente);
      setAnoProv(res.anoProv);
      setTamanhoPainel(res.tamanhoPainel);
      setNomes(Object.fromEntries(res.linhas.map((l, i) => [i, l.nome])));
      setQuantidades(
        Object.fromEntries(res.linhas.map((l, i) => [i, l.quantidade ? String(l.quantidade) : ""]))
      );
      setEstoqueIds(
        Object.fromEntries(res.linhas.map((l, i) => [i, melhorItemEstoque(l.nome, produtos) ?? ""]))
      );
      setIncluidos(Object.fromEntries(res.linhas.map((_, i) => [i, true])));
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível ler o arquivo.");
      setResultado(null);
    }
    setLendo(false);
  }

  function linhasVinculaveis(): LinhaContrato[] {
    if (!resultado) return [];
    return resultado.linhas.filter((_, i) => {
      if (!(incluidos[i] ?? true)) return false;
      if (!((parseInt(quantidades[i] || "0", 10) || 0) > 0)) return false;
      if (!estoqueIds[i]) return false;
      return true;
    });
  }

  async function confirmar() {
    if (!resultado) return;
    const validas = linhasVinculaveis();
    if (validas.length === 0) {
      toast.error(
        "Selecione ao menos um componente com quantidade maior que zero e um item do estoque correspondente."
      );
      return;
    }
    if (!cliente.trim() || !anoProv.trim()) {
      toast.error("Preencha o cliente e o Ano/Prov.");
      return;
    }

    setSalvando(true);
    try {
      const res = await criarContrato({
        ano_prov: anoProv.trim(),
        cliente: cliente.trim(),
        tamanho_painel: tamanhoPainel.trim(),
        prazo,
        observacoes: `Importado do arquivo: ${nomeArquivo}`,
      });
      if (!res.ok || !res.id) {
        toast.error(res.message);
        return;
      }

      const vinculados: ItemIdentificado[] = [];
      for (const linha of validas) {
        const idx = resultado.linhas.indexOf(linha);
        const produto = produtos.find((p) => p.id === estoqueIds[idx]);
        if (!produto) continue;
        const qtd = parseInt(quantidades[idx] || "0", 10);
        const r = await adicionarItem(res.id, produto.id, qtd);
        if (r.ok) {
          vinculados.push({
            produtoId: produto.id,
            item: produto.item,
            categoria: produto.categoria,
            lote: produto.lote,
            quantidade: qtd,
          });
        } else {
          toast.error(`"${produto.item}": ${r.message}`);
        }
      }

      if (vinculados.length === validas.length) {
        toast.success(`Contrato ${anoProv.trim()} criado com ${vinculados.length} componente(s).`);
      } else {
        toast.warning(
          `Contrato criado, mas ${validas.length - vinculados.length} componente(s) não foram vinculados.`
        );
      }

      onContratoCriado(vinculados, resultado.dimensoes);
      onOpenChange(false);
      reset();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Erro ao criar o contrato.");
    } finally {
      setSalvando(false);
    }
  }

  const itensEstoque = [...produtos]
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.item.localeCompare(b.item))
    .map((p) => ({
      value: p.id,
      label: `${p.categoria} · ${p.item}${p.lote ? ` (${p.lote})` : ""} — disp ${qtdDisponivel(p)}`,
    }));

  const semQuantidade = resultado?.linhas.some((_, i) => !quantidades[i]);
  const semEstoque = resultado?.linhas.some(
    (_, i) => (incluidos[i] ?? true) && (parseInt(quantidades[i] || "0", 10) || 0) > 0 && !estoqueIds[i]
  );

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upload de Contrato (PDF)</DialogTitle>
          <DialogDescription>
            Envie o contrato em PDF. O sistema lista os componentes da tabela ITEM/QTD/VALOR —
            para cada um, escolha o item do estoque que atende.
          </DialogDescription>
        </DialogHeader>

        {!resultado && (
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50",
              lendo && "pointer-events-none opacity-70"
            )}
          >
            {lendo ? (
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            ) : (
              <FileText className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {lendo ? `Processando "${nomeArquivo}"...` : "Clique para selecionar o arquivo .pdf"}
              </p>
              <p className="text-xs text-muted-foreground">
                O PDF precisa ter texto selecionável (contratos escaneados não são suportados).
              </p>
            </div>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              disabled={lendo}
              onChange={onArquivo}
            />
          </label>
        )}

        {resultado && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p>
                <span className="font-medium">{nomeArquivo}</span>{" "}
                <span className="text-muted-foreground">
                  · {resultado.linhas.length} componente(s) na tabela
                </span>
              </p>
              {semQuantidade && (
                <p className="text-xs text-amber-600">
                  Alguns itens sem quantidade detectada — informe manualmente.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="upd-cliente">Cliente</Label>
                <Input
                  id="upd-cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="upd-anoprov">Ano/Prov</Label>
                <Input
                  id="upd-anoprov"
                  value={anoProv}
                  onChange={(e) => setAnoProv(e.target.value)}
                  placeholder="2026/001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="upd-prazo">Prazo</Label>
                <Input
                  id="upd-prazo"
                  type="date"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="upd-tamanho">Tamanho do Painel</Label>
                <Input
                  id="upd-tamanho"
                  value={tamanhoPainel}
                  onChange={(e) => setTamanhoPainel(e.target.value)}
                  placeholder="Ex: 4,00m x 2,00m"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Componentes do contrato</Label>
              <p className="text-xs text-zinc-500">
                Confira o nome e a quantidade e escolha o item do estoque que atende cada
                componente. Desmarque o que não for vendido neste contrato.
              </p>
              <div className="rounded-lg border">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="min-w-44">Item (contrato)</TableHead>
                      <TableHead className="w-24">Qtd</TableHead>
                      <TableHead className="w-24">Valor</TableHead>
                      <TableHead className="min-w-56">Item do estoque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultado.linhas.map((linha, i) => {
                      const incluido = incluidos[i] ?? true;
                      return (
                        <TableRow key={i} className={cn(!incluido && "opacity-50")}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-blue-600"
                              checked={incluido}
                              onChange={(e) =>
                                setIncluidos((s) => ({ ...s, [i]: e.target.checked }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-sm"
                              value={nomes[i] ?? ""}
                              onChange={(e) => setNomes((s) => ({ ...s, [i]: e.target.value }))}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 text-sm tabular-nums"
                              placeholder="?"
                              value={quantidades[i] ?? ""}
                              onChange={(e) => alterarQuantidade(i, e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="tabular-nums text-zinc-500">
                            {linha.valor !== null ? formatarValor(linha.valor) : "—"}
                          </TableCell>
                          <TableCell>
                            <Select
                              items={itensEstoque}
                              value={estoqueIds[i] ?? ""}
                              onValueChange={(v) =>
                                setEstoqueIds((s) => ({ ...s, [i]: v ?? "" }))
                              }
                            >
                              <SelectTrigger className="h-8 w-full text-sm">
                                <SelectValue placeholder="Escolher item do estoque" />
                              </SelectTrigger>
                              <SelectContent>
                                {itensEstoque.map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    <span className="flex w-full items-center justify-between gap-2">
                                      <span>{op.label}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {semQuantidade && (
                <p className="text-xs text-muted-foreground">
                  Itens sem quantidade detectada ficam com o campo vazio — preencha antes de
                  confirmar.
                </p>
              )}
              {semEstoque && (
                <p className="text-xs text-muted-foreground">
                  Componentes marcados sem item do estoque selecionado não serão vinculados ao
                  contrato.
                </p>
              )}
            </div>

            {resultado.dimensoes && (
              <p className="text-xs text-zinc-500">
                Painel detectado: {resultado.tamanhoPainel} — as dimensões da calculadora serão
                ajustadas automaticamente.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {resultado ? (
            <>
              <Button variant="outline" onClick={reset} disabled={salvando}>
                Escolher outro arquivo
              </Button>
              <Button onClick={confirmar} disabled={salvando || linhasVinculaveis().length === 0}>
                {salvando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando contrato...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Criar contrato ({linhasVinculaveis().length} itens)
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => fechar(false)} disabled={lendo}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}