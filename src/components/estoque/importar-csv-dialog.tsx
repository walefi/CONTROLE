"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { importarProdutos } from "@/app/actions/produtos";
import {
  CAMPO_LABEL,
  CAMPOS_IMPORTACAO,
  decodificarCsv,
  lerCsvProdutos,
  type ResultadoCsv,
} from "@/lib/csv";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ImportarCsvDialog() {
  const [open, setOpen] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [resultado, setResultado] = useState<ResultadoCsv | null>(null);

  function reset() {
    setResultado(null);
    setNomeArquivo("");
    setLendo(false);
  }

  function fechar(o: boolean) {
    if (importando) return;
    setOpen(o);
    if (!o) reset();
  }

  async function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setLendo(true);
    setNomeArquivo(arquivo.name);
    try {
      const texto = decodificarCsv(await arquivo.arrayBuffer());
      const res = lerCsvProdutos(texto);
      if (res.produtos.length === 0) {
        toast.error("Nenhum item válido encontrado no arquivo.");
        setResultado(null);
      } else {
        setResultado(res);
      }
    } catch (erro) {
      toast.error(
        erro instanceof Error ? erro.message : "Não foi possível ler o arquivo."
      );
      setResultado(null);
    }
    setLendo(false);
  }

  async function confirmar() {
    if (!resultado) return;
    setImportando(true);
    const res = await importarProdutos(resultado.produtos);
    setImportando(false);
    if (res.ok) {
      toast.success(res.message);
      setOpen(false);
      reset();
    } else {
      toast.error(res.message);
    }
  }

  const preview = resultado?.produtos.slice(0, 5) ?? [];

  return (
    <>
      <Button variant="outline" onClick={() => fechar(true)}>
        <Upload className="h-4 w-4" />
        Importar via CSV
      </Button>
      <Dialog open={open} onOpenChange={fechar}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar Estoque via CSV</DialogTitle>
            <DialogDescription>
              Migre sua planilha antiga. Lotes já existentes serão atualizados; os
              demais serão criados como novos produtos.
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
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {lendo
                    ? `Processando "${nomeArquivo}"...`
                    : "Clique para selecionar o arquivo .csv"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Colunas esperadas: ITEM, LOTE, DESCRIÇÃO, QTD TOTAL, MANUTENÇÃO,
                  PROVISIONADO, Valor Unit, REVENDA
                </p>
              </div>
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
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
                    · {resultado.produtos.length} item(ns) válido(s)
                    {resultado.ignoradas > 0 &&
                      ` · ${resultado.ignoradas} linha(s) ignorada(s)`}
                  </span>
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Mapeamento de colunas detectado
                </p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {CAMPOS_IMPORTACAO.map((campo) => (
                    <div
                      key={campo}
                      className="rounded-md border bg-muted/40 px-2 py-1.5 text-xs"
                    >
                      <p className="font-medium">{CAMPO_LABEL[campo]}</p>
                      <p
                        className={cn(
                          "truncate",
                          resultado.colunas[campo]
                            ? "text-muted-foreground"
                            : "text-red-600"
                        )}
                      >
                        {resultado.colunas[campo]
                          ? `\u2190 ${resultado.colunas[campo]}`
                          : "não encontrada"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pré-visualização (5 primeiros itens)
                </p>
                <div className="rounded-lg border">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Manut.</TableHead>
                        <TableHead className="text-right">Prov.</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Revenda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>{p.categoria}</TableCell>
                          <TableCell className="font-mono">{p.lote || "—"}</TableCell>
                          <TableCell className="max-w-48 truncate">
                            {p.descricao || p.item}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {p.qtdTotal}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {p.qtdManutencao}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {p.qtdProvisionado}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {brl(p.valorCusto)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {brl(p.valorRevenda)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {resultado.produtos.length > 5 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    ... e mais {resultado.produtos.length - 5} item(ns) no arquivo.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {resultado ? (
              <>
                <Button variant="outline" onClick={reset} disabled={importando}>
                  Escolher outro arquivo
                </Button>
                <Button onClick={confirmar} disabled={importando}>
                  {importando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    `Confirmar Importação (${resultado.produtos.length})`
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
    </>
  );
}
