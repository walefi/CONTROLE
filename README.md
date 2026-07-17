# CONTROLE — Gestão de Estoque & Contratos de Painéis de LED

Monorepo com duas implementações do sistema **LED Manager**:

| Pasta                  | Stack                                              | Banco de dados          | Deploy alvo               |
| ---------------------- | -------------------------------------------------- | ----------------------- | ------------------------- |
| `gestao-led/`          | Next.js 15 + Server Actions + Prisma               | SQLite (local) / Postgres | Vercel + Supabase         |
| `gestao-led-firebase/` | Vite + React 19 SPA + Firebase SDK                 | Cloud Firestore         | Firebase Hosting          |

Ambas incluem: Dashboard com alertas de estoque baixo, CRUD de produtos com
importação CSV (upsert por lote), Kanban de contratos, automação de estoque por
status (Provisionado / Suspenso / Já Saiu / Cancelado), exportação de resumo em
PDF e histórico de movimentações.

Consulte o `README.md` dentro de cada pasta para instruções de execução e deploy.
