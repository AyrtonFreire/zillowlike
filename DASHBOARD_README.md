# 📊 Painéis de Dashboard - Corretor & Pessoa Física

## 🎯 Visão Geral

Este documento descreve a implementação dos painéis de dashboard para Corretores e Pessoas Físicas (PF) na plataforma imobiliária.

## 📁 Estrutura de Arquivos Criados

### Componentes Base (`src/components/dashboard/`)
- **MetricCard.tsx** - Card de métrica com ícone, valor e tendência
- **StatCard.tsx** - Container genérico para estatísticas
- **PropertyListItem.tsx** - Item de lista de imóveis com ações
- **LeadListItem.tsx** - Item de lista de leads com status

### Páginas
- **`/broker/dashboard`** - Painel do Corretor (`src/app/broker/dashboard/page.tsx`)
- **`/owner/dashboard`** - Painel da Pessoa Física (`src/app/owner/dashboard/page.tsx`)

### APIs
- **`/api/metrics/realtor`** - Métricas do corretor
- **`/api/metrics/owner`** - Métricas do anunciante PF

## 🗄️ Mudanças no Schema Prisma

### Novos Enums
```prisma
enum Role {
  USER
  OWNER
  REALTOR  // ← Novo
  ADMIN
}

enum PropertyStatus {
  ACTIVE
  PAUSED
  DRAFT
  SOLD
  RENTED
}

enum LeadStatus {
  PENDING
  ACCEPTED
  REJECTED
  EXPIRED
}
```

### Novos Modelos

#### PropertyView
Rastreia visualizações de imóveis para analytics:
```prisma
model PropertyView {
  id         String   @id @default(cuid())
  property   Property @relation(fields: [propertyId], references: [id])
  propertyId String
  viewedAt   DateTime @default(now())
  userId     String?
  ipAddress  String?
}
```

#### Contact
Armazena informações de contato dos leads:
```prisma
model Contact {
  id        String   @id @default(cuid())
  name      String
  email     String
  phone     String?
  leads     Lead[]
  createdAt DateTime @default(now())
}
```

### Modelos Atualizados

#### Property
- Adicionado: `status PropertyStatus @default(ACTIVE)`
- Adicionado: `views PropertyView[]`

#### Lead
- Adicionado: `realtor User? @relation("RealtorLeads")`
- Adicionado: `realtorId String?`
- Adicionado: `contact Contact?`
- Adicionado: `contactId String?`
- Adicionado: `status LeadStatus @default(PENDING)`
- Adicionado: `respondedAt DateTime?`

#### User
- Adicionado: `realtorLeads Lead[] @relation("RealtorLeads")`

## 🚀 Setup e Migração

### 1. Aplicar Migração do Banco de Dados

```bash
# Criar migração
npx prisma migrate dev --name add_dashboard_metrics

# Ou aplicar em produção
npx prisma migrate deploy
```

### 2. Gerar Cliente Prisma Atualizado

```bash
npx prisma generate
```

### 3. (Opcional) Popular Dados de Teste

```bash
npx prisma db seed
```

## 📊 Métricas Disponíveis

### Painel do Corretor

| Métrica | Descrição | Endpoint |
|---------|-----------|----------|
| Imóveis Ativos | Total de imóveis publicados | `/api/metrics/realtor` |
| Leads Recebidos | Leads dos últimos 7 dias | `/api/metrics/realtor` |
| Taxa de Aceitação | % de leads aceitos | `/api/metrics/realtor` |
| Tempo de Resposta | Média em minutos | `/api/metrics/realtor` |

### Painel da Pessoa Física

| Métrica | Descrição | Endpoint |
|---------|-----------|----------|
| Imóveis Ativos | Imóveis publicados | `/api/metrics/owner` |
| Visualizações | Total de acessos | `/api/metrics/owner` |
| Contatos Gerados | Leads recebidos | `/api/metrics/owner` |
| Taxa de Conversão | Views → Contatos | `/api/metrics/owner` |

## 🎨 Componentes e Uso

### MetricCard

```tsx
import MetricCard from "@/components/dashboard/MetricCard";
import { Home } from "lucide-react";

<MetricCard
  title="Imóveis Ativos"
  value={25}
  icon={Home}
  trend={{ value: 12, isPositive: true }}
  subtitle="Total de anúncios"
  iconColor="text-blue-600"
  iconBgColor="bg-blue-50"
/>
```

### StatCard

```tsx
import StatCard from "@/components/dashboard/StatCard";

<StatCard
  title="Meus Imóveis"
  action={<Link href="/properties">Ver todos</Link>}
>
  {/* Conteúdo customizado */}
</StatCard>
```

### PropertyListItem

```tsx
import PropertyListItem from "@/components/dashboard/PropertyListItem";

<PropertyListItem
  id="prop-123"
  title="Casa em Petrolina"
  price={53000000}
  image="/images/house.jpg"
  status="ACTIVE"
  views={150}
  leads={8}
  onEdit={(id) => console.log("Edit", id)}
  onDelete={(id) => console.log("Delete", id)}
  onToggleStatus={(id) => console.log("Toggle", id)}
/>
```

### LeadListItem

```tsx
import LeadListItem from "@/components/dashboard/LeadListItem";

<LeadListItem
  id="lead-456"
  propertyTitle="Apartamento Centro"
  contactName="João Silva"
  contactPhone="(87) 99999-9999"
  status="PENDING"
  createdAt={new Date()}
  onAccept={(id) => console.log("Accept", id)}
  onReject={(id) => console.log("Reject", id)}
/>
```

## 🔐 Autenticação e Autorização

### Obter userId da Sessão

```tsx
// TODO: Implementar com NextAuth
import { getServerSession } from "next-auth";

const session = await getServerSession();
const userId = session?.user?.id;
```

### Verificar Role do Usuário

```tsx
// Verificar se é corretor
if (session?.user?.role === "REALTOR") {
  // Acesso ao painel do corretor
}

// Verificar se é pessoa física
if (session?.user?.role === "OWNER") {
  // Acesso ao painel do anunciante
}
```

## 📈 Próximos Passos

### Fase 2 - Realtime
- [ ] Integrar Supabase Realtime ou Pusher
- [ ] Notificações em tempo real de novos leads
- [ ] Atualização automática de métricas

### Fase 3 - Gráficos Avançados
- [ ] Instalar Recharts: `npm install recharts`
- [ ] Gráfico de linha para visualizações ao longo do tempo
- [ ] Gráfico de donut para distribuição de leads por status
- [ ] Gráfico de barras para comparação de imóveis

### Fase 4 - Funcionalidades Extras
- [ ] Exportar relatórios em PDF
- [ ] Filtros de data personalizados
- [ ] Comparação com períodos anteriores
- [ ] Metas e objetivos personalizados

## 🐛 Troubleshooting

### Erro: "Property 'status' does not exist"
**Solução**: Execute `npx prisma generate` para atualizar o cliente Prisma.

### Erro: "Cannot find module '@/components/dashboard/MetricCard'"
**Solução**: Verifique se o caminho está correto e se o arquivo foi criado.

### Métricas retornam 0
**Solução**: Certifique-se de que há dados no banco (execute o seed ou crie dados manualmente).

### userId undefined
**Solução**: Implemente autenticação com NextAuth e passe o userId correto para as APIs.

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique a documentação do Prisma: https://www.prisma.io/docs
2. Consulte o PRD original
3. Entre em contato com a equipe de desenvolvimento

---

**Versão**: 1.0.0  
**Última atualização**: 2025-01-16  
**Autor**: Equipe de Desenvolvimento
