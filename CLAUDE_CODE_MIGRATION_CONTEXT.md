# Contexto Detalhado do Projeto zillowlike para Claude Code

## Stack Técnica Completa
- **Framework:** Next.js 14+ (App Router com Server Components)
- **Linguagem:** TypeScript (strict mode)
- **Estilização:** TailwindCSS com design tokens customizados
- **Componentes UI:** shadcn/ui (Radix UI primitives)
- **Autenticação:** NextAuth.js v5 (Credentials, Google OAuth, GitHub OAuth)
- **ORM:** Prisma com PostgreSQL
- **Real-time:** Pusher (WebSocket)
- **AI:** OpenAI GPT-4o para features de assistente
- **Validação:** Zod schemas
- **Formulários:** React Hook Form + Zod
- **Iconografia:** lucide-react
- **Gerenciamento de estado:** React hooks (useState, useEffect, useMemo, useCallback)
- **Rotas:** App Router com src/ directory structure

## Estrutura de Diretórios Completa
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── account/
│   │   ├── page.tsx (legacy + AccountPageClient)
│   │   ├── AccountPageClient.tsx
│   │   └── components/
│   │       ├── AccountOverviewSection.tsx
│   │       └── AccountSettingsSidebar.tsx
│   ├── broker/
│   │   ├── crm/
│   │   │   └── page.tsx (CRM kanban para corretores)
│   │   └── dashboard/
│   │       └── page.tsx (Dashboard broker)
│   ├── chats/
│   │   └── page.tsx (Inbox de conversas para usuários regulares)
│   ├── chat/
│   │   └── [token]/
│   │       └── page.tsx (Chat específico por token)
│   ├── developer/
│   │   ├── leads/
│   │   │   ├── page.tsx (Listagem com pipeline actions)
│   │   │   └── [id]/
│   │   │       └── page.tsx (Detalhe com pipeline action)
│   │   └── api/
│   │       └── developer/
│   │           └── leads/
│   │               └── [id]/
│   │                   └── pipeline/
│   │                       └── route.ts
│   ├── property/
│   │   └── [id]/
│   │       └── page.tsx (Página de detalhe do imóvel)
│   ├── profile/
│   │   ├── [slug]/
│   │   │   └── page.tsx (Perfil público)
│   │   └── components/
│   │       └── ProfilePrimitives.tsx
│   ├── api/
│   │   ├── assistant/
│   │   │   ├── count/route.ts
│   │   │   ├── items/route.ts
│   │   │   ├── items/[id]/generate/route.ts
│   │   │   ├── leads/[leadId]/coach/route.ts
│   │   │   ├── recalculate/route.ts
│   │   │   └── chat/route.ts
│   │   ├── chat/
│   │   │   └── [token]/
│   │   │       └── route.ts
│   │   ├── chats/
│   │   │   └── route.ts
│   │   ├── leads/
│   │   │   └── route.ts
│   │   └── search-suggestions/
│   │       └── route.ts
│   └── (marketing)/
│       ├── page.tsx (Home)
│       └── para-profissionais/page.tsx
├── components/
│   ├── modern/
│   │   ├── ModernNavbar.tsx (Navbar principal com role-aware)
│   │   ├── ModernFooter.tsx
│   │   └── index.ts (barrel export)
│   ├── PropertyContactCard.tsx (Card de contato em imóveis)
│   ├── ui/ (shadcn/ui components)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── etc...
│   └── (outros componentes reutilizáveis)
├── lib/
│   ├── lead-auto-reply-service.ts (Serviço de auto-reply com AI)
│   ├── pusher-client.ts (Cliente Pusher)
│   ├── prisma.ts (Cliente Prisma)
│   └── (outros utilitários)
├── contexts/
│   └── ToastContext.tsx (Sistema de toasts)
└── types/
    └── (type definitions)
```

## Roles de Usuário Detalhados
- **USER** - Usuário regular buscando imóveis, entra em contato com corretores
- **REALTOR** - Corretor individual com perfil público, gerencia leads
- **AGENCY** - Imobiliária, gerencia equipe de corretores, tem visibilidade de leads da equipe
- **OWNER** - Proprietário de imóvel, pode anunciar
- **ADMIN** - Administrador do sistema com acesso total

## Padrões de Código Específicos

### Componentes Modern
- Prefixo "Modern" em componentes UI modernos
- Localizados em `src/components/modern/`
- Exemplo: `ModernNavbar`, `ModernFooter`
- Export via barrel file `src/components/modern/index.ts`

### Botões e UI
- Usar `Button` de shadcn/ui em `src/components/ui/Button.tsx`
- Variants: `default`, `secondary`, `outline`, `ghost`, `destructive`
- Exemplo: `<Button variant="secondary">Ver comparação completa</Button>`

### Ícones
- Todos os ícones de `lucide-react`
- Importar individualmente: `import { MessageCircle, ChevronRight } from "lucide-react"`
- Sizing padrão: `h-4 w-4`, `h-5 w-5`, `h-6 w-6`
- Classes Tailwind para responsividade: `sm:h-5 sm:w-5`, etc

### Classes Tailwind
- Prefixos de responsividade: `sm:`, `md:`, `lg:`, `xl:`
- Design system customizado com tokens
- Cores principais: `teal-600` (primary), `indigo-600` (secondary), `slate-800` (neutral)
- Border radius: `rounded-xl`, `rounded-2xl`, `rounded-[24px]`, `rounded-[28px]`
- Shadows: `shadow-sm`, `shadow-md`, `shadow-black/5`

### Formulários
- React Hook Form com Zod validation
- Schemas em `src/lib/validations/` ou inline
- Exemplo padrão:
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues,
});
```

### Toasts
- Sistema via `ToastContext` em `src/contexts/ToastContext.tsx`
- Hook: `const toast = useToast();`
- Métodos: `toast.showToast()`, `toast.error()`, `toast.success()`
- Exemplo:
```typescript
toast.showToast({
  type: "info",
  title: "Conversa iniciada",
  message: "Acompanhe esta conversa em Conversas.",
  duration: 6000,
  actionLabel: "Abrir conversas",
  onAction: () => router.push("/chats"),
});
```

### Session/Auth
- NextAuth session: `const { data: session } = useSession();`
- Role access: `session?.user?.role` ou `(session as any)?.role`
- Helper para role:
```typescript
const sessionRole = ((session as any)?.user?.role || (session as any)?.role || "USER") as string;
const isRegularUser = isAuthenticated && sessionRole === "USER";
```

## Sistema de Chat Detalhado

### Rotas
- `/chats` - Inbox de conversas para usuários regulares (USER role)
- `/chat/[token]` - Chat específico acessível por token
- `/api/chats` - API para listar conversas do usuário
- `/api/chat/[token]` - API para mensagens de um chat específico
- `/api/chat/[token]` (POST) - API para enviar mensagem

### Criação de Lead
- Ao entrar em contato com imóvel, lead é criado via `/api/leads`
- Payload:
```typescript
{
  propertyId: string,
  name: string,
  email: string,
  phone?: string,
  isDirect?: boolean,
}
```
- Response: `{ success: true, leadId: string }`

### Pusher Channels
- `chat-{leadId}` - Canal para mensagens de um lead específico
- Eventos: `new-chat-message`, `lead-chat-state-changed`
- `private-agency-{teamId}` - Canal para atualizações de agência
- Autorização via Pusher auth endpoint

### Estados de Conversação
- `ACTIVE` - Conversa ativa
- `ARCHIVED` - Arquivada por inatividade
- `CLOSED` - Encerrada (não aceita novas mensagens)

### Query Parameters em /chats
- `lead={leadId}` - Abrir chat específico
- `token={token}` - Abrir chat por token
- `openChat=1&propertyId={id}&direct=1&entry=contact` - Criar lead e abrir chat
- `entry=contact` - Indica que veio do fluxo de contato (para mostrar banner)

## Pipeline de Leads (DEVELOPER Workspace)

### Rota API
- `/api/developer/leads/[id]/pipeline`
- Método: POST
- Autorização: `resolveDeveloperWorkspaceForUser`
- Escopo: por `property.teamId` do workspace

### Regras de Negócio
- **Forward-only:** Não permite retroceder no funil
- Stages canônicos: `NEW → CONTACT → VISIT → PROPOSAL → DOCUMENTS → WON/LOST`
- Grava evento `STAGE_CHANGED` via `LeadEventService`
- Mantém fechamento de conversa para `WON/LOST`
- Recalcula `RealtorAssistantService` quando há `realtorId`
- Publica atualização no canal `agency` via Pusher

### UI Pages
- `/developer/leads` - Listagem com:
  - Ação rápida de avanço por card (select forward-only)
  - Atualização otimista por item
  - Tratamento de erro por lead
  - Badges semânticos para etapa e status
  - Mini mapa visual do funil por card
  - Resumo do funil (contagem agregada por etapa)
  - Cards de prioridades operacionais (primeiro contato, negociação ativa, mensagens não lidas, finalizados)
  - Filtro rápido `priorityFilter`
- `/developer/leads/[id]` - Detalhe com:
  - Bloco "Ação de pipeline" com select forward-only
  - Confirmação simples
  - Feedback de erro
  - Permissão baseada em `workspace.canManageWorkspace`

## AI Features Detalhadas

### Agency Assistant
- **Widget/Feed:** `AgencyAssistantWidget` e `AgencyAssistantFeed`
- **APIs:**
  - `/api/assistant/count` - Contar items
  - `/api/assistant/items` - Listar items com `context=AGENCY`
  - `/api/assistant/recalculate` - Recalcular items chamando `RealtorAssistantService.recalculateForAgencyTeam`
  - `/api/assistant/items/[id]/generate` - Gerar item com OpenAI, suporta `context=AGENCY` (requer `teamId`)
- **Pusher:** `private-agency-{teamId}` para atualizações em tempo real
- **Response format:** `{ taskLabel, summary, draft, reasons, confidence }` com sanitização/fallbacks
- **Note:** UI atual não chama o endpoint `/generate`

### Lead Coaching
- `/api/assistant/leads/[leadId]/coach`
- Permite `role=AGENCY` com constraints (team owner access)
- Baseline determinístico + OpenAI opcional via `?ai=1`

### Chat Assistant
- `/api/assistant/chat`
- **Atualmente bloqueia** `role=AGENCY` (só permite `ADMIN` e `REALTOR`)
- Futuro: pode ser estendido para AGENCY

## Autocomplete Global

### API
- `/api/search-suggestions`
- Sempre retorna sugestões de localização
- Só retorna sugestões de agency/realtor quando `q.length >= 3`
- Early return para queries curtas

### Frontend Consumers
- `HeroSection` (home)
- Search bar em results page
- **Não requer mudanças** no frontend

## Permissões de AGENCY

### Requisitos do Usuário
- AGENCY quer visibilidade completa de todos leads/mensagens da equipe (full visibility)
- Permissão de enviar mensagens ainda não está clara (pendente)
- Preferência: CRM em estilo lista (não kanban)

### Estado Atual
- Visibilidade parcial implementada
- Mensagens da equipe não totalmente acessíveis
- CRM atual usa kanban (não lista)

## Recuperação de Conta

### Regras Atuais
- **Mudança de email bloqueada** para contas OAuth (Google/GitHub)
- Usuários de credenciais podem mudar email

### Requisito Futuro
- Estratégia robusta de recuperação para:
  - Usuários de credenciais
  - Usuários de OAuth (incluindo perda de acesso ao Gmail)
- Prioridades:
  1. Segurança (anti-takeover)
  2. Continuidade para clientes pagantes com imóveis publicados

## Workflows Windsurf (Não existem no Claude Code)

### Estrutura
- Arquivos Markdown em `.windsurf/workflows/`
- Frontmatter YAML + instruções markdown
- Exemplo:
```yaml
---
description: [short title]
---
[specific steps]
// turbo (annotation para auto-run steps)
```

### Limitação
- Claude Code não tem sistema equivalente nativo
- Workflows precisam ser convertidos para:
  - Documentação manual
  - Scripts customizados
  - Prompts reutilizáveis

## Últimas Mudanças Implementadas (Chat Access Improvements)

### 1. Navbar Desktop (`src/components/modern/ModernNavbar.tsx`)
- **Antes:** Atalho de usuário com ícone `Bell` (só ícone)
- **Depois:** Atalho com ícone `MessageCircle` + label "Conversas"
- Badge de não lido mantido
- Role-aware: só mostra para USER

### 2. Account Page (`src/app/account/components/AccountOverviewSection.tsx`)
- Adicionado card "Minhas conversas" para USER role
- Texto: "Acompanhe chats ativos com corretores e imóveis que você já contatou, sem precisar voltar ao anúncio para encontrar a conversa."
- Link para `/chats`
- Estilo: border `teal-200`, bg `teal-50/70`, ícone `MessageCircle`

### 3. Property Contact Card (`src/components/PropertyContactCard.tsx`)
- **CTA após contato:**
  - Toast contextual ao abrir chat:
    - Title: "Conversa iniciada"
    - Message: "Acompanhe esta conversa em Conversas."
    - Duration: 6000ms
    - Action: "Abrir conversas"
  - Link permanente abaixo do botão de chat:
    - Texto: "Acompanhe esta conversa em Conversas"
    - Link: `/chats`
    - Só mostra para `isRegularUser` (USER role autenticado)
- **Preservação de origem:**
  - `getChatCallbackUrl()` adiciona `&entry=contact`
  - Após criar lead, redirect inclui `&entry=contact`

### 4. Chats Page (`src/app/chats/page.tsx`)
- **Banner contextual:**
  - Mostra quando `entry=contact`
  - Texto: "Acompanhe esta conversa em Conversas"
  - Subtexto: "Sempre que você falar com um corretor sobre um imóvel, o histórico ficará disponível aqui para retomar rapidamente."
  - Botão: "Ver todas as conversas" → `/chats`
  - Estilo: border `teal-200`, bg `teal-50`
- **Preservação de parâmetro:**
  - `createLeadForProperty()` mantém `entry=contact` no router.replace

## Convenções de Git
- Branch: `main` (produção)
- Commits: conventional commits (`feat:`, `fix:`, `refactor:`)
- Pull requests requeridos para merge

## Comandos Comuns
- **Lint:** `npx eslint [files]`
- **Typecheck:** `npx tsc --noEmit`
- **Dev server:** `npm run dev`
- **Build:** `npm run build`
- **Prisma:** `npx prisma studio`, `npx prisma migrate dev`

## Notas Importantes
- O projeto usa `src/` directory structure
- Server Components são padrão no App Router
- Client Components marcados com `"use client"`
- Environment variables em `.env.local`
- Database migrations via Prisma
- Pusher credentials em environment variables
