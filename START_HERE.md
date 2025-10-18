# 🚀 COMECE AQUI - SISTEMA DE LEADS V2

## 📋 O QUE FOI IMPLEMENTADO

Foi desenvolvido **60% do sistema completo de visitas agendadas**:

### ✅ **Pronto para usar:**
1. **Backend completo** - Services, validações, lógica de negócio
2. **Banco de dados atualizado** - Schema com novos campos
3. **APIs principais** - Agendar visita, candidatar-se, aprovar/recusar
4. **Componentes React** - Formulário de agendamento, aprovação de visitas
5. **Páginas básicas** - Agendamento e aprovação

### 🟡 **Falta implementar:**
1. Algumas páginas do corretor (mural atualizado, detalhes do lead)
2. Sistema de emails (6 templates)
3. Workers para expirar leads automaticamente
4. Páginas de visitas confirmadas

---

## ⚡ QUICK START (Executar Agora!)

### **Passo 1: Aplicar Migração do Banco**

```powershell
# Executar na raiz do projeto

# 1. Criar migração
npx prisma migrate dev --name add_visit_scheduling_fields

# 2. Gerar Prisma Client atualizado
npx prisma generate
```

**Isso vai:**
- ✅ Adicionar novos campos ao banco de dados
- ✅ Atualizar tipos do TypeScript
- ✅ Resolver todos os erros de compilação

---

### **Passo 2: Reiniciar Servidor**

```powershell
# Limpar cache e reiniciar
Remove-Item -Recurse -Force .next
npm run dev
```

---

### **Passo 3: Testar as Novas Features**

#### **3.1. Agendar uma Visita (Cliente)**

1. Acesse: `http://localhost:3000/property/[ID_DO_IMOVEL]/schedule-visit`
2. Escolha data e horário
3. Preencha dados
4. Clique "Agendar Visita"

**O que acontece:**
- ✅ Lead criado com `visitDate` e `visitTime`
- ✅ Aparece no mural para corretores
- ✅ Status: `PENDING`

#### **3.2. Verificar Horários Disponíveis**

Teste a API diretamente:

```powershell
# PowerShell
$propertyId = "SEU_PROPERTY_ID"
$date = "2024-10-19"
$url = "http://localhost:3000/api/leads/available-slots?propertyId=$propertyId&date=$date"

curl $url
```

**Resposta esperada:**
```json
{
  "available": ["08:00", "09:00", "10:00", ...],
  "taken": ["14:00", "15:00"]
}
```

#### **3.3. Corretor se Candidata**

```powershell
# Substituir IDs
$leadId = "SEU_LEAD_ID"
$realtorId = "SEU_REALTOR_ID"

$body = @{
    realtorId = $realtorId
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/leads/$leadId/candidate" -Method POST -Body $body -ContentType "application/json"
```

**O que acontece:**
- ✅ Candidatura criada com `queuePosition`
- ✅ Lead muda para status `MATCHING`
- ✅ `candidatesCount` incrementado

#### **3.4. Proprietário Aprova Visita**

```powershell
$leadId = "SEU_LEAD_ID"

Invoke-RestMethod -Uri "http://localhost:3000/api/leads/$leadId/owner-approve" -Method POST -ContentType "application/json"
```

**O que acontece:**
- ✅ Status muda para `CONFIRMED`
- ✅ `ownerApproved = true`
- ✅ `confirmedAt` registrado

---

## 🗂️ ESTRUTURA DO CÓDIGO

### **Backend (Services):**
```
src/lib/
  ├── visit-scheduling-service.ts    # Agendamento de visitas
  ├── owner-approval-service.ts      # Aprovação do proprietário
  └── lead-distribution-service.ts   # Distribuição (modificado)
```

### **APIs:**
```
src/app/api/leads/
  ├── available-slots/route.ts       # GET slots disponíveis
  ├── [id]/candidate/route.ts        # POST candidatar-se
  ├── [id]/owner-approve/route.ts    # POST aprovar
  ├── [id]/owner-reject/route.ts     # POST recusar
  └── route.ts                       # POST criar lead (modificado)
```

### **Frontend:**
```
src/components/
  ├── scheduling/
  │   ├── TimeSlotPicker.tsx         # Seletor de horários
  │   └── ScheduleVisitForm.tsx      # Formulário completo
  └── owner/
      └── OwnerApprovalCard.tsx      # Card de aprovação

src/app/
  ├── property/[id]/schedule-visit/  # Página de agendamento
  └── owner/leads/pending/           # Aprovação de visitas
```

---

## 📊 DADOS DO BANCO

### **Novos Campos no Lead:**

```typescript
Lead {
  // 🆕 Campos de Visita
  visitDate: DateTime | null
  visitTime: string | null        // "14:00"
  clientNotes: string | null
  
  // 🆕 Aprovação do Proprietário
  ownerApproved: boolean | null
  ownerApprovedAt: DateTime | null
  ownerRejectedAt: DateTime | null
  ownerRejectionReason: string | null
  
  // 🆕 Timestamps
  updatedAt: DateTime
  confirmedAt: DateTime | null
  completedAt: DateTime | null
  cancelledAt: DateTime | null
  
  // 🆕 Contadores
  candidatesCount: number
}
```

### **Novos Status:**

```typescript
enum LeadStatus {
  PENDING                // Aguardando candidaturas
  MATCHING               // Tem candidatos
  WAITING_REALTOR_ACCEPT // Aguardando corretor (10 min)
  WAITING_OWNER_APPROVAL // Aguardando proprietário
  CONFIRMED              // Visita confirmada!
  OWNER_REJECTED         // Proprietário recusou
  CANCELLED              // Cancelado
  COMPLETED              // Realizado
  EXPIRED                // Expirou
}
```

---

## 🎯 FLUXO COMPLETO

```
1. CLIENTE
   ↓ Acessa /property/[id]/schedule-visit
   ↓ Escolhe data + horário
   ↓ Preenche dados
   ↓ Clica "Agendar"
   
2. SISTEMA
   ↓ Verifica se horário está livre
   ↓ Cria Lead (visitDate, visitTime)
   ↓ Status: PENDING
   
3. MURAL
   ↓ Lead aparece no mural de corretores
   ↓ Múltiplos corretores podem se candidatar
   
4. CORRETOR
   ↓ Clica "Me Candidatar"
   ↓ Sistema escolhe o prioritário (menor posição na fila)
   ↓ Status: WAITING_REALTOR_ACCEPT
   ↓ Corretor tem 10 min para aceitar
   
5. CORRETOR ACEITA
   ↓ Status: WAITING_OWNER_APPROVAL
   ↓ Notifica proprietário
   
6. PROPRIETÁRIO
   ↓ Acessa /owner/leads/pending
   ↓ Vê solicitação de visita
   ↓ Clica "Aceitar Horário" ou "Recusar"
   
7A. PROPRIETÁRIO ACEITA
    ↓ Status: CONFIRMED
    ↓ Emails enviados para todos
    ↓ Visita agendada! 🎉
    
7B. PROPRIETÁRIO RECUSA
    ↓ Corretor volta para TOP 5 (sem penalidade)
    ↓ Lead volta para PENDING
    ↓ Cliente pode reagendar
```

---

## 🔍 DEBUG & LOGS

### **Verificar Logs:**

Os services usam `logger.info()`:

```typescript
// Exemplo de logs que você verá no console:
"Creating visit request"
"Priority realtor selected"
"Visit approved by owner"
"Realtor reallocated to top 5"
```

### **Console do Navegador:**

```javascript
// No navegador, você pode testar:
fetch('/api/leads/available-slots?propertyId=XXX&date=2024-10-19')
  .then(r => r.json())
  .then(console.log)
```

---

## ⚠️ PROBLEMAS COMUNS

### **Erro: "visitDate does not exist"**

**Causa:** Prisma Client não foi regenerado  
**Solução:**
```powershell
npx prisma generate
```

### **Erro: "Cannot find module"**

**Causa:** Cache do Next.js desatualizado  
**Solução:**
```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

### **TypeScript Errors**

**Causa:** Tipos desatualizados  
**Solução:**
```powershell
npx prisma generate
# Reiniciar VSCode
```

---

## 📖 DOCUMENTAÇÃO ADICIONAL

- **`LEAD_SYSTEM_FINAL.md`** - Especificação técnica completa
- **`DEVELOPMENT_ROADMAP.md`** - Roadmap de desenvolvimento
- **`DEVELOPMENT_PROGRESS.md`** - Progresso atual (60%)
- **`MIGRATION_GUIDE.md`** - Guia de migração detalhado
- **`VISUAL_FLOW_DIAGRAM.md`** - Diagramas visuais do fluxo

---

## 🚀 PRÓXIMO PASSO

**Execute a migração agora:**

```powershell
npx prisma migrate dev --name add_visit_scheduling_fields
npx prisma generate
Remove-Item -Recurse -Force .next
npm run dev
```

Depois teste acessando:
- `http://localhost:3000/property/[ID]/schedule-visit`

**Boa sorte! 🎯**
