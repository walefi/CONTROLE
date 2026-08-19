import { useState } from "react";
import { FileText, Loader2, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  extrairTudoDoContrato,
  pontuacaoItemEstoque,
  type DimensoesPainel,
  type ItemIdentificado,
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

type LinhaUI = {
  nome: string;
  quantidade: string;
  estoqueId: string;
  incluido: boolean;
  valor: number | null;
};

const formatarValor = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const [linhas, setLinhas] = useState<LinhaUI[]>([]);
  const [cliente, setCliente] = useState("");
  const [anoProv, setAnoProv] = useState("");
  const [prazo, setPrazo] = useState("");
  const [tamanhoPainel, setTamanhoPainel] = useState("");

  function reset() {
    setResultado(null);
    setNomeArquivo("");
    setLinhas([]);
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

  function atualizar(idx: number, patch: Partial<LinhaUI>) {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function adicionarLinha() {
    setLinhas((prev) => [
      ...prev,
      { nome: "", quantidade: "", estoqueId: "", incluido: true, valor: null },
    ]);
  }

  function removerLinha(idx: number) {
    setLinhas((prev) => prev.filter((_, i) => i !== idx));
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
      setLinhas(
        res.linhas.map((l) => ({
          nome: l.nome,
          quantidade: l.quantidade ? String(l.quantidade) : "",
          estoqueId: melhorItemEstoque(l.nome, produtos) ?? "",
          incluido: true,
          valor: l.valor,
        }))
      );
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível ler o arquivo.");
      setResultado(null);
    }
    setLendo(false);
  }

  function linhasVinculaveis(): LinhaUI[] {
    return linhas.filter(
      (l) => l.incluido && (parseInt(l.quantidade || "0", 10) || 0) > 0 && l.estoqueId
    );
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
        const produto = produtos.find((p) => p.id === linha.estoqueId);
        if (!produto) continue;
        const qtd = parseInt(linha.quantidade || "0", 10);
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

  const semQuantidade = linhas.some((l) => !l.quantidade);
  const semEstoque = linhas.some(
    (l) => l.incluido && (parseInt(l.quantidade || "0", 10) || 0) > 0 && !l.estoqueId
  );

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upload de Contrato (PDF)</DialogTitle>
          <DialogDescription>
            Envie o contrato em PDF. O sistema lista os componentes da tabela ITEM/QTD/VALOR —
            para cada um, escolha o item do estoque que atende, ou adicione componentes extras.
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
                  · {linhas.length} componente(s) listados
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
                Confira o nome e a quantidade, escolha o item do estoque que atende cada
                componente e adicione outros se necessário. Desmarque o que não for vendido neste
                contrato.
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
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((linha, i) => (
                      <TableRow key={i} className={cn(!linha.incluido && "opacity-50")}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-blue-600"
                            checked={linha.incluido}
                            onChange={(e) => atualizar(i, { incluido: e.target.checked })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-sm"
                            value={linha.nome}
                            onChange={(e) => atualizar(i, { nome: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            className="h-8 text-sm tabular-nums"
                            placeholder="?"
                            value={linha.quantidade}
                            onChange={(e) =>
                              atualizar(i, { quantidade: e.target.value.replace(/\D/g, "") })
                            }
                          />
                        </TableCell>
                        <TableCell className="tabular-nums text-zinc-500">
                          {linha.valor !== null ? formatarValor(linha.valor) : "—"}
                        </TableCell>
                        <TableCell>
                          <Select
                            items={itensEstoque}
                            value={linha.estoqueId}
                            onValueChange={(v) => atualizar(i, { estoqueId: v ?? "" })}
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
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => removerLinha(i)}
                            className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400"
                            title="Remover componente"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarLinha}
                disabled={salvando}
              >
                <Plus className="h-4 w-4" />
                Adicionar componente
              </Button>
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