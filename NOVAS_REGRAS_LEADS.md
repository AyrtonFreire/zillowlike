# 🆕 NOVAS REGRAS DE NEGÓCIO - SISTEMA DE LEADS

## 📋 REGRAS IMPLEMENTADAS

### 1️⃣ **Imóveis de Corretores = Contato Direto**

**Regra:** Imóveis postados por usuários com role `REALTOR` não vão para o mural de leads.

**Comportamento:**
- ✅ Apenas botão de contato direto com o corretor proprietário
- ❌ Não aparece no mural (`/broker/leads/mural`)
- ✅ Cliente deve entrar em contato diretamente

**Implementação:**
```typescript
// Schema Prisma - Campo isDirect
isDirect Boolean @default(false)

// VisitSchedulingService
const isOwnerRealtor = property.owner.role === "REALTOR";
const isDirect = !!realtorId || isOwnerRealtor;

// Mural filtrado
where: {
  isDirect: false,
  property: {
    owner: {
      role: { not: "REALTOR" }
    }
  }
}
```

---

### 2️⃣ **Corretores Podem Agendar Visitas Diretas**

**Regra:** Corretor pode agendar visita a qualquer imóvel (inclusive de pessoa física) sem passar pelo mural.

**Casos de Uso:**
- ✅ Corretor já tem um comprador interessado
- ✅ Quer fechar a venda diretamente
- ✅ Evita competição desnecessária

**API:**
```
POST /api/leads/direct-visit
Authorization: Required (REALTOR only)

Body:
{
  "propertyId": "...",
  "clientName": "João Silva",
  "clientEmail": "joao@email.com",
  "clientPhone": "(87) 99999-9999",
  "visitDate": "2024-10-19T00:00:00.000Z",
  "visitTime": "14:00",
  "clientNotes": "Cliente interessado em comprar"
}

Response:
{
  "success": true,
  "leadId": "lead-id",
  "message": "Visita direta agendada! Aguardando aprovação do proprietário.",
  "isDirect": true
}
```

**Fluxo:**
```
1. Corretor chama API /api/leads/direct-visit
   ↓
2. Sistema cria lead com:
   - realtorId = ID do corretor
   - isDirect = true
   - status = WAITING_OWNER_APPROVAL (pula o mural)
   ↓
3. Proprietário recebe notificação
   ↓
4. Proprietário aprova/recusa
   ↓
5. Se aprovado → CONFIRMED
   Se recusado → Lead cancelado (corretor não perde pontos)
```

---

### 3️⃣ **Verificação de Conflitos de Horário** (JÁ IMPLEMENTADO ✅)

**Regra:** Sistema verifica se o horário já está ocupado antes de criar lead.

**Implementação:**
```typescript
// VisitSchedulingService.isSlotTaken()
static async isSlotTaken(
  propertyId: string,
  visitDate: Date,
  visitTime: string
): Promise<boolean> {
  const existingLead = await prisma.lead.findFirst({
    where: {
      propertyId,
      visitDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
      visitTime,
      status: {
        in: ["PENDING", "MATCHING", "WAITING_REALTOR_ACCEPT", "WAITING_OWNER_APPROVAL", "CONFIRMED"],
      },
    },
  });

  return !!existingLead;
}
```

**Proteção:**
- ✅ Verifica antes de criar lead
- ✅ Considera apenas status ativos
- ✅ Erro amigável: "Este horário já está ocupado"

---

## 🔄 FLUXOS ATUALIZADOS

### **Fluxo 1: Cliente Agenda em Imóvel de Pessoa Física**
```
1. Cliente acessa /property/[id]/schedule-visit
   ↓
2. Escolhe data e horário
   ↓
3. Sistema verifica:
   - Proprietário é USER? ✅ Continua
   - Horário disponível? ✅ Continua
   ↓
4. Cria lead:
   - isDirect = false
   - status = PENDING
   ↓
5. Lead aparece no mural
   ↓
6. Corretores se candidatam
   [Fluxo normal]
```

### **Fluxo 2: Cliente Tenta Agendar em Imóvel de Corretor**
```
1. Cliente acessa /property/[id]/schedule-visit
   ↓
2. Escolhe data e horário
   ↓
3. Sistema verifica:
   - Proprietário é REALTOR? ❌ ERRO!
   ↓
4. Retorna erro:
   "Imóveis de corretores exigem contato direto.
    Entre em contato com o corretor proprietário."
   ↓
5. Cliente vê apenas botão de contato direto
```

### **Fluxo 3: Corretor Agenda Visita Direta**
```
1. Corretor encontra um imóvel interessante
   ↓
2. Tem um comprador em mente
   ↓
3. Chama POST /api/leads/direct-visit
   {
     propertyId, clientName, clientEmail,
     visitDate, visitTime, clientNotes
   }
   ↓
4. Sistema cria lead:
   - realtorId = ID do corretor
   - isDirect = true
   - status = WAITING_OWNER_APPROVAL
   ↓
5. NÃO aparece no mural
   ↓
6. Proprietário recebe notificação
   ↓
7. Proprietário aprova/recusa
   ↓
8. Se aprovado → CONFIRMED
   Se recusado → Corretor não perde pontos
```

---

## 🗄️ MUDANÇAS NO BANCO DE DADOS

### **Campo Novo: `isDirect`**

```prisma
model Lead {
  // ... campos existentes ...
  
  // 🆕 TIPO DE LEAD
  isDirect Boolean @default(false) // true = contato direto, não vai ao mural
  
  // ... resto dos campos ...
}
```

**Migração necessária:**
```bash
npx prisma migrate dev --name add_is_direct_field
npx prisma generate
```

---

## 📊 IMPACTO NAS QUERIES

### **Mural de Leads (Antes vs Depois)**

**Antes:**
```typescript
where: {
  status: "AVAILABLE"
}
```

**Depois:**
```typescript
where: {
  status: { in: ["AVAILABLE", "PENDING", "MATCHING"] },
  isDirect: false, // ← NOVO FILTRO
  property: {
    owner: {
      role: { not: "REALTOR" } // ← NOVO FILTRO
    }
  }
}
```

---

## 🧪 COMO TESTAR

### **Teste 1: Imóvel de Corretor Não Aparece no Mural**

```sql
-- 1. Criar imóvel com proprietário REALTOR
INSERT INTO properties (id, ownerId, ...) VALUES ('prop-001', 'realtor-user-id', ...);

-- 2. Verificar role do proprietário
SELECT role FROM users WHERE id = 'realtor-user-id';
-- Resultado esperado: REALTOR

-- 3. Tentar agendar visita como cliente
POST /api/leads
{
  "propertyId": "prop-001",
  "visitDate": "2024-10-19",
  "visitTime": "14:00",
  ...
}

-- Resultado esperado: ERRO
{
  "error": "Imóveis de corretores exigem contato direto..."
}

-- 4. Verificar mural
GET /api/leads/mural

-- Resultado esperado: Imóvel NÃO aparece na lista
```

### **Teste 2: Corretor Agenda Visita Direta**

```bash
# 1. Login como REALTOR
# session.user.role = "REALTOR"

# 2. Chamar API de visita direta
POST /api/leads/direct-visit
Authorization: Bearer [token]
{
  "propertyId": "prop-002",
  "clientName": "João Silva",
  "clientEmail": "joao@email.com",
  "visitDate": "2024-10-19T00:00:00.000Z",
  "visitTime": "14:00"
}

# Resultado esperado:
{
  "success": true,
  "leadId": "lead-xxx",
  "isDirect": true
}

# 3. Verificar banco
SELECT id, isDirect, realtorId, status FROM leads WHERE id = 'lead-xxx';

# Resultado esperado:
# isDirect = true
# realtorId = [ID do corretor]
# status = WAITING_OWNER_APPROVAL

# 4. Verificar mural
GET /api/leads/mural

# Resultado esperado: Lead NÃO aparece (isDirect = true)
```

### **Teste 3: Conflito de Horário**

```bash
# 1. Criar primeiro lead
POST /api/leads/direct-visit
{
  "propertyId": "prop-001",
  "visitDate": "2024-10-19",
  "visitTime": "14:00",
  ...
}

# 2. Tentar criar segundo lead no mesmo horário
POST /api/leads/direct-visit
{
  "propertyId": "prop-001",
  "visitDate": "2024-10-19",
  "visitTime": "14:00", # ← MESMO HORÁRIO
  ...
}

# Resultado esperado: ERRO
{
  "error": "Este horário já está ocupado. Por favor, escolha outro."
}
```

---

## 🚀 DEPLOY

### **Checklist:**

- [ ] Executar migração do Prisma
```bash
npx prisma migrate dev --name add_is_direct_field
npx prisma generate
```

- [ ] Atualizar código em produção
```bash
git add .
git commit -m "feat: Regras de leads diretos e filtro de imóveis de corretores"
git push origin main
```

- [ ] Testar em staging
  - [ ] Imóvel de corretor não aparece no mural
  - [ ] Corretor consegue agendar visita direta
  - [ ] Conflito de horário funciona

- [ ] Atualizar documentação para usuários

---

## 📝 RESUMO

### **O que mudou:**

1. ✅ Imóveis de corretores não vão ao mural
2. ✅ Corretores podem agendar visitas diretas (nova API)
3. ✅ Verificação de conflitos já funcionava

### **Arquivos modificados:**

```
✅ prisma/schema.prisma (+1 campo)
✅ src/lib/visit-scheduling-service.ts (lógica de isDirect)
✅ src/lib/lead-distribution-service.ts (filtro no mural)
✅ src/app/api/leads/direct-visit/route.ts (NOVA API)
✅ NOVAS_REGRAS_LEADS.md (este documento)
```

### **Próximos passos:**

1. Executar migração
2. Testar localmente
3. Deploy em staging
4. Deploy em produção
5. Monitorar logs

---

**Última atualização:** 18/10/2024  
**Versão:** 2.1 - Leads Diretos e Filtros
