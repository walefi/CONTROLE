import { useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { semAcentos } from "@/lib/csv";
import {
  extrairTextoPdf,
  identificarItensDoContrato,
  type DimensoesPainel,
  type ItemIdentificado,
  type ResultadoIdentificacao,
} from "@/lib/contrato-pdf";
import type { Produto } from "@/lib/types";
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

export function UploadContratoDialog({ open, onOpenChange, produtos, onContratoCriado }: Props) {
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [resultado, setResultado] = useState<ResultadoIdentificacao | null>(null);
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [incluidos, setIncluidos] = useState<Record<string, boolean>>({});
  const [cliente, setCliente] = useState("");
  const [anoProv, setAnoProv] = useState("");
  const [prazo, setPrazo] = useState("");
  const [tamanhoPainel, setTamanhoPainel] = useState("");

  function reset() {
    setResultado(null);
    setNomeArquivo("");
    setQuantidades({});
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

  function alterarQuantidade(produtoId: string, valor: string) {
    const limpo = valor.replace(/\D/g, "");
    setQuantidades((q) => ({ ...q, [produtoId]: limpo }));
  }

  async function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setLendo(true);
    setNomeArquivo(arquivo.name);
    try {
      const texto = await extrairTextoPdf(arquivo);
      if (!semAcentos(texto).replace(/\s/g, "")) {
        throw new Error(
          "Nenhum texto encontrado no PDF. Verifique se o arquivo é um PDF com texto selecionável (não escaneado/imagem)."
        );
      }
      const res = identificarItensDoContrato(texto, produtos);
      if (res.itens.length === 0) {
        throw new Error(
          "Nenhum componente do estoque foi identificado no contrato. Confira se os nomes dos produtos cadastrados aparecem no PDF."
        );
      }
      setResultado(res);
      setCliente(res.cliente);
      setAnoProv(res.anoProv);
      setTamanhoPainel(res.tamanhoPainel);
      setQuantidades(
        Object.fromEntries(res.itens.map((i) => [i.produtoId, i.quantidade ? String(i.quantidade) : ""]))
      );
      setIncluidos(Object.fromEntries(res.itens.map((i) => [i.produtoId, true])));
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível ler o arquivo.");
      setResultado(null);
    }
    setLendo(false);
  }

  function itensValidos(): ItemIdentificado[] {
    if (!resultado) return [];
    return resultado.itens.filter(
      (i) => incluidos[i.produtoId] && (parseInt(quantidades[i.produtoId] || "0", 10) || 0) > 0
    );
  }

  async function confirmar() {
    if (!resultado) return;
    const validos = itensValidos();
    if (validos.length === 0) {
      toast.error("Marque ao menos um componente com quantidade maior que zero.");
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
      for (const item of validos) {
        const r = await adicionarItem(
          res.id,
          item.produtoId,
          parseInt(quantidades[item.produtoId] || "0", 10)
        );
        if (r.ok) {
          vinculados.push(item);
        } else {
          toast.error(`"${item.item}": ${r.message}`);
        }
      }

      if (vinculados.length === validos.length) {
        toast.success(`Contrato ${anoProv.trim()} criado com ${vinculados.length} componente(s).`);
      } else {
        toast.warning(
          `Contrato criado, mas ${validos.length - vinculados.length} componente(s) não foram vinculados.`
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

  const semQuantidade = resultado?.itens.some((i) => !quantidades[i.produtoId]);

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Upload de Contrato (PDF)</DialogTitle>
          <DialogDescription>
            Envie o contrato em PDF. O sistema identifica os componentes vendidos, cria o
            contrato e pré-seleciona os itens na calculadora.
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
                  · {resultado.itens.length} componente(s) identificado(s)
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
              <Label className="text-sm">Componentes identificados</Label>
              <p className="text-xs text-zinc-500">
                Desmarque o que não for vendido neste contrato e confira as quantidades.
              </p>
              <div className="rounded-lg border">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Componente</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead className="w-28">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultado.itens.map((item) => {
                      const incluido = incluidos[item.produtoId] ?? true;
                      return (
                        <TableRow key={item.produtoId} className={cn(!incluido && "opacity-50")}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-blue-600"
                              checked={incluido}
                              onChange={(e) =>
                                setIncluidos((s) => ({ ...s, [item.produtoId]: e.target.checked }))
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.item}</TableCell>
                          <TableCell>{item.categoria}</TableCell>
                          <TableCell className="font-mono">{item.lote || "—"}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 text-sm tabular-nums"
                              placeholder="?"
                              value={quantidades[item.produtoId] ?? ""}
                              onChange={(e) => alterarQuantidade(item.produtoId, e.target.value)}
                            />
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
              <Button onClick={confirmar} disabled={salvando || itensValidos().length === 0}>
                {salvando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando contrato...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Criar contrato ({itensValidos().length} itens)
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