# Documento para Investidor — Infraestrutura, Escalabilidade, Performance e Custos (ZillowLike)

> Baseado em análise do repositório `AyrtonFreire/zillowlike` (stack, configs, dependências, workers, filas, DB, realtime, observabilidade e deploy).

---

## 1) Visão executiva (1 minuto)
O projeto está construído em uma arquitetura moderna e “cloud-friendly”, com pilares sólidos para escalar:

- **Frontend + Backend**: Next.js 15 (App Router) rodando como aplicação Node (SSR + API Routes).
- **Banco**: PostgreSQL com **Prisma** (migrations + Prisma Client).
- **Jobs assíncronos**: **BullMQ + Redis** e **workers dedicados** (escala horizontal).
- **Tempo real (realtime)**: **Pusher** (server + client), com canais de chat e eventos de leads.
- **Emails**: integração com **Resend** (com fallback de mock em dev).
- **Observabilidade**: **Sentry** (server + client, amostragem configurável) + **Vercel Speed Insights**.
- **Segurança**: middleware RBAC + security headers (CSP/HSTS etc) + rate limiting (Redis se configurado; fallback em memória).

**Conclusão**: a base já está bem preparada para scaling por:

- aplicação stateless (JWT) → escala horizontal simples
- processamento pesado via filas/workers
- realtime terceirizado
- portabilidade de deploy (Vercel e Docker)

---

## 2) Arquitetura atual (componentes)

### 2.1 Aplicação Web (Next.js)
- **Next.js 15.5.9**, React 19.
- `next.config.ts`:
  - `output: 'standalone'` (bom para Docker/K8s)
  - `images.unoptimized: true` (ver nota em Performance)

**Pontos fortes**
- monolito modular (ideal para fase inicial)
- fácil escalar horizontalmente (múltiplas instâncias)

**Riscos previsíveis**
- SSR + endpoints API no mesmo serviço podem competir por CPU/DB conforme cresce (mitigável com cache/replicas e, no futuro, separação de serviços)

---

### 2.2 Autenticação e Autorização
- **NextAuth** com estratégia **JWT**.
- Providers:
  - Credentials (email/senha)
  - GitHub/Google (OAuth)
- `src/middleware.ts`:
  - protege `/broker`, `/admin`, `/owner`, `/dashboard`, `/realtor`
  - controle RBAC por role

**Escalabilidade**
- JWT é excelente para escala horizontal (não requer sessões server-side).

**Observação**
- Há consulta ao DB no callback JWT para garantir role atualizada (baixo custo; pode ser otimizado futuramente com cache, se necessário).

---

### 2.3 Banco de dados (PostgreSQL + Prisma)
- `prisma/schema.prisma`: modelos para `Property`, `Lead`, chat/mensagens, eventos, RBAC e estruturas de fila.
- Muitos índices já definidos para consultas comuns (status/datas/etc.).

**Escalabilidade**
- Postgres escala muito bem para MVP → crescimento, com:
  - índices corretos (vocês já têm)
  - pool de conexões
  - read replicas (quando leitura crescer)
  - arquivamento/particionamento (para históricos/eventos em escala)

**Nota técnica**
- `directUrl = env("DIRECT_URL")` no Prisma sugere preparo para separar URL de pooling vs migrations.

---

### 2.4 Fila e Jobs assíncronos (Redis + BullMQ + Workers)
- Dependências: `bullmq`, `ioredis`.
- `docker-compose.yml` provisiona `redis` e `worker` com `replicas: 2`.
- `src/workers/index.ts`: workers com concurrency por fila.
- `src/lib/queue/config.ts`: Redis opcional (queues desabilitam se não configurado; evita problemas em build).

**Detalhes operacionais** (queues existentes, schedules, env vars, deploy do worker, runbooks e riscos de serverless) estão em:

`REDIS_QUEUES_WORKERS_RUNBOOK.md`

**Escalabilidade**
- Excelente: workers escalam horizontalmente e independentes do app.

**Riscos típicos**
- Redis é infraestrutura crítica (precisa monitoramento/alta disponibilidade conforme escala).

---

### 2.5 Realtime (Pusher)
- `pusher-js` (client) + `pusher` (server).
- Canais de chat e eventos de lead.

**Escalabilidade**
- terceiriza WebSockets; reduz custo operacional no começo.

**Risco**
- custo cresce com conexões/mensagens simultâneas; no futuro pode-se avaliar alternativas (Ably/Supabase Realtime/self-host) conforme tração.

---

### 2.6 Imagens e Uploads (Cloudinary)
- Uso de Cloudinary para transforms/entrega.
- `next.config.ts` permite `res.cloudinary.com`.
- `images.unoptimized: true`: a otimização deve ser feita via Cloudinary (CDN + transforms).

**Escalabilidade**
- Cloudinary é adequado para grande volume de mídia e performance global.

---

### 2.7 Emails (Resend)
- `src/lib/email.ts` usa `RESEND_API_KEY`.

**Escalabilidade**
- fornecedor gerenciado; custo cresce com volume e reputação.

---

### 2.8 Observabilidade (Sentry + métricas)
- `sentry.server.config.ts` e `sentry.client.config.ts`.
- `tracesSampleRate: 0.1` em produção.
- Replay habilitado no client (sessão 10%, on-error 100%).

**Nota de custo**
- replay pode encarecer em tráfego alto; pode ser ajustado por ambiente.

---

### 2.9 Segurança
- Middleware com RBAC.
- Security headers (`src/lib/security-headers.ts`): CSP, HSTS, X-Frame-Options etc.
- Rate limiting (`src/lib/rate-limiter.ts`) **em Redis quando configurado (fallback em memória)**.

**Ponto de atenção**
- rate limit em memória não é consistente em escala horizontal.
- futuro: rate limiting em Redis.

---

## 3) Capacidade atual (qual “tamanho” aguenta?)
Sem métricas reais em produção, não dá para cravar TPS/MAU. Porém, pela arquitetura:

- escala horizontal do app é natural (JWT/stateless)
- jobs pesados foram desenhados para workers
- Postgres/Redis/Pusher são componentes que escalam bem com plano gerenciado

Gargalos típicos ao crescer:

- DB: conexões/queries
- realtime: conexões simultâneas e eventos
- mídia: bandwidth/transforms

---

## 4) Performance (o que está bom e o que pode virar gargalo)

**Bem encaminhado**
- Cloudinary para mídia (CDN)
- processamento assíncrono (BullMQ)
- observabilidade habilitada

**Gargalos previsíveis e mitigação**
- SSR e queries repetidas → cache (Redis), `revalidate`, otimização de queries.
- `images.unoptimized` → manter transforms via Cloudinary e garantir tamanhos responsivos.
- Geocode via Nominatim (OpenStreetMap) → em escala, migrar para provider pago ou caching agressivo.

---

## 5) Plano de scaling (roadmap técnico)

### Fase 1 — até ~10k–100k MAU (tráfego moderado)
- Vercel ou containers com autoscaling simples
- Postgres gerenciado (Neon/Supabase/RDS)
- Redis gerenciado (Upstash/Redis Cloud)
- aumentar réplicas de workers conforme fila
- mover rate limit para Redis

### Fase 2 — escala maior
- separar serviços (web/app vs workers vs APIs mais pesadas)
- DB: read replicas + otimizações de leitura
- introduzir search engine (Typesense/Meilisearch/Elastic) para listagens
- revisar realtime (manter Pusher enquanto custo-benefício for bom)

Notas operacionais (config/variáveis de ambiente e execução de worker) estão no `REDIS_QUEUES_WORKERS_RUNBOOK.md`.

---

## 6) Custos (drivers + estimativas)
> Valores variam por fornecedor/região e volume. Abaixo: **drivers e ordem de grandeza**.

### 6.1 Hospedagem (Next.js)
- **Vercel**: sobe com bandwidth e compute/concurrency.
- **Docker/Cloud Run/K8s**: custo mais previsível, porém maior custo operacional.

### 6.2 Banco (Postgres)
- drivers: CPU/RAM, storage, IOPS, conexões.
- em escala: vira um dos maiores custos (junto com mídia/realtime).

### 6.3 Redis
- drivers: memória e throughput.
- barato no começo; essencial para filas em escala.

### 6.4 Realtime (Pusher)
- drivers: conexões simultâneas e mensagens.

### 6.5 Mídia (Cloudinary)
- drivers: bandwidth, storage, transforms.

### 6.6 Emails (Resend)
- drivers: volume de envio.

### 6.7 Observabilidade (Sentry)
- drivers: eventos, traces, replays.

---

## 7) Riscos atuais (e mitigação rápida)
- **Rate limiting sem Redis (fallback em memória)** → configurar Redis em produção para consistência em escala.
- **Nominatim em produção** (limites de uso) → provider pago + cache.
- **Conexões Prisma em serverless** → pooling (PgBouncer) e ajuste de deploy.
- **Pusher auth**: garantir validação de canais privados/presence conforme permissões.

Riscos e mitigação específicos de Redis/queues/workers estão no `REDIS_QUEUES_WORKERS_RUNBOOK.md`.

---

## 8) Resposta “investidor-ready”: Estamos prontos para escalar?
Sim. O projeto já possui pilares para crescimento:

- app stateless (JWT) → escala horizontal
- workers + Redis → processamento assíncrono escalável
- Pusher → realtime sem operar infra websocket
- Postgres + Prisma → consistência e evolução segura
- Sentry + métricas → operável em produção
- Dockerfiles + Vercel → portabilidade

---

## 9) Perguntas (para eu personalizar com números)
Se você me passar:

- onde está hospedado hoje (Vercel? VPS? AWS?)
- volume atual (pageviews/dia, imóveis, leads/dia, corretores ativos)
- região alvo

Eu consigo estimar custos mensais mais “fechados” e colocar um slide com cenários (MVP / crescimento / escala).
