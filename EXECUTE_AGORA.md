# ⚡ EXECUTE AGORA - COMANDOS PARA ATIVAR O SISTEMA

## 🚨 ATENÇÃO: Execute na ordem!

---

## 📋 CHECKLIST PRÉ-MIGRAÇÃO

- [ ] Backup do banco de dados atual
- [ ] Git commit de todo o código
- [ ] Ambiente de desenvolvimento funcionando
- [ ] Node.js e npm instalados

---

## 🔥 COMANDOS (COPIAR E COLAR)

### **1. MIGRAÇÃO DO BANCO DE DADOS**

```powershell
# Navegue até a pasta do projeto
cd "C:\Users\Ayrton Freire\zillowlike"

# Crie a migração
npx prisma migrate dev --name add_visit_scheduling_fields

# Gere o Prisma Client atualizado
npx prisma generate
```

**O que acontece:**
- ✅ Novos campos adicionados ao banco
- ✅ Novos status criados
- ✅ Indexes de performance criados
- ✅ TypeScript types atualizados

---

### **2. LIMPAR CACHE DO NEXT.JS**

```powershell
# Remova a pasta .next
Remove-Item -Recurse -Force .next

# Remova node_modules/.cache (se existir)
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
```

---

### **3. REINSTALAR DEPENDÊNCIAS (Opcional mas recomendado)**

```powershell
# Limpar cache do npm
npm cache clean --force

# Reinstalar
npm install
```

---

### **4. INICIAR SERVIDOR**

```powershell
# Modo desenvolvimento
npm run dev
```

**Aguarde até ver:**
```
✓ Ready in 3.5s
○ Local: http://localhost:3000
```

---

## 🧪 TESTAR O SISTEMA

### **Teste 1: Agendamento de Visita (Cliente)**

1. Abra o navegador: `http://localhost:3000`
2. Navegue até um imóvel qualquer
3. Acesse: `http://localhost:3000/property/[ID_DO_IMOVEL]/schedule-visit`
4. Escolha uma data e horário
5. Preencha seus dados
6. Clique em "Agendar Visita"

**Resultado esperado:** ✅ "Visita agendada com sucesso!"

---

### **Teste 2: Ver Lead no Mural (Corretor)**

1. Faça login como REALTOR
2. Acesse: `http://localhost:3000/broker/leads/mural`
3. Você deve ver o lead com data e horário em destaque

**Resultado esperado:** ✅ Lead aparece com horário visível

---

### **Teste 3: Candidatar-se (Corretor)**

1. No mural, clique em "ME CANDIDATAR"
2. Veja a mensagem de confirmação

**Resultado esperado:** ✅ "Candidatura enviada! Total de candidatos: X"

---

### **Teste 4: Aprovar Visita (Proprietário)**

1. Faça login como OWNER (proprietário do imóvel)
2. Acesse: `http://localhost:3000/owner/leads/pending`
3. Clique em "Aceitar Horário"

**Resultado esperado:** ✅ "Visita confirmada com sucesso!"

---

### **Teste 5: Ver Visitas Confirmadas (Proprietário)**

1. Acesse: `http://localhost:3000/owner/leads/confirmed`
2. Você deve ver a visita agendada

**Resultado esperado:** ✅ Visita aparece com data, horário e contatos

---

## 🔍 VERIFICAR SE ESTÁ FUNCIONANDO

### **Check 1: Banco de Dados**

```powershell
# Abrir Prisma Studio
npx prisma studio
```

1. Vá em "Lead"
2. Verifique se existem colunas: `visitDate`, `visitTime`, `ownerApproved`

**Se sim:** ✅ Migração funcionou!

---

### **Check 2: TypeScript**

```powershell
# Verificar erros de tipo
npx tsc --noEmit
```

**Resultado esperado:** Sem erros (ou poucos erros não relacionados)

---

### **Check 3: Logs do Servidor**

No terminal onde rodou `npm run dev`, procure por:

```
✅ Lead aparece no mural
✅ Creating visit request
✅ Candidatura enviada
✅ Visit approved by owner
```

**Se vê esses logs:** ✅ Tudo funcionando!

---

## ⚠️ SE ALGO DER ERRADO

### **Erro: "Column visitDate does not exist"**

**Solução:**
```powershell
# A migração não foi aplicada
npx prisma migrate deploy
npx prisma generate
```

---

### **Erro: "Type X is not assignable"**

**Solução:**
```powershell
# Prisma Client desatualizado
npx prisma generate

# Reiniciar VSCode
# Ctrl + Shift + P → "Reload Window"
```

---

### **Erro: "Cannot find module"**

**Solução:**
```powershell
# Cache corrompido
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache
npm install
npm run dev
```

---

### **Lead não aparece no mural**

**Verificar:**
```sql
-- No Prisma Studio ou banco direto
SELECT id, status, visitDate, visitTime FROM leads;
```

Status deve ser `PENDING` ou `MATCHING`

---

## 📊 VERIFICAR DADOS DE TESTE

### **Criar Lead de Teste Manualmente**

```sql
-- No Prisma Studio ou SQL direto
INSERT INTO leads (
  id,
  propertyId,
  contactId,
  visitDate,
  visitTime,
  status,
  candidatesCount,
  createdAt,
  updatedAt
) VALUES (
  'test-lead-001',
  'SEU_PROPERTY_ID',
  'SEU_CONTACT_ID',
  '2024-10-19 00:00:00',
  '14:00',
  'PENDING',
  0,
  NOW(),
  NOW()
);
```

---

## 🎯 CONFIGURAÇÃO ADICIONAL (Opcional)

### **Configurar Cron Job (Produção)**

```env
# .env.local
CRON_SECRET=seu-secret-super-secreto-aqui
```

```powershell
# Testar cron manualmente
curl http://localhost:3000/api/cron/expire-leads `
  -H "Authorization: Bearer seu-secret-super-secreto-aqui"
```

---

## ✅ CHECKLIST PÓS-MIGRAÇÃO

- [ ] Migração executada sem erros
- [ ] Prisma Client gerado
- [ ] Servidor iniciando sem erros
- [ ] Página de agendamento abre
- [ ] Consegue criar lead com horário
- [ ] Lead aparece no mural
- [ ] Consegue se candidatar
- [ ] Proprietário consegue aprovar
- [ ] Prisma Studio mostra novos campos

---

## 🚀 DEPLOY EM PRODUÇÃO

### **Quando estiver pronto:**

```powershell
# 1. Commit tudo
git add .
git commit -m "feat: Sistema de visitas agendadas v2"

# 2. Push para Vercel
git push origin main

# 3. Vercel vai buildar automaticamente
```

### **Na Vercel Dashboard:**

1. Ir em Settings → Environment Variables
2. Adicionar: `CRON_SECRET=seu-secret`
3. Ir em Functions → Cron Jobs
4. Verificar se `/api/cron/expire-leads` está rodando

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verificar logs do console
2. Verificar logs do servidor
3. Verificar banco de dados no Prisma Studio
4. Limpar cache e reinstalar dependências
5. Ler documentação em `START_HERE.md`

---

## 🎉 PRONTO!

**Se todos os testes passaram:** Sistema está funcionando! 🚀

**Próximos passos:**
1. Testar com usuários reais
2. Implementar emails
3. Ajustar UX
4. Deploy em produção

---

**Boa sorte! 💪**

Última atualização: 18/10/2024
