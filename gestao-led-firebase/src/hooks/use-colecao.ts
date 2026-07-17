import { useEffect, useState } from "react";
import {
  collection,
  limit as limitFn,
  onSnapshot,
  orderBy,
  query,
  type QueryConstraint,
} from "firebase/firestore";
import { db, firebaseConfigurado } from "@/lib/firebase";

type Opcoes = {
  ordenarPor?: string;
  direcao?: "asc" | "desc";
  limite?: number;
};

export function useColecao<T extends { id: string }>(nome: string, opcoes?: Opcoes) {
  const [dados, setDados] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const ordenarPor = opcoes?.ordenarPor;
  const direcao = opcoes?.direcao ?? "asc";
  const limite = opcoes?.limite;

  useEffect(() => {
    if (!firebaseConfigurado) {
      setCarregando(false);
      return;
    }
    const restricoes: QueryConstraint[] = [];
    if (ordenarPor) restricoes.push(orderBy(ordenarPor, direcao));
    if (limite) restricoes.push(limitFn(limite));
    const ref = restricoes.length
      ? query(collection(db, nome), ...restricoes)
      : collection(db, nome);

    const cancelar = onSnapshot(
      ref,
      (snap) => {
        setDados(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[]);
        setCarregando(false);
        setErro(null);
      },
      (e) => {
        console.error(`Erro ao ler coleção ${nome}:`, e);
        setErro(e.message);
        setCarregando(false);
      }
    );
    return cancelar;
  }, [nome, ordenarPor, direcao, limite]);

  return { dados, carregando, erro };
}
