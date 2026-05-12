# PROJECT_KNOWLEDGE.md — OggaHub (zillowlike)

> Documento-mestre de referência. Use-o como ponto de partida para qualquer mudança no projeto. Atualize-o sempre que adicionar/remover modelos, fluxos, rotas ou serviços relevantes. Última revisão: 2026-05-12.

---

## 1. Visão geral

**OggaHub** é uma plataforma de marketplace imobiliário (Petrolina/Juazeiro) que conecta:

- **Usuários (USER)** que buscam imóveis e iniciam contato.
- **Proprietários (OWNER)** que anunciam o próprio imóvel.
- **Corretores (REALTOR)** autônomos com perfil público e fila de leads.
- **Imobiliárias (AGENCY)** com equipe, CRM e distribuição interna.
- **Incorporadoras (DEVELOPER)** com projetos e unidades.
- **Administradores (ADMIN)** com acesso total.

Pilares funcionais:

1. **Catálogo de imóveis** com fotos, documentos, vídeo e visibilidade granular.
2. **Sistema de leads** com fila pontuada de corretores, candidaturas, redistribuição automática e pipeline comercial (NEW → CONTACT → VISIT → PROPOSAL → DOCUMENTS → WON/LOST).
3. **Chat lead-cliente** com token público, estados (ACTIVE/ARCHIVED/CLOSED) e notificações realtime.
4. **AI Assistant** (corretor e agência) com itens operacionais regrais + IA opcional + chat com OpenAI.
5. **Auto-reply offline** com guardrails para responder cliente quando corretor está fora do expediente.
6. **CRM de agência** (clientes, preferências, matches, recomendações, team chat).
7. **Integração OLX** (OAuth, listings, leads e chats sincronizados).
8. **Sistema de denúncias** (Report, ReviewReport) e moderação no admin.

---

## 2. Stack técnica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router, `src/`) | 15.5.9 |
| UI runtime | React | 19.1.2 |
| Linguagem | TypeScript strict | 5.x |
| Banco | PostgreSQL via Prisma | Prisma 6.17 |
| Cache/Filas | Redis + BullMQ | bullmq 5.61, ioredis 5.8 |
| Auth | NextAuth v4 (JWT) | 4.24 |
| Estilo | TailwindCSS + shadcn/ui (Radix) | 3.4 |
| Realtime | Pusher (WS) | 5.2 server / 8.4 client |
| Forms | React Hook Form + Zod | zod 4.1 |
| AI | OpenAI (GPT-4o family) | via fetch direto |
| Email | Nodemailer (SMTP) | 7.0 |
| Mapas | Leaflet + Google Maps tiles | 1.9 |
| OCR | tesseract.js (validação CRECI) | 6.0 |
| Drag&Drop | @dnd-kit | 6.3 |
| Observabilidade | Sentry, Vercel Analytics, pino | — |
| Testes | Vitest + Playwright | 3.2 |

Notas importantes:

- O `CLAUDE_CODE_MIGRATION_CONTEXT.md` original menciona NextAuth v5; **a versão real instalada é v4** (`next-auth ^4.24.11`) — sempre confirmar no [package.json](package.json).
- Build de produção roda [scripts/vercel-build.ts](scripts/vercel-build.ts) (que executa migrations + prisma generate antes do `next build`).

---

## 3. Estrutura de diretórios

```
zillowlike/
├── prisma/
│   ├── schema.prisma           # Fonte da verdade do banco (50+ modelos)
│   ├── migrations/             # ~70 migrations versionadas
│   └── seed-*.ts               # Seeds (properties, complete, clean)
├── src/
│   ├── app/                    # App Router (rotas + APIs)
│   │   ├── (marketing)/        # Home, /para-profissionais
│   │   ├── (auth)/             # /auth/* login, register, forgot, force-change
│   │   ├── account/            # /account com sidebar de configurações
│   │   ├── admin/              # Dashboards admin
│   │   ├── agency/             # Workspace AGENCY (CRM, leads, team)
│   │   ├── broker/             # Workspace REALTOR (dashboard, leads, agenda)
│   │   ├── owner/              # Workspace OWNER (anúncios, aprovações)
│   │   ├── developer/          # Workspace DEVELOPER (projetos, unidades) — atualmente redireciona para /account no middleware
│   │   ├── chat/[token]/       # Chat público do cliente (token-based)
│   │   ├── chats/              # Inbox de chats do USER
│   │   ├── property/[id]/      # Detalhe de imóvel
│   │   ├── realtor/[slug]/     # Perfil público de corretor
│   │   ├── agencia/[slug]/     # Perfil público de agência
│   │   ├── owner/[slug]/       # Perfil público de proprietário
│   │   ├── explore[/buy|/rent] # Páginas de busca
│   │   ├── api/                # Route handlers (ver §7)
│   │   └── middleware.ts       # NÃO — middleware fica em src/
│   ├── components/
│   │   ├── modern/             # Navbar/Footer/Hero/Cards modernos (sem prefixo no nome de arquivo)
│   │   ├── ui/                 # shadcn primitives (Button, Input, Drawer, ...)
│   │   ├── crm/                # RealtorAssistantWidget/Chat, LeadSearchBar
│   │   ├── broker/, agency/, owner/, realtor/, scheduling/, dashboard/, leads/, onboarding/, queue/, team-chat/
│   │   └── *.tsx               # Componentes raiz reutilizáveis (PropertyCard, MapWithPriceBubbles, etc.)
│   ├── lib/                    # Serviços, helpers, integrações (ver §6)
│   │   ├── queue/              # config.ts, queues.ts (BullMQ)
│   │   ├── validations/        # Zod schemas
│   │   ├── validators/         # CRECI/CPF
│   │   ├── ocr/                # document-reader.ts
│   │   ├── i18n/               # property.ts (labels pt-BR)
│   │   └── __tests__/          # Vitest
│   ├── workers/index.ts        # Workers BullMQ (5 filas)
│   ├── hooks/                  # Custom React hooks
│   ├── contexts/               # ToastContext
│   ├── types/                  # Tipos compartilhados
│   ├── middleware.ts           # Auth, RBAC, redirects, deprecated paths
│   └── styles/                 # globals.css, theme tokens
├── scripts/                    # Admin/migration utilities (tsx)
├── public/                     # Assets estáticos
├── vercel.json                 # 5 crons declarados
├── package.json                # Scripts npm e dependências
└── CLAUDE.md, PROJECT_KNOWLEDGE.md, CLAUDE_CODE_MIGRATION_CONTEXT.md
```

---

## 4. Schema de banco (Prisma)

[prisma/schema.prisma](prisma/schema.prisma) é a **fonte da verdade**. Sempre cheque nomes exatos antes de codar.

### 4.1 Agrupamento por domínio

| Domínio | Modelos centrais |
|---|---|
| **Auth** | `User`, `Account`, `Session`, `VerificationToken`, `BackupRecoveryCode` |
| **Imóveis** | `Property`, `Image`, `PropertyDocument`, `PropertyDraft`, `Favorite`, `PropertyView`, `PlatformConversionBenchmark` |
| **Leads** | `Lead`, `LeadMessage` (interno corretor), `LeadClientMessage` (chat cliente), `LeadNote`, `LeadEvent`, `LeadChatReadReceipt`, `LeadRecommendationList`, `LeadAssignmentLog` |
| **Fila de corretores** | `RealtorQueue`, `LeadCandidature`, `ScoreHistory`, `RealtorStats`, `RealtorRating`, `RealtorApplication` |
| **Proprietários** | `OwnerStats`, `OwnerRating` |
| **Equipes/Agências** | `Team`, `TeamMember`, `TeamInvite`, `AgencyProfile`, `TeamChatThread`, `TeamChatMessage`, `TeamChatReadReceipt` |
| **Desenvolvedores** | `DeveloperProfile`, `DevelopmentProject`, `DevelopmentUnit` |
| **CRM** | `Client`, `ClientPreference`, `ClientPropertyMatch`, `ClientRecommendationList` |
| **AI Assistant** | `AssistantItem` (REALTOR/AGENCY), `RealtorAssistantChatThread`, `RealtorAssistantChatMessage`, `RealtorAutoReplySettings`, `LeadAutoReplyJob`, `LeadAutoReplyLog` |
| **Marketing/Alertas** | `SavedSearch`, `EmailSubscription` |
| **OLX** | `OlxAccount`, `OlxOAuthState`, `OlxListing`, `OlxLeadEvent`, `OlxChatThread`, `OlxChatMessage`, `OlxNotificationEvent` |
| **Moderação** | `Report`, `ReviewReport` |
| **Auditoria/Sistema** | `SystemSetting`, `AuditLog`, `Contact` |

### 4.2 Enums críticos (memorize)

- **`Role`** — `USER | OWNER | REALTOR | AGENCY | DEVELOPER | ADMIN`
- **`PropertyType`** — HOUSE, APARTMENT, CONDO, TOWNHOUSE, STUDIO, LAND, RURAL, COMMERCIAL
- **`PropertyStatus`** — ACTIVE, PAUSED, DRAFT, SOLD, RENTED
- **`Purpose`** — SALE, RENT
- **`LeadStatus`** — PENDING, MATCHING, WAITING_REALTOR_ACCEPT, WAITING_OWNER_APPROVAL, CONFIRMED, OWNER_REJECTED, CANCELLED, COMPLETED, EXPIRED, **+ legados** (ACCEPTED, REJECTED, RESERVED, AVAILABLE — mantidos por compatibilidade, ainda usados pelo código de fila)
- **`LeadPipelineStage`** — NEW, CONTACT, VISIT, PROPOSAL, DOCUMENTS, WON, LOST
- **`LeadConversationState`** — ACTIVE, ARCHIVED, CLOSED
- **`LeadEventType`** — 23 tipos. Ver [src/lib/lead-event-service.ts:5-27](src/lib/lead-event-service.ts#L5-L27).
- **`AssistantContext`** — REALTOR, AGENCY
- **`AssistantItemPriority`** — LOW, MEDIUM, HIGH
- **`AssistantItemStatus`** — ACTIVE, SNOOZED, RESOLVED, DISMISSED
- **`ClientPipelineStage`** (CRM agência) — NEW, CONTACT, QUALIFYING, MATCHING, VISIT, NURTURE, WON, LOST
- **`TeamMemberRole`** — OWNER, AGENT, ASSISTANT

### 4.3 Campos sensíveis em `Property`

- **Privados** (só visíveis ao dono do anúncio): `privateOwnerName/Phone/Email/Address/Price`, `privateBrokerFeePercent/Fixed`, `privateExclusive[Until]`, `privateOccupied/OccupantInfo`, `privateKeyLocation`, `privateNotes`.
- **Visibilidade pública**: `hidePrice`, `hideExactAddress`, `hideOwnerContact`, `hideCondoFee`, `hideIPTU`.
- **Controle de leads**: `allowRealtorBoard` (se true vai ao mural, se false é contato direto). Atenção: o **mural foi descontinuado** — `/api/leads/mural` retorna 404 via middleware ([src/middleware.ts:31-39](src/middleware.ts#L31-L39)).
- **Capturer**: `capturerRealtorId` → usado quando distribuição da equipe é `CAPTURER_FIRST`.

### 4.4 Preço

Sempre em **centavos (BigInt)**. Converter com `Number(price)/100` no client e `jsonSafe` no server (ver padrão em [src/app/api/chat/[token]/route.ts:18](src/app/api/chat/[token]/route.ts#L18)).

---

## 5. Auth, sessão e middleware

### 5.1 NextAuth

[src/lib/auth.ts](src/lib/auth.ts) — Providers:

1. **Credentials** (email/username + senha hash bcrypt) — exige `emailVerified`.
2. **Google OAuth** — `select_account` prompt, `access_type=offline`.
3. **GitHub OAuth** — só carregado se `GITHUB_ID/SECRET` definidos.

Decisões importantes:

- **Sem `PrismaAdapter`**: o callback `signIn` cria usuários/links de conta manualmente. Isso evita que o adapter crie usuário com role padrão antes do callback rodar.
- Sessão **JWT** (não DB), max-age 7 dias.
- O JWT carrega: `sub`, `role`, `authVersion`, `mustChangePassword`, `sessionKey`, `sessionCreatedAt`, `sessionProvider`, `roleCheckedAt`.
- A cada 10 min (ou em `trigger=update`) o callback `jwt` recarrega `role/email/name/image/authVersion/mustChangePassword/recoveryEmail` do banco e valida `hasActiveSessionRecord`. Se `authVersion` diverge, marca `error=SESSION_REVOKED`.
- Sessions são gravadas/refrescadas via [src/lib/account-security.ts](src/lib/account-security.ts) (`createOrRefreshSessionRecord`).
- `session.user.role` é exposto tanto em `session.role` quanto em `session.user.role` para compatibilidade server/client.

### 5.2 Middleware

[src/middleware.ts](src/middleware.ts):

- **Bloqueia rotas legadas** (404 direto): `/api/leads/mural`, `/api/leads/:id/{candidate,distribute,select-priority}`, `/api/admin/leads/:id/mural`, `/api/realtor/apply`.
- **Redirects**:
  - `/broker` → `/broker/dashboard`
  - `/broker/agenda` e `/broker/queue` → `/broker/dashboard`
  - `/broker/apply` → `/broker/dashboard`
  - `/become-realtor` → `/realtor/register`
  - `/developer/*` → `/account` (workspace developer suspenso atualmente)
- **Public profiles**: `/realtor/[slug]` e `/owner/[slug]` (com exceções para subpaths gerenciais).
- **RBAC**: mapa `roleBasedPaths` em [src/middleware.ts:18-26](src/middleware.ts#L18-L26).
- **Force change password**: se `mustChangePassword=true`, redireciona para `/auth/force-change-password` exceto rotas `/api/auth/*`.
- **Headers injetados**: `x-user-id`, `x-user-role`, `x-user-email` para uso nas APIs.

### 5.3 Helpers de workspace

Para resolver permissões dentro de equipes/perfis:

- [src/lib/agency-workspace.ts](src/lib/agency-workspace.ts) — `resolveAgencyWorkspaceForUser/ForTeam` + `resolveAssistantScope` (REALTOR vs AGENCY).
- [src/lib/developer-workspace.ts](src/lib/developer-workspace.ts) — equivalente para DEVELOPER.

Padrão: API lê `x-user-id`/`x-user-role` do header injetado, chama o resolver, e usa `getAgencyWorkspaceErrorStatus(reason)` para escolher o HTTP status.

---

## 6. Serviços principais (`src/lib/`)

| Arquivo | Responsabilidade |
|---|---|
| [prisma.ts](src/lib/prisma.ts) | Singleton do `PrismaClient` (com guard de hot-reload em dev) |
| [auth.ts](src/lib/auth.ts) | Config NextAuth + callbacks |
| [account-security.ts](src/lib/account-security.ts) | Sessions table, geração/validação de `sessionKey` |
| [audit-log.ts](src/lib/audit-log.ts) | `createAuditLog` para `AuditLog` model |
| [pusher-server.ts](src/lib/pusher-server.ts) | `getPusherServer()` + `PUSHER_CHANNELS` + `PUSHER_EVENTS` |
| [pusher-client.ts](src/lib/pusher-client.ts) | `getPusherClient()` (browser) |
| [lead-distribution-service.ts](src/lib/lead-distribution-service.ts) | Distribuição/aceite/rejeição/conclusão de leads, redistribuição, candidaturas |
| [queue-service.ts](src/lib/queue-service.ts) | Manutenção da `RealtorQueue` (joinQueue, getNextRealtor, moveToEnd, updateScore) |
| [lead-event-service.ts](src/lib/lead-event-service.ts) | `LeadEventService.record` (timeline) — **nunca quebra fluxo principal** |
| [lead-pipeline.ts](src/lib/lead-pipeline.ts) | Metadata canônica do funil, automation de `nextActionDate`, board groups |
| [lead-conversation-lifecycle.ts](src/lib/lead-conversation-lifecycle.ts) | ACTIVE/ARCHIVED/CLOSED + `touchActivity` + `syncProfessionalReplyState` |
| [lead-operational-signals.ts](src/lib/lead-operational-signals.ts) | Sinais derivados (stale, overdue, hot/warm/cool, stage health) |
| [lead-auto-reply-service.ts](src/lib/lead-auto-reply-service.ts) | Enfileira/processa auto-reply IA quando corretor está offline |
| [realtor-assistant-service.ts](src/lib/realtor-assistant-service.ts) | Recalcula `AssistantItem` (regras + IA). `recalculateForRealtor`, `recalculateForAgencyTeam`, `upsertFromRule`, `emitItemUpdated`. |
| [realtor-assistant-ai.ts](src/lib/realtor-assistant-ai.ts) | Chamadas OpenAI para itens/coach (com guardrails) |
| [realtor-assistant-chat.ts](src/lib/realtor-assistant-chat.ts) | Chat threading com OpenAI (`RealtorAssistantChatThread`) |
| [offline-assistant-intelligence.ts](src/lib/offline-assistant-intelligence.ts) | Qualification, playbooks, handoff, conversation policy |
| [offline-assistant-slots.ts](src/lib/offline-assistant-slots.ts) | Extração/format de slots do cliente (purpose, budget, beds, area, etc.) |
| [ai-guardrails.ts](src/lib/ai-guardrails.ts) | Filtros de segurança para respostas de IA |
| [agency-workspace.ts](src/lib/agency-workspace.ts) | RBAC dentro de uma agência |
| [developer-workspace.ts](src/lib/developer-workspace.ts) | RBAC dentro de uma incorporadora |
| [agency-profile.ts](src/lib/agency-profile.ts) | Config de IA por agência |
| [agency-clients.ts](src/lib/agency-clients.ts) | CRUD + matching de `Client` |
| [agency-lead-message-templates.ts](src/lib/agency-lead-message-templates.ts) | Templates para mensagens de equipe |
| [client-match-service.ts](src/lib/client-match-service.ts) | Score `ClientPropertyMatch` (PORTFOLIO/MARKET) |
| [similar-properties-service.ts](src/lib/similar-properties-service.ts) | Similaridade para `SIMILAR_LIST_SHARED` |
| [visit-scheduling-service.ts](src/lib/visit-scheduling-service.ts) | `createVisitRequest` (lead com data/horário) |
| [visit-request-lifecycle.ts](src/lib/visit-request-lifecycle.ts) | Metadata de eventos `VISIT_REQUESTED` (kind, version, preferences) |
| [owner-approval-service.ts](src/lib/owner-approval-service.ts) | `requestApproval`, aprovação/rejeição do proprietário |
| [development-lead-linking.ts](src/lib/development-lead-linking.ts) | Vincula lead a `DevelopmentProject`/`DevelopmentUnit` |
| [developer-projects.ts](src/lib/developer-projects.ts) | CRUD de projetos de incorporadora |
| [property-alerts.ts](src/lib/property-alerts.ts) | Alertas de busca salva |
| [property-location.ts](src/lib/property-location.ts) | Geocoding e ranking geográfico |
| [geocode.ts](src/lib/geocode.ts), [overpass.ts](src/lib/overpass.ts), [googleMaps.ts](src/lib/googleMaps.ts) | Wrappers de provedores de mapas |
| [email.ts](src/lib/email.ts), [email-templates.ts](src/lib/email-templates.ts) | Nodemailer + templates HTML |
| [sms.ts](src/lib/sms.ts) | WhatsApp / SMS (Twilio ou similar) |
| [cloudinary.ts](src/lib/cloudinary.ts) | Assinatura de upload |
| [olx-api.ts](src/lib/olx-api.ts), [olx-crypto.ts](src/lib/olx-crypto.ts) | Cliente OLX + criptografia do `accessTokenEnc` |
| [public-code.ts](src/lib/public-code.ts) | Códigos curtos (`L-XXXX`, etc.) |
| [public-profile-slug.ts](src/lib/public-profile-slug.ts), [public-professional-profile.ts](src/lib/public-professional-profile.ts) | Slugs e cache de perfil público |
| [cache.ts](src/lib/cache.ts), [rate-limiter.ts](src/lib/rate-limiter.ts) | Utilitários gerais |
| [logger.ts](src/lib/logger.ts) | pino logger |
| [sentry.ts](src/lib/sentry.ts) | Integração Sentry |
| [conversion-benchmarks.ts](src/lib/conversion-benchmarks.ts) | Cálculo de `PlatformConversionBenchmark` (embutido no cron expire-leads) |
| [recovery-factor.ts](src/lib/recovery-factor.ts), [token-hash.ts](src/lib/token-hash.ts) | Recuperação de conta (email, telefone, backup code) |
| [validators/creci.ts](src/lib/validators/creci.ts), [creci-scraper.ts](src/lib/validators/creci-scraper.ts) | Validação de CRECI |
| [validators/cpf.ts](src/lib/validators/cpf.ts) | Validação de CPF |
| [ocr/document-reader.ts](src/lib/ocr/document-reader.ts) | OCR de documentos CRECI via tesseract |

---

## 7. APIs (`src/app/api/`)

Convenção: `src/app/api/{feature}/{resource}/route.ts`. Métodos lêem auth via headers do middleware:

```ts
const userId = req.headers.get("x-user-id");
const userRole = req.headers.get("x-user-role");
```

Rotas de webhook/cron usam `getServerSession(authOptions)` direto.

### 7.1 Auth e conta
- `/api/auth/[...nextauth]` — NextAuth handler
- `/api/auth/{register,verify-email,forgot-password,reset-password,resend-verification,invalidate-session,refresh-session,force-role-update,force-session-refresh}`
- `/api/email/verify`, `/api/recovery-email/verify`
- `/api/phone/{send-code,verify}`, `/api/recovery/phone/{send-code,reset-password}`
- `/api/backup-codes/status`, `/api/recovery/backup-code/reset-password`

### 7.2 Leads
- `POST /api/leads` — criação (com rate limit, Turnstile, dedupe por email/property/visit). Ver [src/app/api/leads/route.ts](src/app/api/leads/route.ts).
- `/api/leads/by-property`, `/api/leads/available-slots`, `/api/leads/my-visits`, `/api/leads/direct-visit`
- `POST /api/leads/[id]/{accept,reject,complete,reminder,lost,owner-approve,owner-reject,similar-properties}`
- Rotas **deprecated** (404 via middleware): `/api/leads/mural`, `/api/leads/[id]/{candidate,distribute,select-priority}`, `/api/admin/leads/[id]/mural`

### 7.3 Chat (cliente)
- `GET /api/chats` — inbox do USER autenticado (chats que ele iniciou) — [src/app/api/chats/route.ts](src/app/api/chats/route.ts)
- `GET /api/chat/[token]` — busca conversa pública por token (cliente sem login pode acessar)
- `POST /api/chat/[token]` — envia mensagem. Header `x-chat-context` controla `client` vs `professional`. Bloqueia `role=AGENCY`. Dispara Pusher, email para corretor, WhatsApp (1º contato após resposta), auto-reply IA se cliente.

### 7.4 Assistant (AI)
- `GET /api/assistant/count` — contador para badge
- `GET /api/assistant/items` — lista (`?context=AGENCY` ou REALTOR)
- `GET /api/assistant/items/[id]`, `POST /api/assistant/items/[id]/generate` (OpenAI), `/weekly-preview`
- `POST /api/assistant/recalculate` — força recálculo
- `GET /api/assistant/{events,stats,metrics}`
- `POST /api/assistant/leads/[leadId]/coach` — coaching com `?ai=1`. Aceita AGENCY com constraints.
- `POST /api/assistant/chat` — chat threaded com OpenAI. **Bloqueia AGENCY** (só ADMIN/REALTOR atualmente). 

### 7.5 Broker (corretor)
- `/api/broker/messages/inbox` — inbox de mensagens internas (usado pelo navbar para badge)
- `/api/broker/...` — outros endpoints específicos do dashboard

### 7.6 Agency (imobiliária)
- `/api/agency/profile` — leitura/edição
- `/api/agency/clients[/{id}/{matches,preference,recommendation-lists,whatsapp-draft}]`
- `/api/agency/leads/[id]/realtor-contact-draft`
- `/api/agency/{properties,notices,notices/auto,insights}`

### 7.7 Owner / Property
- `/api/owner/{analytics,properties/[id]/documents}`
- `/api/properties/[id]/owner-info`, `/api/public/properties/[id]/view`
- `/api/upload/cloudinary-sign` — assina upload direto ao Cloudinary

### 7.8 Admin
- `/api/admin/{dashboard-stats,analytics,metrics,logs,logs/export,leads,leads/export}`
- `/api/admin/{realtors/[id],realtor-applications,realtor-applications/{approve,reject},realtor-queues,queue,queue/stats,queue/jobs}`
- `/api/admin/properties/[propertyId]/{status,...}`, `/api/admin/leads/[id]/status`
- `/api/admin/{reports,review-reports}`, `/api/admin/users/[userId]/{realtor-partner,...}`

### 7.9 Avaliações e denúncias
- `/api/owner-ratings/{,eligibility,reply}`
- `/api/reports`, `/api/review-reports`

### 7.10 Crons (declarados em [vercel.json](vercel.json))
| Path | Schedule | O que faz |
|---|---|---|
| `/api/cron/expire-leads` | `*/2 * * * *` | Expira leads parados + (embedded) recalcula conversion benchmarks |
| `/api/cron/archive-chats` | `0 4 * * *` | Arquiva conversas inativas |
| `/api/cron/lead-auto-reply` | `*/5 * * * *` | Processa fila de auto-reply (fallback ao worker BullMQ) |
| `/api/cron/send-rating-request-emails` | `0 14 * * *` | Pede avaliação após visita |
| `/api/cron/recalc-conversion-benchmarks` | `30 5 * * *` | Recalcula benchmarks isoladamente (Vercel free limita a 2 crons — o expire-leads "absorve" outras tarefas) |

> Há também `/api/cron/send-property-alerts` mas **não está agendada no vercel.json**. Se quiser ativar, ajustar plano da Vercel ou embutir em outro cron.

### 7.11 Misc
- `/api/search-suggestions` — autocomplete global. Localização sempre, agency/realtor só com `q.length >= 3`.
- `/api/notifications/{,[id],[id]/read,mark-all-read}`
- `/api/favorites`
- `/api/geo/{reverse,guess}`, `/api/geocode`, `/api/cep/[cep]`
- `/api/teams/[id]/{invites/[inviteId],members/[userId],owner}` + `/api/team-invites/accept`
- `/api/workers/start` — kicka workers/scheduler quando necessário
- `/api/logs`, `/api/pois`, `/api/overpass`, `/api/seo/smoke`, `/api/debug/session`

---

## 8. UI por workspace (`src/app/`)

### 8.1 Marketing/Público
- `/` — Home (HeroSection + filtros + grids: featured/trending/newest + categorias)
- `/explore[/buy|/rent]` — busca pública
- `/explore/[token]`, `/explore-client/[token]` — listas de recomendação compartilhadas
- `/compare`, `/calculadora`, `/financing[/[propertyId]]`, `/showcase`
- `/guides`, `/guides/[slug]`, `/guia/{compra,locacao,venda}`
- `/como-anunciar`, `/para-profissionais`, `/terms`, `/privacy`
- `/property/[id]`, `/property/[id]/[slug]`, `/property/[id]/schedule-visit`
- Perfis: `/realtor/[slug]`, `/agencia/[slug]`, `/owner/[slug]`, `/profile/[slug]`

### 8.2 USER (autenticado)
- `/account` (+ `AccountPageClient`, `AccountOverviewSection`, `AccountSettingsSidebar`)
- `/chats` — inbox de chats do usuário (banner contextual com `entry=contact`)
- `/chat/[token]` — chat com corretor
- `/favorites`, `/alerts`, `/saved-searches`, `/notifications`
- `/dashboard` — landing pós-login (todos roles)
- `/onboarding`, `/start`

### 8.3 OWNER
- `/owner` (lista), `/owner/dashboard`, `/owner/analytics`
- `/owner/new`, `/owner/edit/[id]`, `/owner/properties[/edit/[id]]`, `/owner/properties/[id]`
- `/owner/leads`, `/owner/leads/[id]`, `/owner/leads/{pending,confirmed}`

### 8.4 REALTOR (workspace `/broker`)
- `/broker/dashboard` — métricas, leads recentes, properties — [src/app/broker/dashboard/page.tsx](src/app/broker/dashboard/page.tsx)
- `/broker/leads/[id]` — detalhe de lead com side panel
- `/broker/leads/mural` — **removida via redirect/middleware**
- `/broker/properties`, `/broker/properties/new`, `/broker/properties/[id][/overview]`
- `/broker/messages` — inbox interno
- `/broker/teams`, `/broker/teams/[id]/crm`
- `/broker/assistant`, `/broker/assistant/offline`
- `/realtor/register`, `/realtor/leads`

### 8.5 AGENCY (workspace `/agency`)
- `/agency`, `/agency/dashboard`
- `/agency/leads`, `/agency/clients`, `/agency/clients/[id]`
- `/agency/properties`, `/agency/team`, `/agency/team-chat`, `/agency/teams/[id]/crm`
- `/agency/assistant`

### 8.6 DEVELOPER
- `/developer/register`, `/developer/profile` (atualmente todos `/developer/*` redirecionam para `/account` via [src/middleware.ts:66-68](src/middleware.ts#L66-L68))

### 8.7 ADMIN
- `/admin`, `/admin/dashboard`, `/admin/analytics`
- `/admin/leads`, `/admin/leads/[id]`, `/admin/realtors/[id]`, `/admin/realtor-applications`
- `/admin/properties`, `/admin/queue`, `/admin/queue-dashboard`
- `/admin/reports`, `/admin/review-reports`
- `/admin/logs`, `/admin/settings`

### 8.8 Auth pages
- `/auth/signin` (custom), `/auth/{forgot-password,reset-password,verify-email,verify-email-sent,recover-phone,recover-backup-code,force-change-password}`
- `/emergency-logout` — força logout (útil em token revogado)
- `/unauthorized` — destino do RBAC negado

---

## 9. Sistema de leads — fluxo completo

### 9.1 Criação ([POST /api/leads](src/app/api/leads/route.ts))

1. Rate limit por IP (10/min).
2. Turnstile obrigatório se não autenticado.
3. Busca `Property` + `owner`. Define `teamId` e `ownerRole`.
4. Resolve `DevelopmentProject/Unit` se vier do fluxo de incorporadora.
5. Se `visitDate + visitTime`: chama `VisitSchedulingService.createVisitRequest` (cria lead com `pipelineStage=NEW` + lifecycle de visita).
6. Reuso: se `sessionUserId` e já existe lead com mesma `propertyId + email/userId`, **reusa** (preenche `clientChatToken` e força distribuição se necessário).
7. Caso novo: cria `Contact` + `Lead` com `clientChatToken`, status inicial:
   - `teamId && !isDirect` → `PENDING` (vai para distribuição da equipe).
   - `autoRealtorId` (owner é REALTOR + isDirect) → `ACCEPTED` automaticamente.
   - senão → `PENDING`.
8. Cria `LeadClientMessage` inicial se houver `message`.
9. **`LeadDistributionService.distributeNewLead`** — distribuição entre membros da equipe (`ROUND_ROBIN`/`CAPTURER_FIRST`/`MANUAL`) ou fila global de corretores.
10. Auto-reply enfileira para a primeira mensagem.
11. `LeadEventService.record('LEAD_CREATED')`.
12. **Emails** (deduplicados em janela de 10min via `LeadEvent.title` com prefixo `EMAIL:`):
    - Para o owner: `getLeadNotificationEmail`.
    - Para o cliente: `getClientConfirmationEmail` com link `${SITE_URL}/chat/${token}`.
13. Retorna `{ok, leadId, chatToken, chatUrl}`.

### 9.2 Pipeline canônico

Definido em [src/lib/lead-pipeline.ts](src/lib/lead-pipeline.ts):

```
NEW → CONTACT → VISIT → PROPOSAL → DOCUMENTS → WON / LOST
```

Cada estágio tem `wipLimit` e `agingWarningDays`. `transitionRequiresReason` se for fechamento (WON/LOST) ou retrocesso. `buildPipelineStageAutomation` calcula `nextActionDate/Note` ao mudar de etapa.

Board groups (4 colunas) para o CRM kanban: `NEW`, `CONTACT`, `NEGOTIATION` (VISIT/PROPOSAL/DOCUMENTS), `CLOSED` (WON/LOST).

### 9.3 Distribuição ([LeadDistributionService](src/lib/lead-distribution-service.ts))

**Equipe (com `teamId`)**:
- Modo lido de `SystemSetting` `team:{teamId}:leadDistributionMode` (default `ROUND_ROBIN`).
- `MANUAL` → fica em `PENDING`, sem assign.
- Filtra membros com role `OWNER/AGENT` cuja `user.role = REALTOR`.
- `CAPTURER_FIRST` prefere `property.capturerRealtorId` (ou owner como fallback) se não tentou antes.
- Conta leads ativos por realtor (status: RESERVED/WAITING_REALTOR_ACCEPT/WAITING_OWNER_APPROVAL/CONFIRMED/ACCEPTED), respeita `maxActiveLeadsPerRealtor` (default 3, `SystemSetting`).
- Atualiza `queuePosition` dos membros após assign.

**Fila global (sem `teamId`)**:
- `QueueService.getNextRealtor` busca o de menor `position` com `activeLeads < 1` e `status=ACTIVE`.
- Reserva por `RESERVATION_TIME_MINUTES` (default 30, override por SystemSetting `leadReservationMinutes`).

**Redistribuição** (rejeição/expiração):
- Cada `LeadAssignmentLog` com `changedByUserId="SYSTEM"` conta como tentativa.
- Após `MAX_REDISTRIBUTION_ATTEMPTS` (default 3, override `team:{id}:leadMaxRedistributionAttempts`) → move para pool manual (`status=PENDING`, sem realtor).
- Cria `AssistantItem` no contexto AGENCY (`type=LEAD_REDISTRIBUTED`) e dispara `agency:leads_updated`.

### 9.4 Aceite / Rejeição / Conclusão

- `acceptLead`: status `ACCEPTED`, define `respondedAt`, atualiza `RealtorStats`/`RealtorQueue.avgResponseTime`, **se `pipelineStage=NEW` move para `CONTACT`**, dispara owner approval se tinha visita, bônus de +5 score se respondeu em <5min.
- `rejectLead`: -5 score, incrementa `totalRejected/leadsRejected`. Tenta próximo candidato → próximo da fila → pool manual.
- `completeLead`: status `COMPLETED`, `pipelineStage=WON`, `completedAt`, +3 score, decrementa `activeLeads`.
- `releaseExpiredReservations`: cron `/api/cron/expire-leads` chama isso → -5 score, tenta `moveToNextCandidate` ou redistribui.

### 9.5 Sinais operacionais e Assistant

[lead-operational-signals.ts](src/lib/lead-operational-signals.ts) deriva flags (`overdue`, `today`, `stale`, `hot/warm/cool`, stage health) usadas pela UI sem persistir.

[realtor-assistant-service.ts](src/lib/realtor-assistant-service.ts):
- `recalculateForRealtor(realtorId)` — varre leads ativos + reminders, gera `AssistantItem` (dedupe por `dedupeKey`).
- `recalculateForAgencyTeam(ownerId, teamId)` — versão AGENCY com `teamId`.
- Tipos de item: `NEW_LEAD`, `UNANSWERED_CLIENT_MESSAGE`, `VISIT_REQUESTED`, `VISIT_TODAY`, `OWNER_APPROVAL_PENDING`, `STALE_LEAD`, `LEAD_REDISTRIBUTED`, `CLIENT_PENDING_REPLY/UNASSIGNED/NO_FIRST_CONTACT/OVERDUE_NEXT_ACTION`, intent flags do offline-assistant (`NEGOTIATION_REQUEST`, `COUNTEROFFER_REQUEST`, `URGENT_CLIENT_REQUEST`, `RISK_OF_LOSS`, `ADDRESS_REQUEST`, `TOTAL_COST_QUESTION`, `DOCS_AND_CONTRACT_QUESTION`, `FINANCING_QUESTION`, `RULES_AND_PERMISSIONS`, `CALLBACK_REQUEST`, `MORE_MEDIA_REQUEST`, `MATCHING_OPPORTUNITY`), `WEEKLY_SUMMARY`, `REMINDER_OVERDUE`.
- `impactScoreForItem` define ordenação no feed.
- Pode chamar OpenAI (`type=AI`) para gerar `draft/summary/reasons`.

### 9.6 Auto-reply ([lead-auto-reply-service.ts](src/lib/lead-auto-reply-service.ts))

- Enfilerado por `enqueueForClientMessage` ao receber `LeadClientMessage` do cliente.
- Verifica `RealtorAutoReplySettings` (enabled, weekSchedule, timezone, cooldown, maxRepliesPerLeadPer24h).
- Se realtor online (heartbeat <2min): **skip**.
- Gera reply via OpenAI usando `offline-assistant-intelligence` (qualification + slots + property context + handoff decision + commercial summary + operational playbook).
- Aplica guardrails ([ai-guardrails.ts](src/lib/ai-guardrails.ts)).
- Grava `LeadClientMessage` com `source=AUTO_REPLY_AI`, dispara Pusher, registra `LeadAutoReplyLog` e `LeadEvent` (`AUTO_REPLY_SENT/SKIPPED/FAILED`).

### 9.7 Visita

- `VisitSchedulingService` valida slot + cria lead + `LeadEvent VISIT_REQUESTED`.
- `OwnerApprovalService.requestApproval` (em [src/lib/owner-approval-service.ts](src/lib/owner-approval-service.ts)) → status `WAITING_OWNER_APPROVAL`, dispara email/Pusher para o owner.
- Owner aprova/rejeita via `/api/leads/[id]/owner-{approve,reject}` → status `CONFIRMED` ou `OWNER_REJECTED` + email para cliente.
- `visit-request-lifecycle.ts` versiona pedidos (INITIAL, RESCHEDULE, CANCEL_REQUEST, FOLLOW_UP, PREFERENCES_UPDATED, DIRECT_SCHEDULED) com `requestVersion` no metadata.

---

## 10. Chat de leads

Três camadas:

| Camada | Modelo | Quem fala |
|---|---|---|
| **Cliente público** (link `/chat/[token]`) | `LeadClientMessage` (`fromClient`) | USER (logado ou anônimo via token) + responsável (realtor/owner/teamOwner/admin) |
| **Interno corretor** (`/broker/leads/[id]`) | `LeadMessage` | Apenas profissionais do lead (não vai para o cliente) |
| **Team chat** (`/agency/team-chat`) | `TeamChatMessage` | Owner ↔ Realtor da equipe |

### 10.1 Estados (LeadConversationState)

[lead-conversation-lifecycle.ts](src/lib/lead-conversation-lifecycle.ts):
- `ACTIVE` — padrão. Mensagens fluem.
- `ARCHIVED` — após inatividade (cron archive-chats). Reabre automaticamente em nova mensagem (`touchActivity` faz unarchive).
- `CLOSED` — encerrada. Lança `CONVERSATION_CLOSED` em qualquer write → API retorna 409.

`syncProfessionalReplyState` é chamado em toda resposta profissional — move `pipelineStage NEW→CONTACT` se ainda não respondeu, garante `respondedAt`, ensure `clientChatToken`.

### 10.2 Permissões em POST `/api/chat/[token]`

[src/app/api/chat/[token]/route.ts:189-237](src/app/api/chat/[token]/route.ts#L189-L237):
- Header `x-chat-context=client` → sempre conta como cliente.
- Sessão `role=AGENCY` → **403** (AGENCY não responde direto pelo chat — usa team workflows).
- Logado e contexto profissional (default ou explícito): se `realtorId === userId` OR `property.ownerId === userId` (REALTOR/OWNER) OR `team.ownerId === userId` OR ADMIN → `fromClient=false`.
- Caso contrário (corretor de outra equipe interessado, etc.) → envia como cliente.

### 10.3 Eventos disparados ao enviar mensagem

1. `Pusher.trigger(CHAT(leadId), NEW_CHAT_MESSAGE, ...)` — para o chat do cliente.
2. `Pusher.trigger(REALTOR(rid), NEW_CHAT_MESSAGE, ...)` para cada responsável (realtor + ownerId + teamOwnerId).
3. Se profissional respondeu, atualiza `LeadChatReadReceipt` e dispara `LEAD_CHAT_READ_RECEIPT`.
4. Se há `teamId`: `Pusher.trigger(AGENCY(teamId), AGENCY_LEADS_UPDATED, ...)`.
5. `RealtorAssistantService.recalculateForRealtor(realtorId)`.
6. Cliente envia → enfileira **auto-reply** (process com timeout de 6s no foreground).
7. Cliente envia → email para corretor + WhatsApp (na 1ª mensagem após resposta do corretor).
8. Profissional envia → email para cliente.

---

## 11. Realtime (Pusher)

[src/lib/pusher-server.ts](src/lib/pusher-server.ts) — singletons + constantes:

### 11.1 Canais

| Canal | Função |
|---|---|
| `chat-{leadId}` | Conversa do cliente (público) |
| `presence-chat-{leadId}` | Presença online |
| `private-realtor-{realtorId}` | Notificações pessoais do corretor (chat unread, state) |
| `private-agency-{teamId}` | Atualizações da equipe (leads, assistant) |
| `private-team-chat-{threadId}` | Conversas internas owner↔realtor |

### 11.2 Eventos

| Evento | Payload típico |
|---|---|
| `new-chat-message` | `{id, leadId, fromClient, content, createdAt, source}` |
| `lead-chat-state-changed` | `{leadId, state, archivedAt, closedAt, lastActivityAt}` |
| `lead-chat-read-receipt` | `{leadId, lastReadAt}` |
| `assistant:item_updated` | item completo |
| `assistant:items_recalculated` | `{ts}` |
| `agency:leads_updated` | `{teamId, leadId, ts}` |
| `team-chat-message`, `team-chat-receipt` | mensagens internas |
| `visit-confirmed`, `visit-rejected-by-owner` | atualizações de visita |

Auth endpoint para canais privados: **`/api/pusher/auth`** (consumido por `getPusherClient`).

---

## 12. Workers BullMQ

[src/workers/index.ts](src/workers/index.ts) declara **5 workers**. Se `getRedisConnection()` retornar `null` (sem `REDIS_URL` ou localhost em produção), workers ficam desabilitados sem crashar — útil para Vercel build.

| Fila | Concurrency | Job |
|---|---|---|
| `lead-expiry` | 1 | Marca leads ACCEPTED parados >24h como EXPIRED, ajusta score/stats |
| `queue-recalculation` | 1 | Reordena `RealtorQueue.position` por score |
| `cleanup` | 1 | Limpa `ScoreHistory` e leads EXPIRED com >30 dias |
| `assistant-recalculation` | 1 | Roda `RealtorAssistantService.recalculateFor{Realtor,AgencyTeam}` |
| `lead-auto-reply` | 2 | Processa `LeadAutoReplyService.processByClientMessageId` |

Jobs **recorrentes** ([src/lib/queue/queues.ts:39-115](src/lib/queue/queues.ts#L39-L115)):
- Lead expiry — a cada 5 min
- Queue recalc — a cada 10 min
- Cleanup — a cada 1h
- Assistant recalc — a cada 10 min

Boot: `npm run worker` (pode também ser ativado via `POST /api/workers/start`).

### 12.1 Convivência com crons Vercel

Os crons Vercel ([vercel.json](vercel.json)) duplicam algumas tarefas que o worker faria (auto-reply, expire-leads). Isso é proposital — quando Redis está indisponível em produção, os crons mantêm o sistema funcionando.

---

## 13. Integrações externas

| Provedor | Onde | Variáveis |
|---|---|---|
| **OpenAI** | [realtor-assistant-ai.ts](src/lib/realtor-assistant-ai.ts), [realtor-assistant-chat.ts](src/lib/realtor-assistant-chat.ts), auto-reply | `OPENAI_API_KEY` |
| **Cloudinary** | Upload de fotos/docs | `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` |
| **Pusher** | Realtime | `PUSHER_APP_ID/SECRET`, `NEXT_PUBLIC_PUSHER_KEY/CLUSTER` |
| **Nodemailer/SMTP** | Emails | `SMTP_HOST/PORT/USER/PASSWORD/FROM` |
| **Twilio (ou similar)** | WhatsApp/SMS | configurado em [src/lib/sms.ts](src/lib/sms.ts) |
| **Google Maps / Overpass** | Mapas e geocoding | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| **Cloudflare Turnstile** | Captcha em forms anônimos | `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` |
| **Sentry** | Erros | `SENTRY_DSN` |
| **OLX** | OAuth + listings + leads + chat webhooks | criptografado em `OlxAccount.accessTokenEnc`, key derivada (ver [olx-crypto.ts](src/lib/olx-crypto.ts)) |
| **NextAuth providers** | Google/GitHub | `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_ID/SECRET` |

Variáveis essenciais do banco/auth:
- `DATABASE_URL` (com pooler), `DIRECT_URL` (sem pooler, para migrations).
- `REDIS_URL` ou `REDIS_HOST/PORT/PASSWORD` (omita para desabilitar filas).
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- `NEXT_PUBLIC_SITE_URL` (usado em emails/chat URLs).

---

## 14. Comandos npm essenciais

[package.json](package.json):

```bash
# Dev
npm install                    # Instala + postinstall: prisma generate
npm run dev                    # Next dev com Turbopack
npm run worker                 # BullMQ workers (precisa Redis)

# Banco
npm run prisma:generate
npm run prisma:migrate         # Wrapper seguro (tsx scripts/prisma-migrate-safe.ts)
npm run prisma:studio
npm run db:seed:properties     # Seed de imóveis
npm run db:seed:complete       # Seed amplo
npm run db:validate            # tsx prisma/seed-clean.ts
npm run db:backfill:public-codes
npm run db:deploy              # prisma migrate deploy (CI)

# Qualidade
npm run lint
npm run test                   # Vitest
npm run test:ui                # Vitest UI
npx tsc --noEmit               # Type check

# Build
npm run build                  # tsx scripts/vercel-build.ts (migrate + generate + next build)
npm start

# Admin
npm run create-admin
npm run set-role               # tsx scripts/set-role.ts
npm run check-my-role
npm run verify-admin
npm run init-queue             # Bootstrap RealtorQueue
npm run migrations:check       # Checa imutabilidade das migrations já aplicadas
```

---

## 15. Convenções e padrões

### 15.1 Imports
- `import { prisma } from "@/lib/prisma"` — **nunca** instanciar `new PrismaClient()` fora do worker.
- `import { authOptions } from "@/lib/auth"` para `getServerSession`.
- `import { getPusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher-server"` no server.
- `import { getPusherClient } from "@/lib/pusher-client"` no client.

### 15.2 API routes
- Sempre `export const dynamic = "force-dynamic"` e `export const revalidate = 0` se a rota lê dados do usuário corrente.
- Headers do middleware: `x-user-id`, `x-user-role`, `x-user-email`.
- Para AGENCY/DEVELOPER, usar resolvers de workspace (não checar role na unha).
- Try/catch em integrações externas (Pusher/Email/OpenAI) com `// ignore` ou log no Sentry — **não bloquear o fluxo principal**.

### 15.3 UI
- Server Components por padrão; `"use client"` apenas quando precisar.
- Botões: `<Button variant="default|secondary|outline|ghost|destructive">` de [src/components/ui/Button.tsx](src/components/ui/Button.tsx).
- Ícones: `lucide-react` com tamanhos `h-4 w-4`, `h-5 w-5`, `h-6 w-6`.
- Cores: `teal-600` (primary), `indigo-600` (secondary), `slate-800` (neutral).
- Border radius: `rounded-xl`, `rounded-2xl`, `rounded-[24px]`, `rounded-[28px]`.
- Componentes "Modern" estão em [src/components/modern/](src/components/modern/) com barrel export.

### 15.4 Forms
- React Hook Form + `zodResolver(schema)`.
- Schemas em [src/lib/validations/](src/lib/validations/) ou inline próximos ao componente.

### 15.5 Toast
- `import { useToast } from "@/contexts/ToastContext"`.
- `toast.showToast({ type, title, message, duration, actionLabel, onAction })`.
- Conveniências: `toast.success(...)`, `toast.error(...)`.

### 15.6 Session/role (client)
```ts
const { data: session } = useSession();
const role = (session as any)?.user?.role || (session as any)?.role || "USER";
const isRegularUser = !!session && role === "USER";
```

### 15.7 BigInt money
- Sempre em centavos. Para serializar JSON, usar `jsonSafe = v => typeof v === "bigint" ? Number(v) : v` (padrão do código).

### 15.8 Pusher channels privados
- Cliente precisa de `/api/pusher/auth` endpoint (cobre `private-*` e `presence-*`).

### 15.9 Dedupe de notificações
- Padrão usado em emails: criar `LeadEvent type=INTERNAL_MESSAGE` com `title="EMAIL:{TEMPLATE}:{leadId}:{recipient}"`, conferir janela de 10min antes de reenviar.

### 15.10 Codes públicos
- `publicCode` no `Lead` e `Property` é gerado com `createPublicCode("L")`/`createPublicCode("P")` ([src/lib/public-code.ts](src/lib/public-code.ts)). Em colisão (P2002), retry até 8x.

---

## 16. Regras de negócio críticas (não quebrar)

1. **AGENCY não responde direto pelo chat do cliente** ([src/app/api/chat/[token]/route.ts:193-198](src/app/api/chat/[token]/route.ts#L193-L198)). Use workflows de equipe.
2. **AGENCY bloqueada em `/api/assistant/chat`** atualmente — só ADMIN/REALTOR. Pode ser estendido no futuro.
3. **Mural foi descontinuado** — `/api/leads/mural` retorna 404 e `/broker/leads/mural` redireciona via middleware. Não restaurar sem ok do produto.
4. **Workspace developer suspenso** — todo `/developer/*` redireciona para `/account`. Reativar requer mudança no middleware.
5. **Mudança de email bloqueada para contas OAuth** (Google/GitHub). Só usuários credentials podem mudar.
6. **PrismaAdapter NÃO é usado** — usuários OAuth são criados no callback `signIn`. Não adicionar adapter sem revisar callbacks.
7. **`authVersion` é o knob anti-takeover** — incrementar invalida todos os JWTs do user.
8. **Pipeline forward-only no Developer workspace** ([src/app/developer/leads/[id]/page.tsx](src/app/developer/leads/[id]/page.tsx)) — não permite retroceder.
9. **Conversation CLOSED rejeita writes** (HTTP 409). Reabrir explicitamente via `LeadConversationLifecycleService.reopenConversation`.
10. **Migrations já aplicadas são imutáveis** — `npm run migrations:check` garante isso na CI.
11. **Não importar `PrismaClient` direto** fora do worker — pool exhaustion garantido.
12. **Vercel free só permite 2 crons** — por isso `recalc-conversion-benchmarks` está embutido em `expire-leads`. Se mudar de plano, simplificar.
13. **Auto-reply só roda se realtor offline** (>2 min sem heartbeat) e respeitando `RealtorAutoReplySettings.weekSchedule`.
14. **`isDirect=true` significa contato direto** — owner é REALTOR e lead pula a fila com status ACCEPTED. Não distribui.
15. **`teamId && !isDirect`** sempre força distribuição da equipe, mesmo que owner seja REALTOR.

---

## 17. Pontos abertos / dívida técnica

Conforme rastreado em [CLAUDE_CODE_MIGRATION_CONTEXT.md](CLAUDE_CODE_MIGRATION_CONTEXT.md):

- AGENCY quer **visibilidade completa de leads/mensagens da equipe** — parcialmente implementada.
- AGENCY quer **CRM em lista** (não kanban) — kanban atual está sendo iterado.
- **Estratégia robusta de recuperação de conta** para OAuth (Gmail perdido) — usa `BackupRecoveryCode` + `recoveryEmail` + telefone, mas falta UX consolidada.
- Workflows do Windsurf não foram migrados — usar este doc + `.claude/` + skills.
- Endpoint `/api/assistant/items/[id]/generate` existe mas a UI não está chamando.
- Status legados `LeadStatus.{ACCEPTED, REJECTED, RESERVED, AVAILABLE}` continuam usados pelo código de fila — uma futura limpeza pode consolidar com os novos (`PENDING/MATCHING/WAITING_REALTOR_ACCEPT/...`).

---

## 18. Como manter este documento

Atualize-o quando:

- ✅ Adicionar/remover **modelo Prisma** → §4
- ✅ Adicionar/remover **rota API** → §7
- ✅ Adicionar/remover **página** → §8
- ✅ Adicionar/remover **service em `src/lib/`** → §6
- ✅ Adicionar/remover **worker ou cron** → §7.10 / §12
- ✅ Adicionar **canal/evento Pusher** → §11
- ✅ Mudar **regra de negócio crítica** → §16 (sempre adicionar nova entrada, raramente remover)
- ✅ Mudar **comando npm** → §14

Sugestão de processo: ao fazer PR significativo, atualizar este documento no mesmo commit. Manter o cabeçalho da §0 (data da última revisão) atualizado.
