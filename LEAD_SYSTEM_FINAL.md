# 🎯 SISTEMA DE LEADS - VERSÃO DEFINITIVA

## 🧠 CONCEITO FUNDAMENTAL

```
LEAD = Imóvel + Horário de Visita + Cliente

Um mesmo imóvel pode ter MÚLTIPLOS LEADS (diferentes clientes/horários)
Cada lead é uma oportunidade independente
Corretores competem por leads individuais, não por imóveis
```

---

## 📋 EXEMPLO PRÁTICO

```
Imóvel: Casa 3 Quartos - Petrolina - R$ 450k

LEAD #1:
📅 Hoje, 14:00
👤 Cliente: João Silva
👥 Candidatos: Pedro (#1), Ana (#5), João (#8)
🎯 Escolhido: Pedro (menor posição na fila)
✅ Status: Aguardando aceite do corretor

LEAD #2:
📅 Hoje, 15:00  
👤 Cliente: Maria Santos
👥 Candidatos: Carlos (#3), Rita (#6)
🎯 Escolhido: Carlos
✅ Status: Aguardando aceite do corretor

LEAD #3:
📅 Amanhã, 10:00
👤 Cliente: Lucas Pereira
👥 Candidatos: Nenhum ainda
⏳ Status: Disponível no mural

LEAD #4:
📅 Amanhã, 16:00
👤 Cliente: Ana Costa
👥 Candidatos: Pedro (#1)
🎯 Escolhido: Pedro
✅ Status: Corretor aceitou, aguardando proprietário
```

**Resultado:** 1 imóvel = 4 leads diferentes = até 4 corretores trabalhando

---

## 🔄 FLUXO COMPLETO DO SISTEMA

### **FASE 1: Cliente Solicita Visita**

```
┌─────────────────────────────────────┐
│ Cliente navega no site              │
│ Encontra: Casa 3Q - Petrolina       │
│ Clica: "AGENDAR VISITA"             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Formulário:                         │
│                                     │
│ 📅 Escolha o dia:                   │
│ [Hoje ▼] [Amanhã] [Escolher data]  │
│                                     │
│ ⏰ Escolha o horário:                │
│ [14:00 ▼]                           │
│                                     │
│ 👤 Seus dados:                      │
│ Nome: [João Silva        ]          │
│ Tel:  [(87) 99999-9999  ]          │
│ Email:[joao@email.com   ]          │
│                                     │
│ 💬 Observações (opcional):          │
│ [Tenho interesse em financiar]     │
│                                     │
│ [✅ SOLICITAR VISITA]                │
└─────────────────────────────────────┘
```

**Sistema cria:**
```javascript
Lead {
  id: "lead-001",
  propertyId: "prop-123",
  clientName: "João Silva",
  clientPhone: "(87) 99999-9999",
  clientEmail: "joao@email.com",
  visitDate: "2024-10-18",
  visitTime: "14:00",
  status: "PENDING", // Aguardando candidaturas
  candidates: [],
  selectedRealtorId: null,
  createdAt: "2024-10-18 10:30"
}
```

---

### **FASE 2: Lead Aparece no Mural**

```
┌─────────────────────────────────────┐
│ 🏠 MURAL DE OPORTUNIDADES           │
├─────────────────────────────────────┤
│ Filtros:                             │
│ Cidade: [Todas ▼]                   │
│ Tipo: [Todos ▼]                     │
│ Preço: De [___] Até [___]           │
│ Data: [Hoje ▼]                      │
│ [🔍 FILTRAR]                        │
├─────────────────────────────────────┤
│                                     │
│ 🏠 Casa 3 Quartos - Petrolina      │
│    R$ 450.000                       │
│    📍 Bairro Centro                 │
│                                     │
│    📅 VISITA: Hoje, 14:00          │
│    👤 Cliente: João Silva           │
│    💬 "Tenho interesse em financiar"│
│                                     │
│    👥 Candidatos: 0                 │
│                                     │
│    [VER DETALHES] [ME CANDIDATAR]   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ 🏠 Casa 3 Quartos - Petrolina      │
│    R$ 450.000  (MESMO IMÓVEL!)     │
│    📍 Bairro Centro                 │
│                                     │
│    📅 VISITA: Hoje, 15:00          │
│    👤 Cliente: Maria Santos         │
│    💬 Sem observações               │
│                                     │
│    👥 Candidatos: 1                 │
│                                     │
│    [VER DETALHES] [ME CANDIDATAR]   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ 🏢 Apartamento 2Q - Juazeiro       │
│    R$ 280.000                       │
│    📍 Bairro São Francisco          │
│                                     │
│    📅 VISITA: Amanhã, 10:00        │
│    👤 Cliente: Carlos Lima          │
│                                     │
│    👥 Candidatos: 3                 │
│                                     │
│    [VER DETALHES] [ME CANDIDATAR]   │
└─────────────────────────────────────┘
```

---

### **FASE 3: Corretores Se Candidatam**

```
Corretor clica "ME CANDIDATAR":

┌─────────────────────────────────────┐
│ ✅ Candidatura Enviada!              │
├─────────────────────────────────────┤
│                                     │
│ Você se candidatou para:            │
│                                     │
│ 🏠 Casa 3 Quartos - Petrolina      │
│ 📅 Hoje, 14:00                      │
│ 👤 Cliente: João Silva              │
│                                     │
│ 📊 Sua posição na fila: #5          │
│                                     │
│ 👥 Outros candidatos:               │
│ • Pedro Santos (posição #1) 👑      │
│ • Ana Costa (posição #3)            │
│ • Carlos Silva (posição #7)         │
│ • Você (posição #5)                 │
│                                     │
│ 💡 O sistema vai oferecer primeiro  │
│    ao corretor melhor posicionado   │
│    (Pedro).                         │
│                                     │
│ ⏰ Se ele não aceitar em 10 min,   │
│    passa para Ana, depois você!     │
│                                     │
│ 📧 Te avisaremos se chegar sua vez. │
│                                     │
│ [OK, ENTENDI]                       │
└─────────────────────────────────────┘
```

**Sistema atualiza:**
```javascript
Lead {
  ...
  status: "MATCHING", // Sistema procurando corretor
  candidates: [
    { realtorId: "realtor-001", queuePosition: 1 }, // Pedro
    { realtorId: "realtor-005", queuePosition: 3 }, // Ana
    { realtorId: "realtor-003", queuePosition: 5 }, // Você
    { realtorId: "realtor-008", queuePosition: 7 }  // Carlos
  ]
}
```

---

### **FASE 4: Sistema Escolhe Corretor Prioritário**

```
Sistema ordena candidatos por queuePosition:
1. Pedro (posição #1) 👑 ESCOLHIDO!
2. Ana (posição #3)
3. Você (posição #5)
4. Carlos (posição #7)

Notificação para Pedro:
```

```
┌─────────────────────────────────────┐
│ 🎯 VOCÊ FOI ESCOLHIDO!              │
├─────────────────────────────────────┤
│                                     │
│ 🏠 Casa 3 Quartos - Petrolina      │
│    R$ 450.000                       │
│                                     │
│ 📅 VISITA: Hoje, 14:00             │
│                                     │
│ 👤 CLIENTE:                         │
│    Nome: João Silva                 │
│    Tel: (87) 99999-9999            │
│    Email: joao@email.com           │
│    Obs: "Tenho interesse em         │
│          financiar"                 │
│                                     │
│ ⏰ VOCÊ TEM 10 MINUTOS              │
│    PARA ACEITAR OU REJEITAR         │
│                                     │
│    Tempo restante: 09:45            │
│    ████████████████░░░              │
│                                     │
│ [✅ ACEITAR] [❌ REJEITAR]          │
│                                     │
│ 💡 Se aceitar, o proprietário       │
│    precisará aprovar o horário.     │
└─────────────────────────────────────┘
```

**Sistema atualiza:**
```javascript
Lead {
  ...
  status: "WAITING_REALTOR_ACCEPT",
  selectedRealtorId: "realtor-001", // Pedro
  offerExpiresAt: "2024-10-18 10:40" // 10 minutos
}
```

---

### **FASE 5A: Corretor ACEITA**

```
Pedro clica "ACEITAR":

Sistema atualiza:
Lead {
  ...
  status: "WAITING_OWNER_APPROVAL",
  realtorAcceptedAt: "2024-10-18 10:35"
}

Notificação ao Proprietário:
```

```
┌─────────────────────────────────────┐
│ 📧 Email ao Proprietário:           │
├─────────────────────────────────────┤
│                                     │
│ Olá José! 👋                        │
│                                     │
│ Um corretor quer fazer uma visita   │
│ ao seu imóvel:                      │
│                                     │
│ 🏠 Casa 3 Quartos - Petrolina      │
│                                     │
│ 📅 DIA: Hoje (18/10)                │
│ ⏰ HORÁRIO: 14:00                   │
│                                     │
│ 👤 CORRETOR:                        │
│    Pedro Santos                     │
│    ⭐ 18 visitas realizadas         │
│    📞 (87) 98888-8888              │
│                                     │
│ 👤 CLIENTE INTERESSADO:             │
│    João Silva                       │
│                                     │
│ ❓ Você aceita essa visita no       │
│    horário solicitado?              │
│                                     │
│ [✅ ACEITAR HORÁRIO]                │
│ [❌ RECUSAR HORÁRIO]                │
│                                     │
│ 💡 Se aceitar, enviaremos os        │
│    contatos para você e o corretor. │
└─────────────────────────────────────┘
```

---

### **FASE 5B: Proprietário ACEITA Horário**

```
Proprietário clica "ACEITAR HORÁRIO":

Sistema atualiza:
Lead {
  ...
  status: "CONFIRMED",
  ownerApprovedAt: "2024-10-18 10:38"
}

✅ VISITA CONFIRMADA!
```

**Notificações enviadas:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Para o CLIENTE (João):

✅ Visita confirmada!

🏠 Casa 3 Quartos - Petrolina
📅 Hoje, 18/10 às 14:00
📍 Rua das Flores, 123

👤 Corretor: Pedro Santos
📞 (87) 98888-8888

Até lá! 🏡
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 Para o CORRETOR (Pedro):

✅ Proprietário aceitou!

🏠 Casa 3 Quartos - Petrolina
📅 Hoje, 18/10 às 14:00
📍 Rua das Flores, 123

👤 Cliente: João Silva
📞 (87) 99999-9999

👤 Proprietário: José Santos
📞 (87) 97777-7777

Boa visita! 💼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 Para o PROPRIETÁRIO (José):

✅ Visita agendada!

📅 Hoje, 18/10 às 14:00

👤 Corretor: Pedro Santos
📞 (87) 98888-8888

Prepare o imóvel! 🏡
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Lead sai do mural automaticamente!**

---

### **FASE 5C: Proprietário RECUSA Horário**

```
Proprietário clica "RECUSAR HORÁRIO":

┌─────────────────────────────────────┐
│ Por que você está recusando?        │
│ (Opcional)                           │
│                                     │
│ [ ] Horário inconveniente           │
│ [ ] Imóvel não está pronto          │
│ [ ] Já vendi o imóvel               │
│ [ ] Outro motivo                    │
│                                     │
│ [CONFIRMAR RECUSA]                  │
└─────────────────────────────────────┘

Sistema atualiza:
Lead {
  ...
  status: "OWNER_REJECTED",
  ownerRejectedAt: "2024-10-18 10:38",
  ownerRejectionReason: "Horário inconveniente"
}
```

**Ações do sistema:**

```
1. Notifica Pedro:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Para o CORRETOR (Pedro):

O proprietário não pôde aceitar o 
horário desta visita.

Motivo: Horário inconveniente

✅ Você NÃO perdeu pontos!
✅ Você foi realocado no TOP 5 da fila

Pode continuar se candidatando! 💪
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. Pedro volta para posição privilegiada:
Fila antes: Pedro estava em #1
Fila depois: Pedro volta para #5 (TOP 5)

3. Lead volta ao mural:
Lead {
  ...
  status: "PENDING", // Volta ao início
  candidates: [], // Limpa candidatos
  selectedRealtorId: null
}

4. Notifica Cliente:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Para o CLIENTE (João):

Infelizmente o proprietário não pôde
aceitar o horário das 14h.

Gostaria de escolher outro horário?

[ESCOLHER NOVO HORÁRIO]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### **FASE 5D: Corretor NÃO Aceita (Tempo Esgota)**

```
Pedro não clica em nada por 10 minutos:

Sistema atualiza:
Lead {
  ...
  status: "MATCHING", // Volta a buscar corretor
  selectedRealtorId: null
}

Pedro sai da lista de candidatos deste lead!

Sistema escolhe próximo na fila:
Candidatos restantes:
1. Ana (posição #3) 👑 NOVA ESCOLHIDA!
2. Você (posição #5)
3. Carlos (posição #7)

Notificação para Ana:
(Mesmo formato da Fase 4)
```

**Penalidade para Pedro (opcional):**
```
- Desce 2 posições na fila geral (de #1 para #3)
OU
- Nenhuma penalidade (versão zero pressão)
```

---

### **FASE 5E: Corretor REJEITA Explicitamente**

```
Pedro clica "REJEITAR":

┌─────────────────────────────────────┐
│ Por que está rejeitando?            │
│ (Opcional)                           │
│                                     │
│ [ ] Horário incompatível            │
│ [ ] Fora da minha área              │
│ [ ] Já tenho compromisso            │
│ [ ] Outro motivo                    │
│                                     │
│ [CONFIRMAR REJEIÇÃO]                │
└─────────────────────────────────────┘

Sistema:
- Remove Pedro dos candidatos
- Passa para próximo (Ana)
- Pedro mantém posição na fila (sem penalidade)
```

---

## 📊 ESTADOS DO LEAD

```javascript
LeadStatus {
  PENDING               // Aguardando candidaturas
  MATCHING              // Buscando corretor (tem candidatos)
  WAITING_REALTOR_ACCEPT // Aguardando corretor aceitar (10min)
  WAITING_OWNER_APPROVAL // Aguardando proprietário aprovar horário
  CONFIRMED             // Visita confirmada!
  OWNER_REJECTED        // Proprietário recusou horário
  EXPIRED               // Nenhum corretor aceitou + horário passou
  CANCELLED             // Cliente cancelou
  COMPLETED             // Visita foi realizada
}
```

---

## 🎯 SISTEMA DE FILA

### **Como Funciona:**

```
Fila Global de Corretores (ordenada por pontos):

#1  Maria (85 pontos) 👑
#2  Pedro (82 pontos)
#3  Ana (78 pontos)
#4  João (75 pontos)
#5  Carlos (73 pontos)
#6  Rita (70 pontos)
#7  Lucas (68 pontos)
#8  Paula (65 pontos)
...
```

### **Regras:**

1. **Apenas o 1º da fila recebe notificação com tempo limite**
2. **Demais candidatos aguardam sem pressão**
3. **Sistema escolhe menor posição entre os candidatos**

### **Exemplo:**

```
Lead #1 - Casa Petrolina, 14h
Candidatos:
- Pedro (#2 na fila)
- Carlos (#5 na fila)
- Lucas (#7 na fila)

Sistema escolhe: Pedro (#2 - menor posição)
Pedro tem 10 minutos para aceitar
```

### **Sistema de Pontos (Simples):**

```
Ações que GANHAM pontos:
✅ Aceitar lead rapidamente: +5 pontos
✅ Visita confirmada pelo proprietário: +10 pontos
✅ Visita realizada: +15 pontos
✅ Negócio fechado: +50 pontos

Ações que PERDEM pontos:
❌ Deixar expirar (não responde): -10 pontos
❌ Rejeitar lead: -2 pontos (pequeno)

Ações NEUTRAS:
⚪ Proprietário recusa horário: 0 pontos
   → Corretor volta para TOP 5
```

---

## 🏗️ ESTRUTURA DO BANCO DE DADOS

```prisma
model Lead {
  id                    String   @id @default(cuid())
  
  // Imóvel
  property              Property @relation(fields: [propertyId], references: [id])
  propertyId            String
  
  // Cliente
  clientName            String
  clientEmail           String
  clientPhone           String
  clientNotes           String?
  
  // Visita
  visitDate             DateTime
  visitTime             String   // "14:00"
  
  // Status
  status                LeadStatus @default(PENDING)
  
  // Candidatos
  candidates            LeadCandidate[]
  
  // Corretor Selecionado
  selectedRealtor       User?    @relation("SelectedLead", fields: [selectedRealtorId], references: [id])
  selectedRealtorId     String?
  offerExpiresAt        DateTime?
  realtorAcceptedAt     DateTime?
  
  // Aprovação do Proprietário
  ownerApprovedAt       DateTime?
  ownerRejectedAt       DateTime?
  ownerRejectionReason  String?
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  confirmedAt           DateTime?
  completedAt           DateTime?
  cancelledAt           DateTime?
}

model LeadCandidate {
  id              String   @id @default(cuid())
  
  lead            Lead     @relation(fields: [leadId], references: [id])
  leadId          String
  
  realtor         User     @relation(fields: [realtorId], references: [id])
  realtorId       String
  
  queuePosition   Int      // Posição na fila no momento da candidatura
  appliedAt       DateTime @default(now())
  
  @@unique([leadId, realtorId]) // Corretor não pode se candidatar 2x ao mesmo lead
}

model RealtorQueue {
  id          String   @id @default(cuid())
  
  realtor     User     @relation(fields: [realtorId], references: [id])
  realtorId   String   @unique
  
  points      Int      @default(0)
  position    Int      // Calculado automaticamente baseado em pontos
  
  updatedAt   DateTime @updatedAt
}

enum LeadStatus {
  PENDING
  MATCHING
  WAITING_REALTOR_ACCEPT
  WAITING_OWNER_APPROVAL
  CONFIRMED
  OWNER_REJECTED
  EXPIRED
  CANCELLED
  COMPLETED
}
```

---

## 🎨 INTERFACES PRINCIPAIS

### **1. Mural de Leads (Corretor)**
- Lista de imóveis + horários disponíveis
- Filtros por cidade, tipo, preço, data
- Botão "ME CANDIDATAR"
- Indicador de quantos candidatos

### **2. Dashboard do Corretor**
- Posição atual na fila
- Pontos totais
- Leads aguardando sua resposta
- Visitas confirmadas
- Histórico

### **3. Notificação de Lead (Corretor)**
- Detalhes do imóvel
- Dados do cliente
- Horário da visita
- Timer de 10 minutos
- Botões ACEITAR/REJEITAR

### **4. Aprovação de Horário (Proprietário)**
- Detalhes da visita
- Dados do corretor
- Botões ACEITAR/RECUSAR HORÁRIO

### **5. Confirmação de Visita**
- Para cliente, corretor e proprietário
- Todos os contatos
- Endereço completo
- Horário

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Definir conceito (FEITO!)
2. 📊 Analisar código existente
3. 🗺️ Criar mapa de desenvolvimento
4. 🎨 Criar wireframes das telas
5. 💻 Implementar features

---

**Essa é a versão definitiva do sistema!** 🎯
