# 🔄 DIAGRAMA DE FLUXO VISUAL - SISTEMA DE LEADS

## 📱 FLUXO COMPLETO DO SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                         1. CLIENTE                              │
│                    (Navegando no site)                          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Vê imóvel e clica
                               │ "AGENDAR VISITA"
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PÁGINA DE AGENDAMENTO                         │
│                                                                 │
│  📅 Escolha o dia:    [Hoje ▼] [Amanhã] [Outra data]          │
│  ⏰ Escolha o horário: [08:00] [09:00] [10:00] ...             │
│  👤 Seus dados:       [Nome] [Email] [Telefone]                │
│  💬 Observações:      [Opcional]                                │
│                                                                 │
│  [✅ SOLICITAR VISITA]                                          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Submete formulário
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SISTEMA CRIA LEAD                          │
│                                                                 │
│  Lead {                                                         │
│    propertyId: "abc123"                                         │
│    clientName: "João Silva"                                     │
│    visitDate: "2024-10-18"                                     │
│    visitTime: "14:00"                                          │
│    status: PENDING                                              │
│  }                                                              │
│                                                                 │
│  ✅ Lead aparece no MURAL                                       │
│  ✅ Email enviado ao cliente: "Solicitação enviada!"           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. MURAL DE LEADS                            │
│                (Visível para todos os corretores)               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Múltiplos corretores veem
                               ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  CORRETOR PEDRO  │  │  CORRETOR ANA    │  │  CORRETOR JOÃO   │
│  Posição #1      │  │  Posição #5      │  │  Posição #8      │
│                  │  │                  │  │                  │
│  [ME CANDIDATAR] │  │  [ME CANDIDATAR] │  │  [ME CANDIDATAR] │
└──────────────────┘  └──────────────────┘  └──────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │ Todos se candidatam
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SISTEMA ESCOLHE CORRETOR                      │
│                                                                 │
│  Candidatos:                                                    │
│  • Pedro (posição #1 na fila) 👑 ESCOLHIDO!                    │
│  • Ana (posição #5 na fila)                                    │
│  • João (posição #8 na fila)                                   │
│                                                                 │
│  Critério: Menor posição na fila                               │
│                                                                 │
│  Status do Lead: WAITING_REALTOR_ACCEPT                         │
│  Reservado para: Pedro                                          │
│  Expira em: 10 minutos                                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Notifica apenas Pedro
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│            🎯 NOTIFICAÇÃO PARA PEDRO (10 MIN)                   │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│  📧 Email + Notificação In-App:                                │
│                                                                 │
│  🎯 VOCÊ FOI ESCOLHIDO!                                        │
│                                                                 │
│  🏠 Casa 3 Quartos - Petrolina                                 │
│  💰 R$ 450.000                                                 │
│  📅 VISITA: Hoje, 14:00                                        │
│  👤 Cliente: João Silva                                        │
│     Tel: (87) 99999-9999                                       │
│                                                                 │
│  ⏰ VOCÊ TEM 10 MINUTOS                                        │
│     Tempo restante: 09:45                                      │
│     ████████████████░░░                                        │
│                                                                 │
│  [✅ ACEITAR] [❌ REJEITAR]                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
└─────────────────────────────────────────────────────────────────┘
                               │
                   ┌───────────┴───────────┐
                   │                       │
               ACEITA                  REJEITA/EXPIRA
                   │                       │
                   ▼                       ▼
    ┌──────────────────────┐   ┌─────────────────────┐
    │ 3. PEDRO ACEITA!     │   │ Passa para ANA      │
    │                      │   │ (próxima na fila)   │
    │ Status: WAITING_     │   │ Ela tem 10 min      │
    │         OWNER_       │   │                     │
    │         APPROVAL     │   │ Se não aceitar →    │
    │                      │   │ Passa para JOÃO     │
    └──────────────────────┘   └─────────────────────┘
               │
               │ Notifica proprietário
               ▼
┌─────────────────────────────────────────────────────────────────┐
│         📧 EMAIL PARA PROPRIETÁRIO (José)                       │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│  Olá José! 👋                                                  │
│                                                                 │
│  Um corretor quer fazer uma visita ao seu imóvel:              │
│                                                                 │
│  🏠 Casa 3 Quartos - Petrolina                                 │
│  📅 DIA: Hoje (18/10)                                          │
│  ⏰ HORÁRIO: 14:00                                             │
│                                                                 │
│  👤 CORRETOR:                                                  │
│     Pedro Santos                                                │
│     📊 18 visitas realizadas                                   │
│     📞 (87) 98888-8888                                         │
│                                                                 │
│  👤 CLIENTE INTERESSADO:                                       │
│     João Silva                                                  │
│                                                                 │
│  ❓ Você aceita essa visita no horário solicitado?            │
│                                                                 │
│  [✅ ACEITAR HORÁRIO] [❌ RECUSAR HORÁRIO]                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
└─────────────────────────────────────────────────────────────────┘
                               │
                   ┌───────────┴───────────┐
                   │                       │
           PROPRIETÁRIO                PROPRIETÁRIO
              ACEITA                     RECUSA
                   │                       │
                   ▼                       ▼
    ┌──────────────────────┐   ┌─────────────────────────┐
    │ 4. ✅ CONFIRMADO!    │   │ ❌ RECUSADO             │
    │                      │   │                         │
    │ Status: CONFIRMED    │   │ Pedro volta TOP 5 fila  │
    │                      │   │ Lead volta ao mural     │
    │ Lead sai do mural    │   │ Cliente pode remarcar   │
    └──────────────────────┘   └─────────────────────────┘
               │
               │ Notifica todos
               ▼
┌─────────────────────────────────────────────────────────────────┐
│           ✅ VISITA CONFIRMADA - EMAILS PARA TODOS              │
└─────────────────────────────────────────────────────────────────┘
               │
               ├───────────┬───────────┬───────────┐
               ▼           ▼           ▼           ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  CLIENTE    │ │  CORRETOR   │ │ PROPRIETÁRIO│
    │  João       │ │  Pedro      │ │  José       │
    │             │ │             │ │             │
    │ ✅ Visita   │ │ ✅ Visita   │ │ ✅ Visita   │
    │ confirmada! │ │ confirmada! │ │ agendada!   │
    │             │ │             │ │             │
    │ Contatos:   │ │ Contatos:   │ │ Contatos:   │
    │ • Pedro     │ │ • Cliente   │ │ • Pedro     │
    │ • Endereço  │ │ • Endereço  │ │ • Cliente   │
    └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 🔄 CASOS ESPECIAIS

### **Caso 1: Corretor Prioritário Não Aceita**

```
Pedro (#1) não aceita em 10 min
         │
         ▼
Sistema passa para Ana (#5)
         │
         ▼
Ana tem 10 minutos agora
         │
         ├─────────┬─────────┐
         │         │         │
     ACEITA    REJEITA   EXPIRA
         │         │         │
         ▼         └────┬────┘
    Fluxo normal      │
                      ▼
            Passa para João (#8)
```

### **Caso 2: Proprietário Recusa Horário**

```
Proprietário: "Não posso às 14h"
         │
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
Pedro volta TOP 5 da fila    Lead volta ao mural
(sem penalidade!)             │
                              ▼
                        Cliente notificado:
                        "Escolha novo horário"
                              │
                              ▼
                        Cliente pode remarcar
                        (novo lead criado)
```

### **Caso 3: Múltiplos Leads no Mesmo Imóvel**

```
Casa Petrolina - R$ 450k

LEAD #1                    LEAD #2                    LEAD #3
📅 Hoje, 14:00            📅 Hoje, 15:00            📅 Amanhã, 10:00
👤 João Silva             👤 Maria Santos           👤 Carlos Lima
🎯 Pedro (#1)             🎯 Ana (#5)               🎯 João (#8)
✅ CONFIRMADO             ⏳ Aguardando             👥 2 candidatos

Resultado: 3 corretores diferentes trabalhando no mesmo imóvel!
```

---

## 📊 ESTADOS DO LEAD (Máquina de Estados)

```
┌──────────────────────────────────────────────────────────────┐
│                    LEAD LIFECYCLE                            │
└──────────────────────────────────────────────────────────────┘

    [CRIADO]
       │
       ▼
   PENDING ──────────────────┐
       │                     │
       │ Corretores          │ Nenhum
       │ se candidatam       │ candidato
       ▼                     │
   MATCHING                  │
       │                     │
       │ Sistema escolhe     │
       ▼                     │
WAITING_REALTOR_ACCEPT       │
       │                     │
       ├──────────┬──────────┤
       │          │          │
   ACEITA     REJEITA    EXPIRA
       │          │          │
       ▼          └──────┬───┘
WAITING_OWNER_APPROVAL   │
       │                 │
       ├────────┬────────┤
       │        │        │
   APROVA   RECUSA   EXPIRA
       │        │        │
       ▼        └────────┴───▶ AVAILABLE
   CONFIRMED                   (volta ao mural)
       │
       │ Visita realizada
       ▼
   COMPLETED
```

---

## 🎯 DIFERENÇAS vs SISTEMA ANTERIOR

### **Sistema Anterior:**

```
LEAD = Interesse no imóvel

Cliente → Formulário → Lead → 1 Corretor → Contato direto
                                (fila automática)

Problemas:
❌ Cliente não sabe quando vai ser atendido
❌ Corretor pode estar ocupado
❌ Proprietário não tem controle
❌ Vago: "vou entrar em contato"
```

### **Sistema Novo:**

```
LEAD = Horário específico de visita

Cliente → Escolhe horário → Lead no mural → Múltiplos candidatos
          → Sistema escolhe melhor → Proprietário aprova
          → VISITA CONFIRMADA!

Vantagens:
✅ Cliente sai com horário marcado
✅ Múltiplos corretores competem (melhor serviço)
✅ Proprietário controla agenda
✅ Compromisso claro: "Nos vemos dia X às Y horas"
✅ Maior conversão (compromisso real)
```

---

## 🔢 ESTATÍSTICAS ESPERADAS

### **Funil de Conversão:**

```
1000 VISITAS AO SITE
    │
    ├─► 200 Clicam "Ver Imóvel" (20%)
    │
    ├─► 100 Clicam "Agendar Visita" (10%)
    │
    ├─► 80 Completam agendamento (8%)
    │
    ├─► 70 Corretor aceita (7%)
    │
    ├─► 60 Proprietário aprova (6%)
    │
    ├─► 50 Visita acontece (5%)
    │
    └─► 15 Venda fechada (1.5%)

CONVERSÃO FINAL: 1.5% (vs 0.5% antes = +200%!)
```

---

## 💡 CENÁRIOS REAIS

### **Cenário 1: Tudo Certo ✅**
```
10:00 - Cliente agenda visita (14h)
10:01 - Lead aparece no mural
10:05 - Pedro, Ana e João se candidatam
10:06 - Sistema escolhe Pedro (#1)
10:08 - Pedro aceita
10:09 - Proprietário aprova
10:10 - Visita confirmada!
14:00 - Visita acontece
15:00 - Venda fechada! 🎉
```

### **Cenário 2: Corretor Ocupado 🔄**
```
10:00 - Lead criado
10:05 - Sistema escolhe Pedro (#1)
10:15 - Pedro não responde (10 min)
10:15 - Sistema passa para Ana (#5)
10:18 - Ana aceita
10:20 - Proprietário aprova
10:21 - Visita confirmada!
```

### **Cenário 3: Proprietário Não Pode ❌➡️✅**
```
10:00 - Lead criado (14h)
10:10 - Pedro aceita
10:15 - Proprietário: "Não posso às 14h"
10:16 - Pedro volta TOP 5 (sem punição)
10:17 - Cliente notificado
10:30 - Cliente remarca para 16h
10:31 - João se candidata
10:35 - João aceita
10:40 - Proprietário aprova
10:41 - Visita confirmada! ✅
```

---

## 🎨 MOCKUPS DAS TELAS PRINCIPAIS

### **1. Cliente: Agendar Visita**
```
┌──────────────────────────────────────┐
│  🏠 Casa 3 Quartos - Petrolina      │
│  R$ 450.000                          │
├──────────────────────────────────────┤
│                                      │
│  📅 Escolha o dia da visita:         │
│  ┌─────┬─────┬─────┬─────┬─────┐   │
│  │ 18  │ 19  │ 20  │ 21  │ 22  │   │
│  │ Hoje│ Qui │ Sex │ Sáb │ Dom │   │
│  └─────┴─────┴─────┴─────┴─────┘   │
│                                      │
│  ⏰ Escolha o horário:                │
│  ┌──────┬──────┬──────┬──────┐     │
│  │ 08:00│ 09:00│ 10:00│ 11:00│     │
│  ├──────┼──────┼──────┼──────┤     │
│  │ 14:00│ 15:00│ 16:00│ 17:00│     │
│  └──────┴──────┴──────┴──────┘     │
│                                      │
│  👤 Seus dados:                      │
│  Nome: [João Silva              ]   │
│  Tel:  [(87) 99999-9999        ]   │
│  Email:[joao@email.com         ]   │
│                                      │
│  [✅ AGENDAR VISITA]                 │
└──────────────────────────────────────┘
```

### **2. Corretor: Mural de Leads**
```
┌──────────────────────────────────────┐
│  🏠 MURAL DE OPORTUNIDADES           │
│  Filtros: [Cidade▼] [Tipo▼] [Data▼]│
├──────────────────────────────────────┤
│                                      │
│ 🏠 Casa 3Q - Petrolina - R$ 450k    │
│ 📅 Hoje, 14:00                       │
│ 👤 João Silva                        │
│ 👥 3 candidatos                      │
│ [VER DETALHES] [ME CANDIDATAR]       │
│                                      │
│ 🏠 Casa 3Q - Petrolina - R$ 450k    │
│ 📅 Hoje, 15:00                       │
│ 👤 Maria Santos                      │
│ 👥 1 candidato                       │
│ [VER DETALHES] [ME CANDIDATAR]       │
│                                      │
│ 🏢 Apt 2Q - Juazeiro - R$ 280k      │
│ 📅 Amanhã, 10:00                     │
│ 👤 Carlos Lima                       │
│ 👥 0 candidatos                      │
│ [VER DETALHES] [ME CANDIDATAR]       │
└──────────────────────────────────────┘
```

### **3. Proprietário: Aprovar Visita**
```
┌──────────────────────────────────────┐
│  📧 SOLICITAÇÃO DE VISITA            │
├──────────────────────────────────────┤
│                                      │
│  🏠 Casa 3 Quartos - Petrolina       │
│  📅 Hoje, 18/10 às 14:00             │
│                                      │
│  👤 CORRETOR:                        │
│     Pedro Santos                     │
│     📊 18 visitas realizadas         │
│     📞 (87) 98888-8888              │
│                                      │
│  👤 CLIENTE:                         │
│     João Silva                       │
│     Observações: "Tenho interesse    │
│     em financiar"                    │
│                                      │
│  ❓ Você aceita esse horário?       │
│                                      │
│  [✅ ACEITAR HORÁRIO]                │
│  [❌ RECUSAR HORÁRIO]                │
└──────────────────────────────────────┘
```

---

**Este diagrama visual completa a documentação técnica e facilita o entendimento do fluxo completo do sistema!** 🎯
