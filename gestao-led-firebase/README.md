# LED Manager — Gestão de Estoque & Contratos (Firebase)

Sistema web para gestão de estoque e contratos de painéis de LED, hospedado 100% no
Firebase (**Firebase Hosting** + **Cloud Firestore**).

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Cloud Firestore (tempo real, com transações atômicas para o estoque)
- React Router (SPA) · Sonner (toasts)

## Funcionalidades

- **Dashboard**: valor do estoque em R$, contratos ativos, unidades provisionadas e
  alertas de estoque baixo (disponível < 10) — tudo em tempo real.
- **Estoque**: CRUD de produtos, filtro por categoria, busca e **Importar CSV**
  (com pré-visualização e upsert por LOTE).
- **Contratos**: painel Kanban por status; detalhes com vínculo de componentes e
  **Exportar Resumo (PDF)** via impressão do navegador.
- **Histórico**: coleção `logs` registra toda movimentação de estoque
  (entrada manual, baixa por contrato, estorno por cancelamento, importação CSV).
- **Regras de negócio** (executadas com `runTransaction`/`writeBatch` — atômicas,
  o estoque não quebra se a internet cair no meio):
  - `PROVISIONADO` / `SUSPENSO` → soma em `qtd_provisionado` (reduz o disponível)
  - `JA_SAIU` → reduz `qtd_total` e libera `qtd_provisionado`
  - `CANCELADO` → devolve a `qtd_provisionado` do pedido
  - `qtd_disponivel` é sempre calculada no front: `total − manutenção − provisionado`

## Coleções no Firestore

| Coleção          | Campos                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------- |
| `produtos`       | categoria, item, lote, descricao, qtd_total, qtd_manutencao, qtd_provisionado, valor_custo, valor_revenda |
| `contratos`      | ano_prov, status, cliente, tamanho_painel, prazo, observacoes                            |
| `contrato_itens` | id_contrato, id_produto, quantidade                                                      |
| `logs`           | data, usuario, acao, detalhes                                                            |

As coleções são criadas automaticamente na primeira gravação — não é preciso criar nada manualmente.

---

## Passo a passo: do zero ao ar

### 1. Criar o projeto no Console do Firebase

1. Acesse <https://console.firebase.google.com> e clique em **Adicionar projeto**.
2. Dê um nome (ex.: `led-manager`) e conclua (o Google Analytics é opcional).
3. No menu lateral, abra **Build → Firestore Database → Criar banco de dados**.
   - Escolha a localização (ex.: `southamerica-east1` para São Paulo).
   - Selecione **Modo de teste** (as regras definitivas serão publicadas no deploy).

### 2. Registrar o app Web e pegar as chaves

1. Na página inicial do projeto, clique no ícone **`</>` (Web)** para adicionar um app.
2. Dê um apelido (ex.: `led-manager-web`) — **não** precisa marcar o Hosting aqui.
3. O console exibirá o objeto `firebaseConfig`. Copie os valores.
4. No projeto, crie o arquivo `.env` a partir do exemplo e preencha:

```bash
cp .env.example .env     # no Windows: copy .env.example .env
```

```env
VITE_FIREBASE_API_KEY="AIza..."
VITE_FIREBASE_AUTH_DOMAIN="led-manager.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="led-manager"
VITE_FIREBASE_STORAGE_BUCKET="led-manager.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
VITE_FIREBASE_APP_ID="1:1234567890:web:abc123"
```

### 3. Rodar localmente

```bash
npm install
npm run dev
```

Abra <http://localhost:5173>. No primeiro acesso, o Dashboard oferece o botão
**"Carregar dados de exemplo"** (3 produtos + 1 contrato provisionado) para você
ver a lógica de estoque funcionando.

### 4. Instalar o Firebase CLI e conectar o projeto

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # selecione o projeto criado e dê o alias "default"
```

> O `firebase use --add` atualiza o arquivo `.firebaserc` (troque o placeholder
> `SEU-PROJETO-FIREBASE` pelo ID real, caso prefira editar manualmente).

### 5. Publicar as regras do Firestore

```bash
firebase deploy --only firestore:rules
```

> **Importante:** as regras incluídas (`firestore.rules`) estão **abertas** para o
> protótipo. Antes de colocar dados reais, ative o **Firebase Authentication** e
> troque a condição para `request.auth != null`.

### 6. Build e deploy do site

```bash
npm run build
firebase deploy --only hosting
```

Ao final, o CLI mostra a URL pública, algo como:

```
✔ Hosting URL: https://led-manager.web.app
```

### 7. Atualizações futuras

Sempre que alterar o código:

```bash
npm run build && firebase deploy --only hosting
```

---

## Estrutura do projeto

```
src/
├── lib/          # firebase.ts (config), types, constants, stock (regras), csv (parser), format
├── services/     # produtos, contratos, seed — transações e batched writes do Firestore
├── hooks/        # use-colecao (onSnapshot em tempo real)
├── components/   # ui (shadcn), layout, estoque, contratos, badges, metric-card...
└── pages/        # dashboard, estoque, contratos, contrato-detalhe, imprimir, historico
firebase.json     # Hosting (SPA rewrites) + Firestore
firestore.rules   # Regras de segurança
```

## Observações

- **Usuário do histórico**: defina seu nome no campo "Operador" no rodapé da barra
  lateral — ele é gravado em cada log de movimentação.
- **Importação CSV**: aceita `;` ou `,`, valores `R$ 1.234,56`, encoding
  UTF-8/ANSI, e faz upsert por LOTE em lotes de até 400 gravações por batch
  (limite do Firestore é 500).
- **PDF**: o botão "Imprimir / Salvar PDF" usa a impressão nativa do navegador —
  escolha "Salvar como PDF" no diálogo.
