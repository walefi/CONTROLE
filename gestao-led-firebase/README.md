# LED Manager — Gestão de Estoque & Contratos (Firebase)

Sistema web para gestão de estoque e contratos de painéis de LED, hospedado 100% no
Firebase (**Firebase Hosting** + **Cloud Firestore**).

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Cloud Firestore (tempo real, com transações atômicas para o estoque)
- Firebase Authentication (E-mail/Senha)
- React Router (SPA) · Sonner (toasts)

## Funcionalidades

- **Autenticação**: login com E-mail/Senha via Firebase Auth; dois perfis (ADMIN / OPERADOR).
- **Dashboard**: contratos ativos, unidades provisionadas e alertas de estoque baixo — tudo em tempo real.
- **Estoque**: CRUD de produtos (ADMIN), filtro por categoria, busca e **Importar CSV** (ADMIN).
- **Contratos**: painel Kanban por status; detalhes com vínculo de componentes e **Exportar Resumo (PDF)**.
- **Histórico de Movimentação**: registro automático de toda alteração de estoque (visível apenas para ADMIN).

## Perfis de Acesso

| Perfil     | Visão Financeira | Editar/Excluir Produtos | Criar Contratos | Alterar Status | Histórico |
|------------|------------------|------------------------|-----------------|----------------|-----------|
| ADMIN      | ✅               | ✅                      | ✅              | ✅             | ✅        |
| OPERADOR   | ❌               | ❌                      | ✅              | ✅             | ❌        |

---

## Passo a passo: do zero ao ar

### 1. Criar o projeto no Console do Firebase

1. Acesse <https://console.firebase.google.com> e clique em **Adicionar projeto**.
2. Dê um nome (ex.: `led-manager`) e conclua.
3. No menu lateral, abra **Build → Firestore Database → Criar banco de dados**.
   - Escolha a localização (ex.: `southamerica-east1` para São Paulo).
   - Selecione **Modo de teste** (as regras serão publicadas no deploy).
4. Abra **Build → Authentication → Iniciar**.
   - Escolha o método **E-mail/Senha** e ative-o.

### 2. Registrar o app Web e pegar as chaves

1. Na página inicial do projeto, clique no ícone **`</>` (Web)** para adicionar um app.
2. Dê um apelido (ex.: `led-manager-web`).
3. O console exibirá o objeto `firebaseConfig`. Copie os valores.
4. No projeto, crie o arquivo `.env` a partir do exemplo e preencha:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY="AIza..."
VITE_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="seu-projeto"
VITE_FIREBASE_STORAGE_BUCKET="seu-projeto.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abc123"
```

### 3. Criar usuários no Firebase

Crie os usuários **no console do Firebase** (Authentication → Usuários → Adicionar usuário):

1. Crie o usuário **ADMIN** (ex.: `admin@empresa.com` / `senha123`).
2. Crie o(s) usuário(s) **OPERADOR** (ex.: `operador@empresa.com` / `senha123`).

Em seguida, crie um documento na coleção `usuarios` no Firestore para cada usuário:

```
Coleção: usuarios
Documento: {uid_do_usuario}
  nome: "Nome do Usuário"
  email: "usuario@empresa.com"
  perfil: "ADMIN"   // ou "OPERADOR"
```

> **Importante**: o `uid` do documento deve ser o mesmo `uid` gerado pelo Firebase Auth.
> Para pegar o uid, vá em Authentication → Usuários → clique no usuário → copie o UID.

### 4. Rodar localmente

```bash
npm install
npm run dev
```

Abra <http://localhost:5173> e faça login com as credenciais criadas.

### 5. Instalar o Firebase CLI e conectar o projeto

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

### 6. Publicar as regras do Firestore

```bash
firebase deploy --only firestore:rules
```

### 7. Build e deploy do site

```bash
npm run build
firebase deploy --only hosting
```

O CLI mostra a URL pública: `https://seu-projeto.web.app`

### 8. Deploy via Vercel/Netlify (alternativa)

O projeto também pode ser hospedado no **Vercel** ou **Netlify**:

1. Conecte o repositório Git ao Vercel/Netlify.
2. Configure as variáveis de ambiente (`VITE_FIREBASE_*`) no painel da plataforma.
3. O build é automaticamente: `npm run build` → pasta `dist/`.

**Vercel** (recomendado):
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

**Netlify**:
- Build command: `npm run build`
- Publish directory: `dist`
- Adicione um `_redirects` ou configure rewrites SPA → `/index.html`

### 9. Atualizações futuras

Sempre que alterar o código:

```bash
npm run build && firebase deploy --only hosting
```

---

## Coleções no Firestore

| Coleção          | Campos                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------- |
| `produtos`       | categoria, item, lote, descricao, qtd_total, qtd_manutencao, qtd_provisionado, valor_custo, valor_revenda |
| `contratos`      | ano_prov, status, cliente, tamanho_painel, prazo, observacoes                            |
| `contrato_itens` | id_contrato, id_produto, quantidade                                                      |
| `logs`           | data, usuario, acao, detalhes, id_produto, lote, quantidade_alterada                    |
| `usuarios`       | nome, email, perfil (ADMIN/OPERADOR)                                                     |

## Estrutura do projeto

```
src/
├── lib/          # firebase.ts, auth-context.tsx, types, constants, stock, csv, format
├── services/     # produtos, contratos, seed — transações e batched writes do Firestore
├── hooks/        # use-colecao (onSnapshot em tempo real)
├── components/   # ui (shadcn), layout, estoque, contratos, badges, metric-card...
└── pages/        # login, dashboard, estoque, contratos, contrato-detalhe, imprimir, historico
```

## Observações

- **IMPORTANTE**: crie os usuários no Firebase Auth **e** na coleção `usuarios` no Firestore antes de usar.
- **Importação CSV**: aceita `;` ou `,`, valores `R$ 1.234,56`, encoding UTF-8/ANSI.
- **PDF**: o botão "Imprimir / Salvar PDF" usa a impressão nativa do navegador.
