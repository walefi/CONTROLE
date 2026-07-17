import { useState } from "react";
import { toast } from "sonner";
import { atualizarContrato } from "@/services/contratos";
import type { Contrato } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContratoForm({ contrato }: { contrato: Contrato }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    ano_prov: contrato.ano_prov,
    cliente: contrato.cliente,
    tamanho_painel: contrato.tamanho_painel,
    prazo: contrato.prazo || "",
    observacoes: contrato.observacoes,
  });

  function set(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await atualizarContrato(contrato.id, form);
    setLoading(false);
    if (res.ok) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informações do Contrato</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ano_prov">Ano/Prov</Label>
            <Input
              id="ano_prov"
              value={form.ano_prov}
              onChange={(e) => set("ano_prov", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Input
              id="cliente"
              value={form.cliente}
              onChange={(e) => set("cliente", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tamanho_painel">Tamanho do Painel</Label>
            <Input
              id="tamanho_painel"
              value={form.tamanho_painel}
              onChange={(e) => set("tamanho_painel", e.target.value)}
              placeholder="Ex: 4,00m x 2,00m"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prazo">Prazo</Label>
            <Input
              id="prazo"
              type="date"
              value={form.prazo}
              onChange={(e) => set("prazo", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
