import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Loader2, MonitorPlay } from "lucide-react";
import { firebaseConfigurado } from "@/lib/firebase";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import Dashboard from "@/pages/dashboard";
import Estoque from "@/pages/estoque";
import Contratos from "@/pages/contratos";
import ContratoDetalhe from "@/pages/contrato-detalhe";
import ContratoImprimir from "@/pages/contrato-imprimir";
import Historico from "@/pages/historico";
import LoginPage from "@/pages/login";

function TelaConfiguracao() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="max-w-lg">
        <CardContent className="space-y-4 p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <MonitorPlay className="h-5 w-5 text-white" />
            </div>
            <p className="text-lg font-bold">LED Manager</p>
          </div>
          <p className="text-sm font-semibold text-red-600">
            Firebase não configurado.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Crie o arquivo <code className="rounded bg-muted px-1">.env</code> na raiz
              do projeto (copie de{" "}
              <code className="rounded bg-muted px-1">.env.example</code>).
            </li>
            <li>
              Preencha as chaves <code className="rounded bg-muted px-1">VITE_FIREBASE_*</code>{" "}
              com o config do seu app Web no console do Firebase.
            </li>
            <li>Habilite o Authentication (E-mail/Senha) no console do Firebase.</li>
            <li>Crie os usuários na coleção <code className="rounded bg-muted px-1">usuarios</code> no Firestore.</li>
            <li>Reinicie o servidor de desenvolvimento.</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            O passo a passo completo está no README.md do projeto.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function RotasProtegidas() {
  const { user, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/contratos" element={<Contratos />} />
          <Route path="/contratos/:id" element={<ContratoDetalhe />} />
          <Route path="/contratos/:id/imprimir" element={<ContratoImprimir />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  if (!firebaseConfigurado) return <TelaConfiguracao />;

  return (
    <AuthProvider>
      <RotasProtegidas />
    </AuthProvider>
  );
}
