# 🎯 Sistema de Fila + Mural de Leads - Implementação

## ✅ Fase 1: Schema Prisma (CONCLUÍDO)

### Novos Enums Criados:
```prisma
enum LeadStatus {
  PENDING
  ACCEPTED
  REJECTED
  EXPIRED
  RESERVED  // ← Novo: Reservado para corretor prioritário
  AVAILABLE // ← Novo: Disponível no mural
}

enum RealtorQueueStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum CandidatureStatus {
  PENDING
  ACCEPTED
  REJECTED
  EXPIRED
}
```

### Novos Modelos Criados:

#### 1. **RealtorQueue** - Fila de Corretores
- Gerencia posição, score e estatísticas de cada corretor
- Campos principais:
  - `position`: Posição na fila (1 = primeiro)
  - `score`: Pontuação dinâmica
  - `activeLeads`: Leads ativos no momento
  - `bonusLeads`: Leads bônus simultâneos
  - `avgResponseTime`: Tempo médio de resposta

#### 2. **LeadCandidature** - Candidaturas
- Registra quando um corretor se candidata a um lead
- Relaciona Lead + RealtorQueue
- Controla status da candidatura

#### 3. **ScoreHistory** - Histórico de Pontuação
- Registra todas as ações que afetam o score
- Permite auditoria e análise de comportamento
- Campos: action, points, description

#### 4. **RealtorStats** - Estatísticas Detalhadas
- Métricas completas do corretor:
  - Leads aceitos/rejeitados/expirados/completos
  - Visitas agendadas/completadas
  - Avaliação média (rating)
  - Tempo médio de resposta

#### 5. **RealtorRating** - Avaliações
- Permite proprietários avaliarem corretores (1-5 estrelas)
- Vinculado a um lead específico
- Inclui comentário opcional

### Campos Adicionados ao Lead:
- `reservedUntil`: Prazo de reserva para corretor prioritário
- `expiresAt`: Prazo de expiração do lead
- Relações: `candidatures`, `rating`

---

## 📋 Próximos Passos

### Fase 2: APIs Backend (PENDENTE)

#### API de Fila (`/api/queue`)
- [ ] `GET /api/queue/position` - Retorna posição do corretor na fila
- [ ] `GET /api/queue/stats` - Estatísticas da fila
- [ ] `POST /api/queue/join` - Corretor entra na fila
- [ ] `PATCH /api/queue/update-score` - Atualiza pontuação

#### API de Leads (`/api/leads`)
- [ ] `GET /api/leads/mural` - Lista leads disponíveis no mural
- [ ] `POST /api/leads/[id]/reserve` - Reserva lead para corretor prioritário
- [ ] `POST /api/leads/[id]/accept` - Aceita lead
- [ ] `POST /api/leads/[id]/reject` - Rejeita lead
- [ ] `POST /api/leads/[id]/candidate` - Candidata-se a lead
- [ ] `GET /api/leads/my-leads` - Leads ativos do corretor

#### API de Score (`/api/score`)
- [ ] `POST /api/score/add` - Adiciona pontos
- [ ] `POST /api/score/subtract` - Remove pontos
- [ ] `GET /api/score/history` - Histórico de pontuação

#### API de Avaliações (`/api/ratings`)
- [ ] `POST /api/ratings` - Cria avaliação
- [ ] `GET /api/ratings/[realtorId]` - Lista avaliações do corretor

---

### Fase 3: Lógica de Negócio (PENDENTE)

#### Service: QueueService
```typescript
class QueueService {
  // Adiciona corretor à fila
  async joinQueue(realtorId: string): Promise<RealtorQueue>
  
  // Retorna próximo corretor da fila
  async getNextRealtor(): Promise<RealtorQueue | null>
  
  // Move corretor para o fim da fila
  async moveToEnd(realtorId: string): Promise<void>
  
  // Recalcula posições baseado no score
  async recalculatePositions(): Promise<void>
  
  // Atualiza score do corretor
  async updateScore(realtorId: string, points: number, action: string): Promise<void>
}
```

#### Service: LeadDistributionService
```typescript
class LeadDistributionService {
  // Distribui novo lead
  async distributeNewLead(leadId: string): Promise<void>
  
  // Reserva lead para corretor prioritário
  async reserveLead(leadId: string, realtorId: string): Promise<void>
  
  // Libera lead para o mural (timeout)
  async releaseToMural(leadId: string): Promise<void>
  
  // Processa candidatura
  async processCandidature(leadId: string, realtorId: string): Promise<void>
  
  // Seleciona melhor candidato
  async selectBestCandidate(leadId: string): Promise<string | null>
}
```

---

### Fase 4: Workers Assíncronos (PENDENTE)

#### Worker 1: Timeout de Reservas
```typescript
// Executa a cada 1 minuto
async function checkExpiredReservations() {
  // Busca leads com reservedUntil < now()
  // Move para status AVAILABLE
  // Notifica corretores candidatos
}
```

#### Worker 2: Expiração de Leads
```typescript
// Executa a cada 5 minutos
async function checkExpiredLeads() {
  // Busca leads com expiresAt < now()
  // Move para status EXPIRED
  // Atualiza score do corretor (-10 pontos)
}
```

#### Worker 3: Recálculo de Fila
```typescript
// Executa a cada 10 minutos
async function recalculateQueue() {
  // Ordena corretores por score
  // Atualiza posições
  // Notifica mudanças significativas
}
```

---

### Fase 5: Frontend - Páginas (PENDENTE)

#### Página: Mural de Leads (`/broker/leads/mural`)
**Componentes**:
- [ ] `LeadCard` - Card com resumo do lead
- [ ] `LeadFilters` - Filtros (região, tipo, preço, status)
- [ ] `LeadTimer` - Contador regressivo de reserva
- [ ] `CandidateButton` - Botão "Candidatar-se"

**Features**:
- Lista de leads disponíveis
- Indicadores visuais de status (🟢 novo, 🟠 reservado, 🔴 em atendimento)
- Filtros dinâmicos
- Atualização em tempo real (opcional: WebSocket/Polling)

#### Página: Minha Fila (`/broker/queue`)
**Componentes**:
- [ ] `QueuePosition` - Card com posição atual
- [ ] `ScoreDisplay` - Pontuação e histórico
- [ ] `QueueStats` - Estatísticas (tempo médio, leads ativos)
- [ ] `ScoreHistoryTable` - Tabela de histórico

**Features**:
- Posição atual na fila
- Tempo estimado de espera
- Score atual e histórico
- Leads ativos e concluídos

#### Página: Meus Leads (`/broker/leads`)
**Componentes**:
- [ ] `ActiveLeadCard` - Lead em atendimento
- [ ] `LeadActions` - Botões de ação (marcar visita, contatar, concluir)
- [ ] `LeadTimeline` - Linha do tempo de interações

**Features**:
- Lista de leads ativos
- Acesso rápido aos dados do cliente
- Registro de interações
- Marcar visita/concluir atendimento

---

### Fase 6: Componentes de UI (PENDENTE)

#### Componentes Reutilizáveis:
- [ ] `<CountdownTimer />` - Timer regressivo
- [ ] `<ScoreBadge />` - Badge de pontuação
- [ ] `<StatusIndicator />` - Indicador de status visual
- [ ] `<LeadCard />` - Card de lead
- [ ] `<QueuePositionCard />` - Card de posição na fila
- [ ] `<RatingStars />` - Estrelas de avaliação
- [ ] `<LeadFilters />` - Filtros do mural

---

### Fase 7: Regras de Negócio (IMPLEMENTAR)

#### Pontuação (Score):
| Ação | Pontos |
|------|--------|
| Aceitar lead rapidamente (< 5 min) | +5 |
| Concluir visita agendada | +10 |
| Receber avaliação 5 estrelas | +15 |
| Receber avaliação 4 estrelas | +10 |
| Receber avaliação 3 estrelas | +5 |
| Recusar lead | -5 |
| Deixar lead expirar | -10 |
| Lead sem resposta (timeout) | -8 |

#### Limites:
- **Leads simultâneos**: 1 lead prioritário + até 3 leads bônus
- **Tempo de reserva**: 10 minutos (configurável)
- **Tempo de expiração**: 24 horas após aceite (configurável)
- **Limite de recusas**: 3 recusas em 24h = suspensão temporária

---

## 🗄️ Migração do Banco

### Comandos:
```bash
# 1. Criar migração
npx prisma migrate dev --name add_queue_system

# 2. Gerar cliente Prisma
npx prisma generate

# 3. Executar seed (atualizado)
npm run seed
```

---

## 📊 Métricas e KPIs (Implementar Dashboard)

### KPIs Principais:
1. **Tempo médio de atendimento** - Meta: < 15 min
2. **Taxa de leads recusados** - Meta: < 20%
3. **Engajamento de corretores** - Meta: > 70% ativos/semana
4. **Satisfação do cliente** - Meta: > 4.0 estrelas
5. **Tempo médio na fila** - Meta: reduzir 15% ao mês

### Dashboard Admin:
- [ ] Gráfico de tempo de atendimento
- [ ] Taxa de conversão de leads
- [ ] Ranking de corretores por score
- [ ] Distribuição de leads por região
- [ ] Tempo médio na fila

---

## 🚀 Ordem de Implementação Recomendada

### Sprint 1 (1 semana):
1. ✅ Schema Prisma (FEITO)
2. Migração do banco
3. APIs básicas (queue, leads)
4. Service de fila (QueueService)

### Sprint 2 (1 semana):
5. Service de distribuição (LeadDistributionService)
6. Página Mural de Leads
7. Página Minha Fila
8. Componentes de UI

### Sprint 3 (1 semana):
9. Workers assíncronos
10. Sistema de pontuação completo
11. Sistema de avaliações
12. Testes e ajustes

### Sprint 4 (3 dias):
13. Dashboard de métricas
14. Notificações em tempo real (opcional)
15. Documentação final
16. Deploy

---

## 🔧 Tecnologias Sugeridas

### Backend:
- **Next.js API Routes** - Para APIs REST
- **Prisma** - ORM (já em uso)
- **Node-cron** ou **BullMQ** - Para workers assíncronos
- **Zod** - Validação de dados

### Frontend:
- **Next.js 15** (já em uso)
- **TailwindCSS** (já em uso)
- **Lucide Icons** (já em uso)
- **React Query** - Para cache e sincronização
- **Recharts** - Para gráficos de métricas

### Realtime (Opcional):
- **Supabase Realtime** - Para atualizações em tempo real
- **Pusher** - Alternativa para WebSockets
- **Polling** - Solução mais simples (atualizar a cada 30s)

---

## 📝 Próxima Ação

**Escolha uma das opções:**

### Opção A: Implementação Completa
- Implementar todas as fases (4-6 semanas)
- Sistema 100% funcional conforme PRD

### Opção B: MVP Funcional
- Implementar apenas funcionalidades core (2-3 semanas):
  - Fila básica (sem score dinâmico)
  - Mural de leads simples
  - Aceitar/rejeitar leads
  - Sem workers assíncronos (manual)

### Opção C: Prototipo Rápido
- Implementar UI mockada (1 semana):
  - Páginas com dados estáticos
  - Demonstração visual do fluxo
  - Sem backend funcional

---

**Me avise qual opção prefere e começamos a implementação!** 🚀
