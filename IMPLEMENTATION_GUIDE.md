# Guia de Implementação - Production Ready

Este guia detalha os próximos passos para tornar a aplicação production-ready.

## 📦 Dependências a Instalar

```bash
# Workers e Queue
npm install bullmq ioredis

# Logging e Observabilidade  
npm install pino pino-pretty
npm install @sentry/nextjs
npm install --save-dev @opentelemetry/sdk-node @opentelemetry/api

# Segurança
npm install rate-limiter-flexible
npm install helmet

# Testing
npm install --save-dev vitest @vitest/ui
npm install --save-dev @playwright/test
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev msw

# Utilitários
npm install nanoid # Para request IDs
```

## 🔧 Arquivos Criados

### 1. Autenticação e RBAC
- ✅ `src/middleware.ts` - Middleware de autenticação e controle de acesso
- ⚠️ Requer configuração do NextAuth com role no JWT

### 2. Validação
- ✅ `src/lib/validations/lead.ts` - Schemas Zod para leads
- ✅ `src/lib/validations/rating.ts` - Schemas Zod para avaliações
- ✅ `src/lib/validations/queue.ts` - Schemas Zod para fila
- ✅ `src/lib/api-response.ts` - Utilitários de resposta padronizada

### 3. Logging
- ✅ `src/lib/logger.ts` - Logger estruturado com request ID

### 4. Workers (BullMQ)
- ✅ `src/lib/queue/config.ts` - Configuração Redis e queues
- ✅ `src/lib/queue/queues.ts` - Definição das queues
- 🚧 `src/workers/` - Implementação dos workers (próximo passo)

### 5. Configuração
- ✅ `env.example` - Template de variáveis de ambiente
- ✅ `PRODUCTION_ROADMAP.md` - Roadmap completo
- ✅ `IMPLEMENTATION_GUIDE.md` - Este guia

## 📝 Próximos Passos Detalhados

### Passo 1: Configurar NextAuth com Roles

Editar `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // Seus providers
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
```

### Passo 2: Aplicar Validação nas Rotas API

Exemplo para `src/app/api/leads/[id]/accept/route.ts`:

```typescript
import { acceptLeadSchema } from "@/lib/validations/lead";
import { withErrorHandling, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  // Parse e valida body
  const body = await request.json();
  const validated = acceptLeadSchema.parse(body);
  
  // Lógica
  logger.info("Accepting lead", { leadId: params.id, realtorId: validated.realtorId });
  const lead = await LeadDistributionService.acceptLead(params.id, validated.realtorId);
  
  return successResponse(lead, "Lead aceito com sucesso!");
});
```

### Passo 3: Implementar Workers BullMQ

Criar `src/workers/index.ts`:

```typescript
import { Worker } from "bullmq";
import { QUEUE_NAMES, redisConnection } from "@/lib/queue/config";
import { logger } from "@/lib/logger";
import { LeadDistributionService } from "@/lib/lead-distribution-service";
// ... outros imports

// Worker de distribuição de leads
new Worker(
  QUEUE_NAMES.LEAD_DISTRIBUTION,
  async (job) => {
    const { leadId } = job.data;
    logger.info("Processing lead distribution", { leadId, jobId: job.id });
    
    await LeadDistributionService.distributeNewLead(leadId);
    
    logger.info("Lead distributed successfully", { leadId });
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

// ... outros workers
```

Criar script `package.json`:
```json
{
  "scripts": {
    "worker": "tsx src/workers/index.ts"
  }
}
```

### Passo 4: Adicionar Transações Prisma

Atualizar `src/lib/lead-distribution-service.ts`:

```typescript
static async acceptLead(leadId: string, realtorId: string) {
  return await prisma.$transaction(async (tx) => {
    // Todas as operações dentro da transação
    const lead = await tx.lead.update({
      where: { id: leadId },
      data: {
        status: "ACCEPTED",
        realtorId,
        respondedAt: new Date(),
      },
    });

    await tx.realtorStats.update({
      where: { realtorId },
      data: {
        leadsAccepted: { increment: 1 },
        // ... outros updates
      },
    });

    // ... outras operações
    
    return lead;
  });
}
```

### Passo 5: Adicionar Índices no Prisma

Editar `prisma/schema.prisma`:

```prisma
model Lead {
  // ... campos
  
  @@index([status, createdAt])
  @@index([realtorId, status])
  @@index([propertyId, status])
  @@index([reservedUntil])
  @@index([expiresAt])
}

model RealtorQueue {
  // ... campos
  
  @@index([status, position])
  @@index([status, score])
  @@index([lastActivity])
}
```

Rodar migração:
```bash
npx prisma migrate dev --name add_performance_indexes
```

### Passo 6: Configurar Rate Limiting

Criar `src/lib/rate-limiter.ts`:

```typescript
import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimiter = new RateLimiterMemory({
  points: 10, // 10 requests
  duration: 60, // por 60 segundos
});

export async function checkRateLimit(key: string) {
  try {
    await rateLimiter.consume(key);
    return true;
  } catch {
    return false;
  }
}
```

Usar nas rotas:
```typescript
const ip = request.headers.get("x-forwarded-for") || "unknown";
const allowed = await checkRateLimit(ip);
if (!allowed) {
  return errorResponse("Too many requests", 429);
}
```

### Passo 7: Adicionar Testes

Criar `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Exemplo de teste `src/lib/__tests__/queue-service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { QueueService } from "../queue-service";

describe("QueueService", () => {
  it("should add realtor to queue", async () => {
    const result = await QueueService.joinQueue("test-realtor");
    expect(result).toBeDefined();
    expect(result.status).toBe("ACTIVE");
  });
});
```

### Passo 8: Docker e Deploy

Criar `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
CMD ["node", "server.js"]
```

Criar `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: zillowlike
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  app:
    build: .
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/zillowlike
      REDIS_HOST: redis
      NODE_ENV: production
    depends_on:
      - postgres
      - redis

  worker:
    build: .
    command: npm run worker
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/zillowlike
      REDIS_HOST: redis
      NODE_ENV: production
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
```

## 🚀 Ordem de Implementação Recomendada

1. ✅ Configurar env.example
2. ⏳ **Instalar dependências** (npm install bullmq ioredis pino etc)
3. ⏳ **Configurar NextAuth com roles**
4. ⏳ **Aplicar validação Zod em 3-5 rotas críticas**
5. ⏳ **Implementar workers BullMQ**
6. ⏳ **Adicionar transações Prisma**
7. ⏳ **Adicionar índices no banco**
8. ⏳ **Configurar logging estruturado**
9. ⏳ **Adicionar rate limiting**
10. ⏳ **Criar testes unitários básicos**
11. ⏳ **Dockerizar aplicação**
12. ⏳ **Setup CI/CD**

## 📚 Recursos Úteis

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [NextAuth.js with Role](https://next-auth.js.org/configuration/callbacks#jwt-callback)
- [Zod Documentation](https://zod.dev/)
- [Playwright Testing](https://playwright.dev/)

## ⚠️ Avisos Importantes

1. **Backup**: Configure backup automático do Postgres antes de ir para produção
2. **Secrets**: Nunca commite .env com secrets reais
3. **Redis**: Em produção, use Redis managed (Upstash, AWS ElastiCache, etc)
4. **Monitoring**: Configure alertas para workers parados/falhas
5. **Migrations**: Sempre teste migrations em staging primeiro

## 🤝 Contribuindo

Para adicionar novas features:
1. Criar validação Zod em `src/lib/validations/`
2. Usar `withErrorHandling` e `successResponse/errorResponse`
3. Adicionar logs com `logger.info/error`
4. Escrever testes em `__tests__/`
5. Atualizar este guia se necessário
