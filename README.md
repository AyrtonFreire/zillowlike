# 🏠 Zillowlike - Plataforma de Imóveis (Petrolina/PE & Juazeiro/BA)

Plataforma completa de anúncios de imóveis com sistema de fila de corretores, mural de leads e notificações em tempo real.

## 🚀 Stack Tecnológica

### Frontend
- **Next.js 15** (App Router) + TypeScript
- **TailwindCSS 4** para estilização
- **Leaflet + React-Leaflet** (mapa interativo com clusters)
- **Recharts** (dashboards e gráficos)
- **Pusher** (notificações tempo real)

### Backend
- **Prisma ORM** + **PostgreSQL** (Supabase)
- **NextAuth.js** (autenticação OAuth - GitHub/Google)
- **BullMQ** + **Redis** (filas de processamento)
- **Cloudinary** (upload e otimização de imagens)

### Infraestrutura
- **Vercel** (hosting e deploy automático)
- **Supabase** (PostgreSQL gerenciado)
- **Upstash** (Redis serverless)
- **Pusher** (WebSockets para tempo real)

---

## 📚 Documentação

- **[Guia Rápido (QUICK_START.md)](./QUICK_START.md)** - Primeiros passos
- **[Setup Ambiente Beta (DEV_ENVIROMENT_SETUP.md)](./DEV_ENVIROMENT_SETUP.md)** - Configuração completa local
- **[Deploy Público (DEPLOY_BETA.md)](./DEPLOY_BETA.md)** - Deploy para produção/staging
- **[Variáveis de Ambiente (ENV_PRODUCTION_TEMPLATE.md)](./ENV_PRODUCTION_TEMPLATE.md)** - Template de .env
- **[Funções e Sistemas (FUNCOES_E_SISTEMAS.md)](./FUNCOES_E_SISTEMAS.md)** - Documentação técnica detalhada

---

## ⚡ Quick Start

### Desenvolvimento Local

```bash
# 1. Clone o repositório
git clone https://github.com/AyrtonFreire/zillowlike.git
cd zillowlike

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais (Supabase, OAuth, etc.)

# 4. Rode migrations
npx prisma migrate dev

# 5. Valide banco limpo
npm run db:validate

# 6. Crie seu admin
npm run create-admin

# 7. Inicie servidor
npm run dev
```

Acesse `http://localhost:3000`

### Deploy Público (Beta/Staging)

Ver guia completo em **[DEPLOY_BETA.md](./DEPLOY_BETA.md)**

```bash
# Via Vercel CLI
npm i -g vercel
vercel login
vercel
```

## Funcionalidades
- Cadastro de imóveis em `/owner/new` com:
  - Título, descrição, preço (R$), tipo
  - Endereço (com geocodificação gratuita pelo Nominatim)
  - Imagens por URL (sem custo)
- Busca com filtros (cidade, estado, tipo, preço) e palavra-chave
- Lista + Mapa: marcadores mostram o preço e linkam para detalhes
- Página de detalhes com galeria e mini mapa

## Limitações e custos
- Nominatim tem limites de uso; evite abusos. Pode adicionar cache e debounce.
- Imagens por URL (sem upload). Futuro: S3/Cloudinary; hoje mantemos grátis.
- SQLite é local; para produção, use Postgres grátis (Neon/Supabase) e ajuste `DATABASE_URL`.

## Autenticação
- Usa NextAuth com GitHub.
- Crie um OAuth App no GitHub e defina envs:
  - `GITHUB_ID`, `GITHUB_SECRET`
  - `AUTH_SECRET` (use `openssl rand -base64 32`)
- Em dev, o POST de imóveis permite sem login; em produção exige login.

### Variáveis de ambiente (local)
```
DATABASE_URL="file:./dev.db"
AUTH_SECRET=changeme-dev
GITHUB_ID=...
GITHUB_SECRET=...
```

### Deploy (Vercel + Neon)
1) Criar banco Postgres (Neon) e obter `DATABASE_URL` (pegar a URL de pool se disponível).
2) No projeto Vercel, em Settings → Environment Variables, setar: `DATABASE_URL`, `AUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`.
3) O build já roda `prisma migrate deploy` (via `package.json`).
4) Opcional: rodar seed localmente (`npm run seed`) antes do deploy.
5) Em produção, criação de imóvel exige login (GitHub OAuth callback: `/api/auth/callback/github`).

## Melhorias futuras
- Autenticação para proprietários (GitHub/Email via NextAuth)
- Upload de imagens (S3 compatível, ex: Cloudflare R2)
- Desenho de área no mapa e filtros avançados (quartos, banheiros, m²)
- SEO e metadados por imóvel
- Paginação/infini-scroll e skeletons
- Testes e monitoração

## Estrutura
- `src/app/page.tsx`: busca, filtros, lista + mapa
- `src/app/owner/new/page.tsx`: formulário de cadastro
- `src/app/property/[id]/page.tsx`: detalhes do imóvel
- `src/app/api/properties/route.ts`: API (GET filtros, POST criar)
- `src/components/Map.tsx`: componente de mapa com marcadores
- `src/lib/prisma.ts`: cliente Prisma
- `src/lib/geocode.ts`: util de geocodificação (Nominatim)

## Créditos
- Baseado em Next.js + app-tw template.
- Mapas por OpenStreetMap.
