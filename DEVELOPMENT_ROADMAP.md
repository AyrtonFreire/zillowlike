# 🗺️ MAPA DE DESENVOLVIMENTO - SISTEMA DE LEADS

## 📊 ANÁLISE DO CÓDIGO EXISTENTE

### ✅ O QUE JÁ TEMOS

#### **1. Banco de Dados (Prisma Schema)**
```
✅ User (com role REALTOR)
✅ Property 
✅ Lead (básico)
✅ Contact
✅ RealtorQueue (sistema de fila)
✅ LeadCandidature (candidaturas)
✅ RealtorStats (estatísticas)
✅ ScoreHistory (histórico de pontos)
✅ RealtorRating (avaliações)
```

**Status:** 70% compatível com novo sistema

**O que precisa mudar:**
- ❌ Lead não tem campos de horário de visita
- ❌ Lead não tem campos de aprovação do proprietário
- ❌ LeadStatus precisa de novos estados
- ❌ LeadCandidature usa queueId ao invés de realtorId direto

---

#### **2. Serviços Backend**

**✅ QueueService (`src/lib/queue-service.ts`)**
- ✅ Gerenciamento de fila
- ✅ Sistema de pontos
- ✅ Movimentação de posições
- ✅ Estatísticas

**Status:** 90% reutilizável - Apenas ajustes nas regras de pontos

---

**✅ LeadDistributionService (`src/lib/lead-distribution-service.ts`)**
- ✅ Distribuição de leads
- ✅ Aceitar/Rejeitar leads
- ✅ Candidatura a leads
- ✅ Mural de leads
- ✅ Liberação de reservas expiradas
- ✅ Notificações via Pusher

**Status:** 60% reutilizável - Precisa adaptar para horários de visita

---

#### **3. APIs Existentes**

**✅ `/api/leads` (POST)**
- Criação de lead básico (formulário de contato)
- Rate limiting
- Validação com Zod
- Notificação por email ao proprietário

**Status:** 50% reutilizável - Precisa adicionar seleção de horário

---

**✅ `/api/leads/[id]/accept` (POST)**
- Aceita lead reservado
- Atualiza estatísticas
- Move para fim da fila
- Notificações Pusher

**Status:** 80% reutilizável - Precisa adicionar aprovação do proprietário

---

**✅ `/api/leads/[id]/reject` (POST)**
- Rejeita lead
- Atualiza estatísticas
- Remove pontos

**Status:** 90% reutilizável - Funciona com mínimas adaptações

---

**✅ `/api/leads/my-leads` (GET)**
- Lista leads do corretor
- Filtra por status

**Status:** 100% reutilizável

---

**✅ `/api/leads/mural` (GET)**
- Lista leads disponíveis
- Filtros por cidade, tipo, preço

**Status:** 90% reutilizável - Precisa adicionar filtro por data/horário

---

#### **4. Componentes Frontend**

**✅ `/broker/leads/page.tsx`**
- Lista leads do corretor
- Botões aceitar/rejeitar
- Countdown timer para reserva
- Filtros por status

**Status:** 70% reutilizável - Precisa adaptar para novo fluxo

---

**✅ Componentes de UI:**
- ✅ `CountdownTimer` - Timer de expiração
- ✅ `StatusIndicator` - Indicador de status
- ✅ `LeadCard` - Card de lead
- ✅ `LeadListItem` - Item de lista

**Status:** 80% reutilizáveis - Precisam adaptações visuais

---

### ❌ O QUE FALTA DESENVOLVER

#### **1. Banco de Dados**

##### **Modificar Model Lead:**
```prisma
model Lead {
  // ... campos existentes ...
  
  // 🆕 NOVOS CAMPOS:
  visitDate           DateTime    // Data da visita
  visitTime           String      // Horário (ex: "14:00")
  clientNotes         String?     // Observações do cliente
  
  // Aprovação do proprietário
  ownerApproved       Boolean?    // null = pendente, true = aprovado, false = recusado
  ownerApprovedAt     DateTime?
  ownerRejectionReason String?
  
  // Contador de candidatos
  candidatesCount     Int         @default(0)
}
```

##### **Adicionar novos Status:**
```prisma
enum LeadStatus {
  PENDING               // Aguardando candidaturas
  MATCHING              // Buscando corretor (tem candidatos)
  WAITING_REALTOR       // Aguardando corretor prioritário aceitar
  WAITING_OWNER         // Aguardando proprietário aprovar horário
  CONFIRMED             // Visita confirmada!
  OWNER_REJECTED        // Proprietário recusou horário
  CANCELLED             // Cliente cancelou
  COMPLETED             // Visita realizada
  EXPIRED               // Expirou
}
```

##### **Modificar LeadCandidature:**
```prisma
model LeadCandidature {
  id          String    @id @default(cuid())
  lead        Lead      @relation(fields: [leadId], references: [id])
  leadId      String
  realtor     User      @relation(fields: [realtorId], references: [id])
  realtorId   String    // 🆕 Direto, não via queue
  queuePosition Int     // 🆕 Posição na fila no momento da candidatura
  status      CandidatureStatus
  createdAt   DateTime  @default(now())
  
  @@unique([leadId, realtorId])
}
```

---

#### **2. Backend Services**

##### **🆕 Novo: `VisitSchedulingService`**
```typescript
// src/lib/visit-scheduling-service.ts

class VisitSchedulingService {
  // Criar lead com horário de visita
  static async createVisitRequest(
    propertyId: string,
    clientData: { name, email, phone, notes },
    visitDate: Date,
    visitTime: string
  ): Promise<Lead>
  
  // Listar horários disponíveis de um imóvel
  static async getAvailableSlots(
    propertyId: string,
    date: Date
  ): Promise<string[]>
  
  // Verificar se horário já está ocupado
  static async isSlotTaken(
    propertyId: string,
    date: Date,
    time: string
  ): Promise<boolean>
}
```

##### **🆕 Novo: `OwnerApprovalService`**
```typescript
// src/lib/owner-approval-service.ts

class OwnerApprovalService {
  // Solicitar aprovação do proprietário
  static async requestApproval(leadId: string): Promise<void>
  
  // Aprovar horário
  static async approveVisit(
    leadId: string,
    ownerId: string
  ): Promise<void>
  
  // Recusar horário
  static async rejectVisit(
    leadId: string,
    ownerId: string,
    reason?: string
  ): Promise<void>
  
  // Recolocar corretor no top 5 após recusa
  static async reallocateRealtorToTop5(realtorId: string): Promise<void>
}
```

##### **🔄 Modificar: `LeadDistributionService`**
```typescript
// Adicionar métodos:

// Processar candidaturas e escolher corretor prioritário
static async selectPriorityRealtor(leadId: string): Promise<User>

// Notificar apenas o corretor prioritário (10 min)
static async notifyPriorityRealtor(
  leadId: string, 
  realtorId: string
): Promise<void>

// Se expirar, passar para próximo candidato
static async moveToNextCandidate(leadId: string): Promise<void>
```

---

#### **3. APIs**

##### **🔄 Modificar: `POST /api/leads`**
```typescript
// Adicionar campos:
{
  propertyId: string,
  contact: { name, email, phone },
  message?: string,
  visitDate: string,     // 🆕 "2024-10-18"
  visitTime: string,     // 🆕 "14:00"
}
```

##### **🆕 Nova: `GET /api/leads/available-slots`**
```typescript
// Retorna horários disponíveis de um imóvel
Query params: propertyId, date

Response: {
  slots: ["08:00", "09:00", "10:00", ...],
  taken: ["14:00", "15:00"]
}
```

##### **🆕 Nova: `POST /api/leads/[id]/candidate`**
```typescript
// Corretor se candidata a um lead
Body: { realtorId }

Response: {
  success: true,
  message: "Candidatura enviada!",
  position: 5,  // Posição na fila de candidatos
  totalCandidates: 3
}
```

##### **🔄 Modificar: `POST /api/leads/[id]/accept`**
```typescript
// Adicionar lógica:
1. Corretor aceita
2. Status muda para WAITING_OWNER
3. Notifica proprietário
4. Aguarda aprovação
```

##### **🆕 Nova: `POST /api/leads/[id]/owner-approve`**
```typescript
// Proprietário aprova horário
Body: { ownerId }

Response: {
  success: true,
  message: "Visita confirmada!",
  visitDetails: { date, time, realtor, client }
}
```

##### **🆕 Nova: `POST /api/leads/[id]/owner-reject`**
```typescript
// Proprietário recusa horário
Body: { 
  ownerId,
  reason?: string 
}

Actions:
1. Status volta para PENDING
2. Corretor volta para TOP 5 da fila
3. Lead volta ao mural
4. Notifica cliente
```

##### **🆕 Nova: `GET /api/leads/mural/by-property`**
```typescript
// Lista todos os leads de um imóvel (múltiplos horários)
Query: propertyId

Response: {
  property: {...},
  leads: [
    { id, visitDate, visitTime, status, candidatesCount },
    { id, visitDate, visitTime, status, candidatesCount },
    ...
  ]
}
```

---

#### **4. Frontend - Pages**

##### **🆕 Nova: `/property/[id]/schedule-visit`**
```typescript
// Cliente escolhe horário de visita
- Calendário interativo
- Horários disponíveis (slots)
- Formulário de contato
- Confirmação
```

##### **🔄 Modificar: `/broker/leads/mural`**
```typescript
// Mural de leads por horário
- Card = Imóvel + Data + Horário + Cliente
- Mesmo imóvel pode aparecer múltiplas vezes
- Filtros: cidade, tipo, preço, DATA
- Botão "ME CANDIDATAR"
- Indicador de candidatos (3/∞)
```

##### **🆕 Nova: `/broker/leads/[id]`**
```typescript
// Detalhes do lead com timer
- Informações do imóvel
- Dados do cliente
- Horário da visita
- Timer de 10 minutos (se prioritário)
- Botões ACEITAR/REJEITAR
```

##### **🆕 Nova: `/owner/leads/pending`**
```typescript
// Proprietário aprova/recusa horários
- Lista de visitas pendentes
- Dados do corretor
- Dados do cliente
- Horário solicitado
- Botões ACEITAR/RECUSAR HORÁRIO
- Campo opcional de motivo da recusa
```

##### **🆕 Nova: `/owner/leads/confirmed`**
```typescript
// Visitas confirmadas do proprietário
- Lista de visitas agendadas
- Por data/horário
- Contatos (corretor + cliente)
- Botão "Cancelar visita"
```

---

#### **5. Frontend - Componentes**

##### **🆕 `ScheduleVisitForm`**
```typescript
// Formulário de agendamento de visita
- Seletor de data (DatePicker)
- Seletor de horário (TimeSlots)
- Campos de contato
- Observações
```

##### **🆕 `TimeSlotPicker`**
```typescript
// Seletor de horários disponíveis
- Lista de slots (08:00, 09:00, ...)
- Indicador de disponível/ocupado
- Seleção única
```

##### **🆕 `LeadCardWithTime`**
```typescript
// Card de lead com horário
- Imóvel
- Data + Horário destacados
- Nome do cliente
- Contador de candidatos
- Botão "ME CANDIDATAR"
```

##### **🆕 `PriorityLeadModal`**
```typescript
// Modal de lead prioritário com countdown
- Detalhes completos
- Timer de 10 minutos (grande e visível)
- Botões ACEITAR/REJEITAR
- Som/notificação de alerta
```

##### **🆕 `OwnerApprovalCard`**
```typescript
// Card de aprovação para proprietário
- Dados da visita
- Perfil do corretor (sem avaliações!)
- Dados do cliente
- Botões ACEITAR/RECUSAR HORÁRIO
```

##### **🔄 `CandidateList`**
```typescript
// Lista de candidatos (para proprietário ver)
- Nome + foto do corretor
- Posição na fila
- Estatísticas básicas (leads atendidos)
- Contato
```

---

#### **6. Emails & Notificações**

##### **🆕 Email: Cliente → Solicitação Enviada**
```
Assunto: Visita solicitada com sucesso!

Olá [Cliente],

Sua solicitação de visita foi enviada:

📅 [Imóvel]
📆 Data: [dd/mm]
⏰ Horário: [HH:MM]

Um corretor entrará em contato em breve!
```

##### **🆕 Email: Corretor → Lead Disponível (Prioritário)**
```
Assunto: 🎯 VOCÊ FOI ESCOLHIDO! Responda em 10 minutos

[Corretor],

Você é o corretor prioritário para:

📅 [Imóvel]
📆 Data: [dd/mm]
⏰ Horário: [HH:MM]
👤 Cliente: [Nome]

⏰ VOCÊ TEM 10 MINUTOS PARA ACEITAR!

[ACEITAR AGORA]
```

##### **🆕 Email: Proprietário → Aprovar Horário**
```
Assunto: Aprovar visita ao seu imóvel

Olá [Proprietário],

Um corretor quer fazer uma visita:

📅 [Imóvel]
📆 Data: [dd/mm]
⏰ Horário: [HH:MM]

👤 Corretor: [Nome]
📊 [X] visitas realizadas

Você aceita esse horário?

[ACEITAR HORÁRIO] [RECUSAR HORÁRIO]
```

##### **🆕 Email: Todos → Visita Confirmada**
```
Para CLIENTE, CORRETOR e PROPRIETÁRIO:

✅ VISITA CONFIRMADA!

📅 [Imóvel]
📍 [Endereço completo]
📆 Data: [dd/mm]
⏰ Horário: [HH:MM]

Contatos:
[Todos os telefones/emails]
```

##### **🆕 Email: Corretor → Proprietário Recusou**
```
Assunto: Horário não aprovado (sem penalidade)

[Corretor],

O proprietário não pôde aceitar o horário
desta visita.

✅ Você NÃO foi penalizado
✅ Você foi realocado no TOP 5 da fila

Continue se candidatando! 💪
```

---

## 📋 CHECKLIST DE DESENVOLVIMENTO

### **FASE 1: Database & Backend Core (Semana 1)**

- [ ] Migração Prisma - Adicionar campos de visita ao Lead
- [ ] Migração Prisma - Novos status de Lead
- [ ] Migração Prisma - Modificar LeadCandidature
- [ ] Criar `VisitSchedulingService`
- [ ] Criar `OwnerApprovalService`
- [ ] Modificar `LeadDistributionService`
- [ ] Testes unitários dos services

### **FASE 2: APIs (Semana 2)**

- [ ] Modificar `POST /api/leads` (adicionar horário)
- [ ] Criar `GET /api/leads/available-slots`
- [ ] Criar `POST /api/leads/[id]/candidate`
- [ ] Modificar `POST /api/leads/[id]/accept`
- [ ] Criar `POST /api/leads/[id]/owner-approve`
- [ ] Criar `POST /api/leads/[id]/owner-reject`
- [ ] Criar `GET /api/leads/mural/by-property`
- [ ] Testes de integração das APIs

### **FASE 3: Frontend Cliente (Semana 3)**

- [ ] Componente `TimeSlotPicker`
- [ ] Componente `ScheduleVisitForm`
- [ ] Página `/property/[id]/schedule-visit`
- [ ] Integrar formulário com API
- [ ] Página de confirmação

### **FASE 4: Frontend Corretor (Semana 4)**

- [ ] Modificar mural de leads (por horário)
- [ ] Componente `LeadCardWithTime`
- [ ] Componente `PriorityLeadModal`
- [ ] Página `/broker/leads/[id]`
- [ ] Notificações em tempo real (Pusher)
- [ ] Som de alerta para lead prioritário

### **FASE 5: Frontend Proprietário (Semana 5)**

- [ ] Componente `OwnerApprovalCard`
- [ ] Página `/owner/leads/pending`
- [ ] Página `/owner/leads/confirmed`
- [ ] Dashboard de visitas agendadas
- [ ] Notificações de novas solicitações

### **FASE 6: Emails & Notificações (Semana 6)**

- [ ] Template: Cliente - Solicitação enviada
- [ ] Template: Corretor - Lead prioritário
- [ ] Template: Proprietário - Aprovar horário
- [ ] Template: Todos - Visita confirmada
- [ ] Template: Corretor - Proprietário recusou
- [ ] Template: Cliente - Novo horário
- [ ] Configurar envios automáticos

### **FASE 7: Jobs & Workers (Semana 7)**

- [ ] Worker: Liberar leads expirados (corretor não aceitou)
- [ ] Worker: Passar para próximo candidato
- [ ] Worker: Limpar leads de visitas passadas
- [ ] Worker: Enviar lembretes de visitas (1h antes)
- [ ] Cron jobs na Vercel

### **FASE 8: Testes & Ajustes (Semana 8)**

- [ ] Teste completo do fluxo cliente → corretor → proprietário
- [ ] Teste de múltiplos leads no mesmo imóvel
- [ ] Teste de sistema de fila com candidaturas
- [ ] Teste de recusa do proprietário → TOP 5
- [ ] Teste de expiração e rotação de candidatos
- [ ] Ajustes de UX
- [ ] Ajustes de performance

---

## 🎯 RESUMO DE ESFORÇO

### **Reutilização:**
- ✅ **70%** do banco de dados
- ✅ **80%** dos services existentes
- ✅ **60%** das APIs
- ✅ **50%** dos componentes frontend

### **Novo desenvolvimento:**
- 🆕 **3 novos services**
- 🆕 **5 novas APIs**
- 🆕 **8 novas páginas**
- 🆕 **10 novos componentes**
- 🆕 **6 templates de email**
- 🆕 **4 workers/jobs**

### **Tempo estimado:**
- ⏱️ **8 semanas** (2 meses)
- 👨‍💻 **1 desenvolvedor full-time**
- 📦 **~150 horas** de desenvolvimento

### **Complexidade:**
- 🔴 **Alta:** Sistema de candidaturas + fila
- 🟡 **Média:** Aprovação do proprietário
- 🟢 **Baixa:** Agendamento de horários

---

## 🚀 PRIORIDADES

### **MVP (Mínimo Viável):**
1. ✅ Cliente agenda visita com horário
2. ✅ Mural mostra leads por horário
3. ✅ Corretor se candidata
4. ✅ Sistema escolhe prioritário
5. ✅ Proprietário aprova/recusa
6. ✅ Visita confirmada

### **Pode esperar:**
- ⏸️ Notificações em tempo real (Pusher)
- ⏸️ Som de alerta
- ⏸️ Dashboard avançado
- ⏸️ Relatórios
- ⏸️ Analytics

---

## 📊 DEPENDÊNCIAS

### **Externas:**
- ✅ Prisma (já configurado)
- ✅ NextAuth (já configurado)
- ✅ Pusher (já configurado)
- ✅ Resend (email - já configurado)
- 🆕 Date library (date-fns ou dayjs)

### **Internas:**
- ✅ Sistema de autenticação (OK)
- ✅ Sistema de roles (OK)
- ✅ Sistema de fila (OK)
- ✅ Sistema de pontos (OK)

---

## ⚠️ RISCOS & MITIGAÇÕES

### **Risco 1: Múltiplos candidatos simultâneos**
**Mitigação:** Transaction locks no Prisma ao selecionar corretor prioritário

### **Risco 2: Horários conflitantes**
**Mitigação:** Validação de disponibilidade antes de confirmar

### **Risco 3: Emails não chegando**
**Mitigação:** Retry logic + logs + notificações in-app

### **Risco 4: Performance com muitos leads**
**Mitigação:** Indexes no banco + pagination + cache

### **Risco 5: Confusão com múltiplos leads do mesmo imóvel**
**Mitigação:** UI clara mostrando horário + cliente em destaque

---

## 🎓 DOCUMENTAÇÃO NECESSÁRIA

- [ ] Guia de uso para clientes
- [ ] Guia de uso para corretores
- [ ] Guia de uso para proprietários
- [ ] API documentation
- [ ] Diagramas de fluxo
- [ ] FAQ

---

**Documento criado em:** 18/10/2024
**Última atualização:** 18/10/2024
**Status:** 🟡 Aguardando aprovação para iniciar desenvolvimento
