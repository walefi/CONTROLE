import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { criarContrato } from "@/services/contratos";
import { STATUS_LIST, STATUS_META, type Status } from "@/lib/constants";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function formInicial() {
  return {
    ano_prov: `${new Date().getFullYear()}/`,
    cliente: "",
    tamanho_painel: "",
    prazo: "",
    observacoes: "",
    status: "ORCAMENTO" as Status,
  };
}

const STATUS_ITEMS = STATUS_LIST.map((s) => ({
  value: s as string,
  label: STATUS_META[s].label,
}));

export function NovoContratoDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(formInicial());

  function abrir(o: boolean) {
    setOpen(o);
    if (o) setForm(formInicial());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await criarContrato(form);
    setLoading(false);
    if (res.ok) {
      toast.success(res.message);
      setOpen(false);
      if (res.id) navigate(`/contratos/${res.id}`);
    } else {
      toast.error(res.message);
    }
  }

  return (
    <>
      <Button onClick={() => abrir(true)}>
        <Plus className="h-4 w-4" />
        Novo Contrato
      </Button>
      <Dialog open={open} onOpenChange={abrir}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
            <DialogDescription>
              Crie um pedido e depois vincule os componentes do estoque na tela de
              detalhes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ano_prov">Ano/Prov *</Label>
                <Input
                  id="ano_prov"
                  value={form.ano_prov}
                  onChange={(e) => setForm((f) => ({ ...f, ano_prov: e.target.value }))}
                  placeholder="Ex: 2026/002"
                />
              </div>
              <div className="space-y-2">
                <Label>Status inicial</Label>
                <Select
                  items={STATUS_ITEMS}
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
                          {STATUS_META[s].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={form.cliente}
                  onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tamanho_painel">Tamanho do Painel</Label>
                <Input
                  id="tamanho_painel"
                  value={form.tamanho_painel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tamanho_painel: e.target.value }))
                  }
                  placeholder="Ex: 4,00m x 2,00m"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prazo">Prazo</Label>
                <Input
                  id="prazo"
                  type="date"
                  value={form.prazo}
                  onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, observacoes: e.target.value }))
                  }
                  rows={2}
                  placeholder="Detalhes do pedido..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Contrato"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
