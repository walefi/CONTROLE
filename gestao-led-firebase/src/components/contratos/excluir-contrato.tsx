import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { excluirContrato } from "@/services/contratos";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

export function ExcluirContratoButton({
  id,
  anoProv,
}: {
  id: string;
  anoProv: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onConfirm() {
    setLoading(true);
    const res = await excluirContrato(id);
    setLoading(false);
    if (res.ok) {
      toast.success(res.message);
      setOpen(false);
      navigate("/contratos");
    } else {
      toast.error(res.message);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir contrato"
        description={`Tem certeza que deseja excluir o contrato ${anoProv}? As reservas de estoque serão liberadas automaticamente.`}
        loading={loading}
        onConfirm={onConfirm}
      />
    </>
  );
}
