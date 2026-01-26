# Redis, Queues e Workers — Runbook Operacional (ZillowLike)

> Documento operacional para configurar, operar e escalar Redis/BullMQ/workers e tarefas agendadas.

---

## 1) Objetivo

Este runbook descreve:

- Como Redis é usado no projeto (filas, cache e rate limit)
- Como os workers BullMQ funcionam (queues, concorrência, idempotência)
- Como tarefas agendadas funcionam hoje (Vercel Cron e/ou BullMQ repeatable jobs)
- Como operar em produção (monitoramento, alertas, recuperação)
- Caminho de escala (50 / 200 / 1000+ corretores)

---

## 2) Visão geral: 3 usos de Redis no projeto

### 2.1 Filas (BullMQ)

- Arquivos principais:
  - `src/lib/queue/config.ts` (config de conexão)
  - `src/lib/queue/queues.ts` (instâncias de `Queue` e schedules)
  - `src/workers/index.ts` (processadores com `Worker`)
- Requisito **obrigatório**: Redis acessível via TCP
  - `redis://host:port`
  - `rediss://host:port` (TLS)

### 2.2 Cache (opcional)

- Arquivo principal: `src/lib/cache.ts`
- Usos típicos:
  - cache de resultados de busca/listagens (TTL curto)
  - cache de detalhes de imóvel
  - cache de dados agregados/estatísticas

### 2.3 Rate limiting (opcional, recomendado em produção)

- Arquivo principal: `src/lib/rate-limiter.ts`
- Com Redis:
  - consistente entre múltiplas instâncias
- Sem Redis:
  - fallback para memória (`RateLimiterMemory`), o que **não** é consistente em escala horizontal

---

## 3) Variáveis de ambiente (Redis / Cron / Worker)

### 3.1 Redis

- `REDIS_URL` (recomendado)
  - Ex.: `rediss://:PASSWORD@HOST:PORT`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (alternativa)

Notas importantes:

- **BullMQ não funciona com URL REST** (ex.: Upstash REST). Precisa de TCP.
- Em runtime de produção (Vercel/Node), há guardas no código para **não tentar** conectar em `localhost` por engano.

### 3.2 Crons / Schedules

- `CRON_SECRET`
  - Protege endpoints de cron e endpoints internos de inicialização de jobs.

---

## 4) Filas BullMQ existentes

Fonte: `src/lib/queue/config.ts` (`QUEUE_NAMES`) e `src/workers/index.ts`.

- `lead-expiry`
  - Worker expira leads “aceitos” sem conclusão após janela definida (ver lógica no worker).
- `queue-recalculation`
  - Worker recalcula posições na fila de corretores.
- `cleanup`
  - Worker limpa dados antigos (histórico de score, leads expirados antigos).
- `assistant-recalculation`
  - Worker recalcula itens do assistente de corretores/equipes.
- `lead-auto-reply`
  - Worker processa respostas automáticas do assistente offline.

---

## 5) Como o worker roda

### 5.1 Entry point

- `npm run worker` → `tsx src/workers/index.ts`

### 5.2 Condição de ativação

- O worker só inicializa processadores BullMQ se `getRedisConnection()` retornar uma conexão válida.
- Se Redis não estiver configurado:
  - as `Queue`s viram `null`
  - os `Worker`s não sobem
  - o sistema depende de fallbacks onde existirem

---

## 6) Schedules: Vercel Cron vs BullMQ repeatable jobs

### 6.1 O que existe hoje

- **Vercel Cron (HTTP)**
  - Configurado em `vercel.json` (plano atual limita a 2 crons)
  - Rotas ativas:
    - `/api/cron/expire-leads`
    - `/api/cron/archive-chats`

- **Rotas de cron adicionais (manual/fallback)**
  - Existem, mas não estão necessariamente no `vercel.json`:
    - `/api/cron/lead-auto-reply`
    - `/api/cron/send-rating-request-emails`
    - `/api/cron/recalc-conversion-benchmarks`

- **BullMQ repeatable jobs**
  - Definidos em `src/lib/queue/queues.ts` (ex.: a cada 5/10/60 minutos)
  - Precisam ser “registrados” no Redis por `initializeRecurringJobs()`

### 6.2 Risco operacional em serverless

- Rodar “scheduler” dentro de rotas serverless pode criar:
  - duplicidade de inicialização
  - comportamento difícil de debugar

### 6.3 Recomendação de padronização

Escolher **um sistema principal** de schedules:

- Enquanto estiver no plano limitado da Vercel:
  - manter Vercel Cron para tarefas diárias
  - usar BullMQ para processamento assíncrono (não como scheduler principal)

- Quando houver worker dedicado 24/7 em produção:
  - inicializar repeatable jobs no boot do worker (padrão recomendado)
  - manter rotas cron HTTP como fallback/manual

---

## 7) Auto-reply offline: fluxo e fallback

Fonte: `src/lib/lead-auto-reply-service.ts`.

- Ao receber mensagem do cliente:
  - cria um registro em `leadAutoReplyJob`
  - se `leadAutoReplyQueue` existir, enfileira um job com `delay`
  - se não existir, tenta processar inline (`processByClientMessageId`)

Implicação:

- Sem Redis/worker, o sistema continua funcionando, mas o processamento pode ocorrer inline e competir com a request (dependendo do call site).

---

## 8) Operação e monitoramento

### 8.1 Health check

- Endpoint: `/api/health`
  - valida DB e tenta `PING` no Redis quando configurado

### 8.2 Observabilidade recomendada

- Monitorar:
  - latência de Redis
  - memória e evictions
  - backlog por fila (waiting/delayed/failed)
  - erros de worker
  - pressão no Postgres (CPU, conexões, slow queries)

O projeto já tem endpoints admin para filas:

- `/api/admin/queue/stats`
- `/api/admin/queue/jobs`
- `/api/admin/queue/pause`, `/api/admin/queue/resume`
- `/api/admin/queue/retry`, `/api/admin/queue/remove`

---

## 9) Deploy recomendado (produção)

### 9.1 App (Next.js)

- Vercel (atual)

### 9.2 Redis (gerenciado)

- Requisitos:
  - TCP + TLS (ideal)
  - métricas e alertas
  - plano escalável

### 9.3 Worker (processo dedicado 24/7)

- Recomendação: hospedar como serviço separado (Render/Railway/Fly.io)
- Comandos:
  - start: `npm run worker`
- Env vars mínimas:
  - `DATABASE_URL`
  - `REDIS_URL` (ou host/port)
  - (se necessário) `OPENAI_API_KEY` para auto-reply

---

## 10) Roadmap de escala (50 / 200 / 1000+ corretores)

### Até ~50 corretores ativos

- Redis opcional (se ativar, plano básico)
- 1 worker (ou até nenhum, dependendo do que você quer processar em background)
- Vercel Cron como scheduler principal

### ~50–200 corretores ativos

- Redis gerenciado + TLS + métricas
- Worker dedicado 24/7
- Ativar rate limiting em Redis para consistência
- Ajustar concorrência por fila para não saturar Postgres/IA

### ~200–1000+ corretores ativos

- Redis como infra crítica:
  - HA/failover
  - backups
  - capacidade e alertas
- Considerar separar Redis de cache vs Redis de filas
- Escalar worker horizontalmente e aplicar backpressure
- Padronizar scheduler no boot do worker

---

## 11) Checklist de incidentes (resumo)

- Redis caiu:
  - filas param
  - verificar `/api/health`
  - verificar backlog e jobs failed
  - validar se app está com fallback (cache/rate limit) funcionando

- Backlog crescendo:
  - medir CPU do worker e latência do DB
  - reduzir `concurrency` de filas que pressionam Postgres/IA
  - adicionar instâncias de worker

- Duplicidade de schedules:
  - escolher um scheduler principal
  - limpar repeatable jobs antigos se necessário (via BullMQ tooling/admin)
