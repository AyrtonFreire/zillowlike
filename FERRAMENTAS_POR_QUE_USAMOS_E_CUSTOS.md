# Ferramentas que estamos usando (o que faz, por que, onde no código, custo e escala)

Este documento é propositalmente **direto e não genérico**. Para cada ferramenta/serviço, explica:

- **Ferramenta para X**
- **O que faz (na prática)**
- **Por que estamos usando**
- **Onde aparece no projeto (arquivos/rotas)**
- **Variáveis de ambiente (env vars)**
- **Custo (ordem de grandeza / o que encarece)**
- **Quando se preocupar com escala**

> Observação importante sobre “custo”: eu não vou colocar um número único fixo porque os valores mudam por plano/região/uso. Vou colocar **faixas e o que empurra o custo** para você conseguir decidir e planejar sem se prender a uma tabela que fica desatualizada.

---

## 1) Vercel — Hospedagem do site + API + Cron

### Ferramenta para
Hospedar o **site Next.js** e as **rotas API** (endpoints). Também dispara **cron jobs** via HTTP.

### O que faz (na prática)
- Serve o site (páginas)
- Executa endpoints tipo `/api/...`
- Dispara tarefas agendadas (cron) chamando endpoints

### Por que estamos usando
- Deploy simples e rápido
- Boa performance e DX (muito bom para MVP)
- Integra bem com Next.js

### Onde aparece no projeto
- `vercel.json` (crons)
- `scripts/vercel-build.ts` (build)
- Rotas cron:
  - `src/app/api/cron/expire-leads/route.ts`
  - `src/app/api/cron/archive-chats/route.ts`
  - (existem outras rotas cron, mesmo que não estejam no `vercel.json`)

### Variáveis de ambiente
- `CRON_SECRET` (protege endpoints de cron)
- `NEXTAUTH_URL` (URL pública do app)

### Custo (o que encarece)
- **Execução** (quantidade/tempo das requests)
- **Bandwidth** (tráfego)
- **Crons** (limite depende do plano)

### Quando se preocupar com escala
- Quando o site ficar lento em horários de pico
- Quando crons começarem a falhar por tempo/limites
- Quando você precisar de mais crons do que o plano suporta

---

## 2) Supabase — Banco de dados (PostgreSQL gerenciado)

### Ferramenta para
Hospedar e operar o **PostgreSQL** do sistema (dados “verdade”: usuários, imóveis, leads, chats, etc.).

### O que faz (na prática)
- Banco Postgres gerenciado (você não precisa administrar servidor do banco)
- Backups e operação (depende do plano/config)
- Painel para ver tabelas, logs e métricas básicas

### Por que estamos usando
- Postgres é o melhor “banco principal” para regras de negócio (leads, permissões, histórico)
- Supabase reduz o custo operacional (não precisa montar/administrar infra do banco)

### Onde aparece no projeto
- Prisma: `prisma/schema.prisma`
- Prisma client: `src/lib/prisma.ts`
- Rotas e serviços usam `prisma` diretamente

### Variáveis de ambiente
- `DATABASE_URL` (string de conexão do Postgres do Supabase)
- `DIRECT_URL` (quando usado para separar migrations/pooling)

### Custo (o que encarece)
- Plano/recursos do projeto (compute do Postgres)
- Storage (quantidade de dados)
- Throughput (muitas consultas/escritas)
- Recursos “premium” (ex.: retenção/backup avançado) dependendo do plano

### Quando se preocupar com escala
- Quando o banco vira gargalo (CPU alta, queries lentas)
- Quando o número de conexões cresce muito (pooling passa a ser importante)
- Quando relatórios/feeds/pesquisas começam a “pesar”

---

## 3) Prisma — ORM e migrations

### Ferramenta para
Conectar o código ao Postgres de forma segura e manter o esquema do banco versionado.

### O que faz (na prática)
- Gera o “cliente” do banco (`PrismaClient`)
- Controla migrations
- Facilita mudanças no schema sem bagunçar produção

### Por que estamos usando
- Produtividade
- Menos erro “na mão” em SQL
- Evolução do banco com histórico

### Onde aparece no projeto
- `prisma/schema.prisma`
- `prisma/migrations/*`
- Scripts:
  - `scripts/prisma-migrate-safe.ts`
- `package.json`:
  - `prisma:generate`, `prisma:migrate`, `db:deploy`

### Variáveis de ambiente
- `DATABASE_URL`
- `DIRECT_URL` (quando aplicável)

### Custo (o que encarece)
- Prisma em si não é um “serviço pago”
- O custo real é o **banco** e o **ambiente** rodando o app

### Quando se preocupar com escala
- Quando tiver muitos acessos simultâneos em serverless (pooling)
- Quando migrations ficarem arriscadas (precisa de disciplina e processos)

---

## 4) Redis — Cache + Rate limit + Filas

### Ferramenta para
“Memória rápida” do sistema e base para filas.

### O que faz (na prática)
- Cache: reduzir consultas repetidas no DB
- Rate limit: bloquear abuso/spam
- Filas: armazenar jobs para serem processados por workers

### Por que estamos usando
- Performance (cache)
- Proteção (rate limit)
- Desacoplar tarefas pesadas do app (fila)

### Onde aparece no projeto
- Cache: `src/lib/cache.ts`
- Rate limit: `src/lib/rate-limiter.ts`
- BullMQ connection: `src/lib/queue/config.ts`
- Health: `src/app/api/health/route.ts`

### Variáveis de ambiente
- `REDIS_URL` (recomendado, TCP `redis://` ou `rediss://`)
- ou `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

### Custo (o que encarece)
- Memória (quanto cache/fila você mantém)
- Throughput/latência (muitos comandos por segundo)
- Alta disponibilidade (replica/failover) em planos mais sérios

### Quando se preocupar com escala
- Quando você começar a depender de filas/workers em produção
- Quando cache virar essencial para performance
- Quando Redis virar crítico (precisa monitoramento/alertas)

---

## 5) BullMQ — Filas de jobs

### Ferramenta para
Gerenciar “tarefas em background” com fila (jobs), usando Redis.

### O que faz (na prática)
- Enfileira tarefas
- Controla tentativas/retry
- Permite concorrência e processamento assíncrono

### Por que estamos usando
- Evita travar requests do usuário com tarefas pesadas
- Dá escala horizontal (mais workers)

### Onde aparece no projeto
- Filas: `src/lib/queue/queues.ts`
- Workers: `src/workers/index.ts`
- Config: `src/lib/queue/config.ts`
- Admin endpoints (monitorar/pausar/retry):
  - `src/app/api/admin/queue/*`

### Variáveis de ambiente
- Mesmas do Redis (BullMQ depende de Redis)

### Custo (o que encarece)
- Indireto: Redis + servidor do worker
- Mais jobs = mais CPU do worker + mais pressão no DB

### Quando se preocupar com escala
- Quando backlog (fila esperando) crescer
- Quando jobs começarem a falhar por timeout
- Quando concorrência de workers começar a saturar Postgres/OpenAI

---

## 6) Worker (processo separado) — Rodar jobs de background

### Ferramenta para
Executar jobs do BullMQ fora do app principal.

### O que faz (na prática)
- Um processo “sempre ligado” que consome jobs

### Por que estamos usando
- Isola o trabalho pesado
- Escala de forma independente do site

### Onde aparece no projeto
- Script: `package.json` → `worker: tsx src/workers/index.ts`
- Docker: `Dockerfile.worker`
- Local dev: `docker-compose.yml` (serviço `worker`)

### Variáveis de ambiente
- `DATABASE_URL`
- Redis (`REDIS_URL` ou host/port)
- (se rodar auto-reply): `OPENAI_API_KEY`

### Custo (o que encarece)
- Um servidor 24/7 (mesmo pequeno)
- Mais jobs = mais CPU

### Quando se preocupar com escala
- Quando o worker ficar com CPU alta e backlog crescer
- Quando precisar de mais de 1 instância (horizontal)

---

## 7) Pusher — Tempo real (chat/eventos)

### Ferramenta para
Comunicação em tempo real (ex.: chat atualizando na hora).

### O que faz (na prática)
- Mantém conexões e envia eventos em tempo real

### Por que estamos usando
- Evita operar WebSocket por conta própria
- Acelera desenvolvimento

### Onde aparece no projeto
- `src/lib/pusher-server.ts`
- Frontend usa `pusher-js` (código client)

### Variáveis de ambiente
- Variáveis do Pusher (prefixo `PUSHER_` / `NEXT_PUBLIC_PUSHER_` dependendo do setup)

### Custo (o que encarece)
- Conexões simultâneas
- Volume de mensagens/eventos

### Quando se preocupar com escala
- Quando o custo subir com tráfego e chat ativo
- Quando você tiver muitos usuários conectados ao mesmo tempo

---

## 8) Cloudinary — Upload e entrega de imagens

### Ferramenta para
Guardar e servir imagens (imóveis, etc.) com performance.

### O que faz (na prática)
- Upload de imagens
- CDN para entregar rápido
- Transformações (resize/format) quando usado

### Por que estamos usando
- Imagens são uma das maiores fontes de custo/performance
- Cloudinary resolve isso de forma robusta

### Onde aparece no projeto
- Assinatura de upload: `src/app/api/upload/cloudinary-sign/route.ts`
- `next.config.ts` permite imagens do domínio cloudinary

### Variáveis de ambiente
- Variáveis do Cloudinary (normalmente `CLOUDINARY_*`)

### Custo (o que encarece)
- Storage
- Bandwidth
- Transformações

### Quando se preocupar com escala
- Quando começar a ter muitos imóveis/imagens
- Quando o tráfego em páginas com galerias aumentar

---

## 9) Brevo — Email + SMS + WhatsApp

### Ferramenta para
Comunicação com usuários/clientes:

- e-mail transacional
- SMS (ex.: códigos)
- WhatsApp (dependendo do plano/config e API)

### O que faz (na prática)
- Envia e-mails via API
- Envia SMS via API
- Pode enviar WhatsApp via API (quando habilitado/contratado)

### Por que estamos usando
- Centraliza comunicação (email + SMS + WhatsApp) em um provedor
- Evita operar infraestrutura própria de envio
- Entrega e rastreio melhores do que “SMTP na mão”

### Onde aparece no projeto
- Email: `src/lib/email.ts` (usa API HTTP da Brevo)
- SMS: `src/lib/sms.ts`
- Exemplo de uso de SMS (código): `src/app/api/phone/send-code/route.ts`
- Cron que dispara e-mails (ex.: pedido de avaliação): `src/app/api/cron/send-rating-request-emails/route.ts`

Observação:

- No código atual, a função `sendWhatsApp(...)` está em modo **mock** (log no console) e não envia de fato em produção. Se vocês estão usando WhatsApp pela Brevo hoje, provavelmente isso está fora desse fluxo do código e dá para integrar quando decidirem.

### Variáveis de ambiente
- `BREVO_API_KEY` (ou `SENDINBLUE_API_KEY` como fallback)
- `EMAIL_FROM` (remetente do e-mail)
- `BREVO_SMS_SENDER` (nome do remetente do SMS)
- `SMS_MODE` (ex.: `mock` em dev)

### Custo (o que encarece)
- Volume de e-mails enviados
- Volume de SMS (normalmente cobrado por mensagem)
- WhatsApp (normalmente cobrado por conversas/sessões/volume, depende do modelo)

### Quando se preocupar com escala
- Quando começar a mandar e-mail/SMS em grande volume
- Quando precisar de reputação, templates, segmentação e limites
- Quando o custo por mensagem começar a impactar CAC/LTV (vale otimizar gatilhos e duplicidades)

---

## 10) Sentry — Erros e observabilidade

### Ferramenta para
Ver erros reais do usuário em produção e diagnosticar rápido.

### O que faz (na prática)
- Captura exceptions
- Captura performance (traces)
- Replay (quando habilitado)

### Por que estamos usando
- Reduz tempo de resolver problemas
- Ajuda muito quando a base de usuários cresce

### Onde aparece no projeto
- `sentry.server.config.ts`
- `sentry.client.config.ts`
- `src/lib/sentry.ts`

### Variáveis de ambiente
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`

### Custo (o que encarece)
- Volume de eventos
- Traces
- Replay (pode encarecer bastante em tráfego alto)

### Quando se preocupar com escala
- Quando o volume de eventos explodir (ajustar amostragem)
- Quando replay começar a custar demais

---

## 11) OpenAI — Recursos de IA (assistentes/drafts)

### Ferramenta para
Gerar respostas automáticas/drafts e funcionalidades de IA.

### O que faz (na prática)
- Gera texto (descrição, respostas, assistente)

### Por que estamos usando
- Aumenta produtividade e resposta rápida

### Onde aparece no projeto
- `src/lib/lead-auto-reply-service.ts`
- Endpoints de IA:
  - `src/app/api/assistant/chat/route.ts`
  - `src/app/api/ai/property-description/route.ts`
  - (outros endpoints em `src/app/api/assistant/*`)

### Variáveis de ambiente
- `OPENAI_API_KEY`

### Custo (o que encarece)
- Volume de chamadas
- Tamanho de prompts e respostas
- Repetição de geração (sem cache)

### Quando se preocupar com escala
- Quando IA começar a ser usada em massa (muitos corretores/leads)
- Quando custo por lead/conversa ficar relevante
- Quando latência atrapalhar UX (precisa fila/worker e limites)

---

## 12) NextAuth + OAuth (Google/GitHub) — Login

### Ferramenta para
Autenticação (login) e autorização (papéis/roles).

### O que faz (na prática)
- Login por e-mail/senha e/ou Google/GitHub
- Sessão via JWT

### Por que estamos usando
- Padrão de mercado
- Facilita login e segurança

### Onde aparece no projeto
- `src/lib/auth.ts`
- `src/middleware.ts` (proteção de rotas)

### Variáveis de ambiente
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_ID`, `GITHUB_SECRET`

### Custo (o que encarece)
- Geralmente “zero” direto (fora do custo do seu servidor)
- O custo é operacional (manter seguro, evitar abuso)

### Quando se preocupar com escala
- Quando permissões ficarem complexas (teams/agencies)
- Quando abuso/bots aumentarem (rate limiting + validações)

---

## 13) Docker (local / deploy alternativo)

### Ferramenta para
Rodar serviços localmente e permitir deploy em qualquer lugar (não só Vercel).

### O que faz (na prática)
- Sobe Postgres + Redis + app + worker para dev/test

### Onde aparece no projeto
- `docker-compose.yml`
- `Dockerfile`
- `Dockerfile.worker`

### Custo (o que encarece)
- Zero local
- Em produção, depende do provedor (máquinas/containers)

### Quando se preocupar com escala
- Quando você quiser sair de serverless e ter mais previsibilidade (infra própria)

---

## 14) Checklist: com o que se preocupar de verdade (bem direto)

- **Até poucos corretores/leads/dia**
  - Foque em produto e estabilidade
  - Tenha Sentry
  - Tenha DB bem configurado

- **Quando começar a ter picos e lentidão**
  - Ative/ajuste Redis cache
  - Mova tarefas pesadas para worker
  - Ajuste queries no Postgres

- **Quando você estiver com 200–1000+ corretores ativos**
  - Redis e worker viram infra crítica (monitoramento/alertas)
  - Controle de concorrência e custos de IA
  - Eventualmente separar responsabilidades (cache vs filas)
