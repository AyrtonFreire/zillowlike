# Zillowlike (Petrolina/PE & Juazeiro/BA)

Site gratuito inspirado no Zillow para cadastrar e buscar imóveis com lista e mapa interativo (OpenStreetMap + Leaflet).

## Tecnologias
- Next.js (App Router) + TypeScript
- Tailwind (tema inline do template)
- Prisma + SQLite (grátis, arquivo local)
- Leaflet + React-Leaflet (mapa e marcadores com preço)
- Nominatim (OpenStreetMap) para geocodificação grátis

## Rodando localmente
```bash
npm install
npm run dev
```
Acesse `http://localhost:3000`.

## Banco e ORM
- Arquivo `.env` já aponta para SQLite local: `DATABASE_URL="file:./dev.db"`.
- Schema em `prisma/schema.prisma`.
- Gerar cliente após alterações no schema:
```bash
npx prisma migrate dev --name change
npx prisma generate
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
