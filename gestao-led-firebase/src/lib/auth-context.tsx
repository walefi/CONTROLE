import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { authInstance, db, firebaseConfigurado } from "@/lib/firebase";

export type Perfil = "ADMIN" | "OPERADOR";

type AuthState = {
  user: User | null;
  perfil: Perfil;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  perfil: "OPERADOR",
  carregando: true,
  login: async () => ({ ok: false, message: "Não autenticado" }),
  logout: async () => {},
  isAdmin: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil>("OPERADOR");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!firebaseConfigurado || !authInstance) {
      setCarregando(false);
      return;
    }

    const cancelar = onAuthStateChanged(authInstance, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "usuarios", u.uid));
          if (snap.exists()) {
            const dados = snap.data();
            setPerfil(dados.perfil === "ADMIN" ? "ADMIN" : "OPERADOR");
            localStorage.setItem("led_manager_usuario", dados.nome || u.email || "Operador");
          } else {
            setPerfil("OPERADOR");
            localStorage.setItem("led_manager_usuario", u.email || "Operador");
          }
        } catch {
          setPerfil("OPERADOR");
        }
      } else {
        setPerfil("OPERADOR");
      }
      setCarregando(false);
    });

    return cancelar;
  }, []);

  async function login(email: string, senha: string) {
    if (!authInstance) {
      return { ok: false, message: "Firebase não configurado." };
    }
    try {
      await signInWithEmailAndPassword(authInstance, email, senha);
      return { ok: true, message: "Login realizado com sucesso." };
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Erro ao fazer login.";
      if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("auth/user-not-found")) {
        return { ok: false, message: "E-mail ou senha incorretos." };
      }
      return { ok: false, message: msg };
    }
  }

  async function logout() {
    if (authInstance) {
      await signOut(authInstance);
    }
    setPerfil("OPERADOR");
  }

  return (
    <AuthContext.Provider
      value={{ user, perfil, carregando, login, logout, isAdmin: perfil === "ADMIN" }}
    >
      {children}
    </AuthContext.Provider>
  );
}
