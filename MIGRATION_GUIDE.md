# 🚀 GUIA DE MIGRAÇÃO - SISTEMA DE LEADS COM VISITAS

## ⚠️ IMPORTANTE: Execute os comandos na ordem!

### **Passo 1: Backup do Banco de Dados**

Antes de qualquer coisa, faça backup do banco de dados de produção/desenvolvimento.

```bash
# Se estiver usando PostgreSQL local
pg_dump -U postgres -d seu_banco > backup_antes_migracao.sql
```

---

### **Passo 2: Migração do Prisma**

O schema do Prisma já foi atualizado. Agora você precisa criar e aplicar a migração.

```bash
# 1. Gerar a migração
npx prisma migrate dev --name add_visit_scheduling_fields

# 2. Gerar o Prisma Client atualizado
npx prisma generate
```

**O que essa migração faz:**
- ✅ Adiciona novos status ao enum `LeadStatus`
- ✅ Adiciona campos `visitDate`, `visitTime`, `clientNotes` ao modelo `Lead`
- ✅ Adiciona campos de aprovação do proprietário (`ownerApproved`, `ownerApprovedAt`, etc)
- ✅ Adiciona novos timestamps (`updatedAt`, `confirmedAt`, `completedAt`, `cancelledAt`)
- ✅ Adiciona `candidatesCount` ao modelo `Lead`
- ✅ Adiciona `queuePosition` ao modelo `LeadCandidature`
- ✅ Cria novos indexes para performance

---

### **Passo 3: Verificar Erros de TypeScript**

Após gerar o Prisma Client, os erros de TypeScript devem desaparecer:

```bash
# Verificar erros
npm run type-check

# ou
npx tsc --noEmit
```

---

### **Passo 4: Testar Backend**

Teste as novas APIs:

```bash
# Iniciar servidor
npm run dev
```

**Teste manualmente:**

1. **Slots disponíveis:**
```bash
curl "http://localhost:3000/api/leads/available-slots?propertyId=PROP_ID&date=2024-10-19"
```

2. **Criar lead com visita:**
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "PROP_ID",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "(87) 99999-9999",
    "message": "Tenho interesse",
    "visitDate": "2024-10-19T00:00:00.000Z",
    "visitTime": "14:00"
  }'
```

3. **Candidatar-se a lead:**
```bash
curl -X POST http://localhost:3000/api/leads/LEAD_ID/candidate \
  -H "Content-Type: application/json" \
  -d '{"realtorId": "REALTOR_ID"}'
```

---

### **Passo 5: Atualizar Pusher Events (Opcional)**

Se você usa Pusher para notificações em tempo real, adicione os novos eventos:

```typescript
// src/lib/pusher-server.ts
export const PUSHER_EVENTS = {
  // ... eventos existentes ...
  VISIT_CONFIRMED: "visit-confirmed",
  VISIT_REJECTED_BY_OWNER: "visit-rejected-by-owner",
} as const;
```

---

## 📋 CHECKLIST PÓS-MIGRAÇÃO

### **Backend:**
- [ ] Prisma Client regenerado sem erros
- [ ] TypeScript sem erros
- [ ] APIs testadas manualmente
- [ ] Services funcionando (`VisitSchedulingService`, `OwnerApprovalService`)

### **Frontend:**
- [ ] Componente `TimeSlotPicker` renderizando
- [ ] Componente `ScheduleVisitForm` funcionando
- [ ] Página `/property/[id]/schedule-visit` acessível
- [ ] Página `/owner/leads/pending` acessível (para proprietários)

### **Banco de Dados:**
- [ ] Migração aplicada com sucesso
- [ ] Novos campos criados
- [ ] Indexes criados
- [ ] Dados existentes preservados

---

## 🐛 TROUBLESHOOTING

### **Erro: "Type X is not assignable to type Y"**

**Solução:** Regenere o Prisma Client:
```bash
npx prisma generate
```

### **Erro: "Column does not exist"**

**Solução:** A migração não foi aplicada. Execute:
```bash
npx prisma migrate deploy
```

### **Erro: "visitDate is not defined"**

**Solução:** Limpe o cache do Next.js:
```bash
rm -rf .next
npm run dev
```

### **Leads existentes sem visitDate/visitTime**

Esses campos são opcionais (`DateTime?` e `String?`), então leads antigos continuarão funcionando normalmente. Eles representam o fluxo antigo (sem agendamento de horário).

---

## 🔄 ROLLBACK (Se necessário)

Se algo der errado e você precisar voltar:

```bash
# 1. Restaurar backup do banco
psql -U postgres -d seu_banco < backup_antes_migracao.sql

# 2. Reverter schema do Prisma (git)
git checkout HEAD -- prisma/schema.prisma

# 3. Regenerar client antigo
npx prisma generate
```

---

## ✅ PRÓXIMOS PASSOS

Após a migração bem-sucedida:

1. **Testar em staging** antes de production
2. **Criar seed data** para testes
3. **Documentar para o time**
4. **Monitorar logs** nos primeiros dias
5. **Criar testes automatizados**

---

**Migração criada em:** 2024-10-18
**Versão:** v2.0 - Sistema de Visitas Agendadas
