# 🎯 Sistema de Aplicação de Corretores

## 📋 VISÃO GERAL

Sistema completo para que usuários possam se candidatar a corretores na plataforma, com aprovação administrativa e automação completa.

---

## 🔄 FLUXO COMPLETO

```
1. Usuário faz login (OAuth)
   ↓
2. Acessa /become-realtor
   ↓
3. Preenche formulário:
   - Dados profissionais (CRECI, telefone, experiência)
   - Upload de documentos (CRECI + RG/CNH)
   - Especialidades
   - Bio (opcional)
   - Aceita termos
   ↓
4. Submete aplicação
   ↓
5. Status: PENDING
   ↓
6. ADMIN revisa em /admin/realtor-applications
   ↓
7. ADMIN aprova ou rejeita
   ↓
8. Se APROVADO:
   ✅ Role → REALTOR
   ✅ Adicionado à fila automaticamente
   ✅ RealtorStats criado
   ✅ Email de boas-vindas (TODO)
   ↓
9. Corretor pode receber leads!
```

---

## 📁 ARQUIVOS CRIADOS

### **Frontend:**
1. `src/app/become-realtor/page.tsx` - Formulário de aplicação
2. `src/app/admin/realtor-applications/page.tsx` - Painel de aprovação

### **Backend:**
3. `src/app/api/realtor/apply/route.ts` - Submissão de aplicação
4. `src/app/api/realtor/upload-documents/route.ts` - Upload de documentos
5. `src/app/api/admin/realtor-applications/route.ts` - Listar aplicações
6. `src/app/api/admin/realtor-applications/approve/route.ts` - Aprovar
7. `src/app/api/admin/realtor-applications/reject/route.ts` - Rejeitar

### **Database:**
8. `prisma/schema.prisma` - Tabela RealtorApplication + enum ApplicationStatus

---

## 🗄️ ESTRUTURA DO BANCO

### **Tabela: RealtorApplication**

```prisma
model RealtorApplication {
  id                  String            @id @default(cuid())
  userId              String            @unique
  user                User              @relation(...)
  
  // Dados profissionais
  creci               String
  creciState          String            // UF (PE, BA, etc)
  creciExpiry         DateTime
  phone               String
  
  // Documentos
  creciDocumentUrl    String?
  identityDocumentUrl String?
  
  // Informações
  experience          Int               // Anos
  specialties         String[]          // Array
  bio                 String?
  
  // Status
  status              ApplicationStatus @default(PENDING)
  reviewedBy          String?
  reviewer            User?             @relation(...)
  reviewedAt          DateTime?
  rejectionReason     String?
  
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
}

enum ApplicationStatus {
  PENDING
  APPROVED
  REJECTED
}
```

---

## ✅ VALIDAÇÕES IMPLEMENTADAS

### **Frontend:**
- ✅ CRECI: Formato `123456` ou `123456-F`
- ✅ Estado: Obrigatório (select com 27 estados)
- ✅ Validade: Data futura obrigatória
- ✅ Telefone: Obrigatório
- ✅ Experiência: Número positivo
- ✅ Especialidades: Mínimo 1 selecionada
- ✅ Documentos: Obrigatórios (JPG, PNG, PDF - máx 5MB)
- ✅ Termos: Checkbox obrigatório

### **Backend:**
- ✅ Autenticação: Apenas usuários logados
- ✅ Duplicação: Verifica se já existe aplicação
- ✅ Autorização: Apenas ADMIN pode aprovar/rejeitar
- ✅ Status: Apenas PENDING pode ser processado

---

## 🚀 AUTOMAÇÃO NA APROVAÇÃO

Quando ADMIN aprova uma aplicação, o sistema **automaticamente**:

1. ✅ Atualiza status para `APPROVED`
2. ✅ Registra quem aprovou e quando
3. ✅ **Muda role do usuário para `REALTOR`**
4. ✅ **Adiciona à fila de corretores** (próxima posição)
5. ✅ **Cria RealtorStats** (métricas zeradas)
6. ✅ Atualiza telefone do usuário
7. 🔄 TODO: Envia email de boas-vindas

**Tudo em uma transação atômica!** Se qualquer etapa falhar, nada é aplicado.

---

## 📊 PAINEL DE APROVAÇÃO

### **Funcionalidades:**

- 📋 Lista todas as aplicações
- 🔍 Filtros: Todas / Pendentes / Aprovadas / Rejeitadas
- 👁️ Ver detalhes completos
- 📄 Visualizar documentos (CRECI + RG/CNH)
- ✅ Aprovar com 1 clique
- ❌ Rejeitar com motivo obrigatório
- 📊 Status visual (badges coloridos)
- 📅 Data de aplicação e revisão

### **Acesso:**
- Rota: `/admin/realtor-applications`
- Permissão: Apenas ADMIN
- Link no dashboard admin

---

## 🎨 FORMULÁRIO DE APLICAÇÃO

### **Seções:**

1. **Dados Profissionais:**
   - CRECI (número)
   - Estado do CRECI (select)
   - Validade do CRECI (date picker)
   - Telefone
   - Anos de experiência

2. **Especialidades:**
   - Residencial
   - Comercial
   - Industrial
   - Rural
   - Lançamentos
   - Alto Padrão
   - Locação
   - Venda

3. **Apresentação:**
   - Bio (textarea opcional)

4. **Documentos:**
   - Upload CRECI (drag & drop)
   - Upload RG/CNH (drag & drop)

5. **Termos:**
   - Checkbox de aceitação

### **UX:**
- ✅ Validação em tempo real
- ✅ Mensagens de erro claras
- ✅ Loading states
- ✅ Tela de sucesso
- ✅ Redirecionamento automático

---

## 🔐 SEGURANÇA

### **Upload de Documentos:**
- ✅ Validação de tipo (JPG, PNG, PDF)
- ✅ Limite de tamanho (5MB)
- ✅ Nome único com timestamp
- ✅ Armazenamento em `/public/uploads/realtor-docs/`
- ✅ Apenas usuário autenticado

### **Aprovação:**
- ✅ Apenas ADMIN
- ✅ Verificação de status
- ✅ Transação atômica
- ✅ Logs de auditoria

---

## 📝 COMO USAR

### **1. Aplicar Migração:**

```bash
npx prisma migrate dev --name add_realtor_applications
npx prisma generate
```

### **2. Usuário se Candidata:**

```
1. Login na plataforma
2. Acessar: /become-realtor
3. Preencher formulário
4. Upload de documentos
5. Submeter
```

### **3. Admin Aprova:**

```
1. Login como ADMIN
2. Acessar: /admin/realtor-applications
3. Ver detalhes da aplicação
4. Verificar documentos
5. Aprovar ou Rejeitar
```

### **4. Corretor Ativo:**

```
✅ Role = REALTOR
✅ Na fila de distribuição
✅ Pode receber leads
✅ Acesso ao dashboard de corretor
```

---

## 🎯 PRÓXIMAS MELHORIAS

### **Emails:**
- [ ] Email de confirmação ao aplicar
- [ ] Email de aprovação
- [ ] Email de rejeição (com motivo)
- [ ] Email de boas-vindas com instruções

### **Notificações:**
- [ ] Notificação in-app para admin (nova aplicação)
- [ ] Badge com contador de pendentes
- [ ] Notificação para usuário (status mudou)

### **Melhorias:**
- [ ] Integração com API do CRECI (validação automática)
- [ ] Verificação de CPF
- [ ] Upload para S3/Cloudinary (em vez de filesystem)
- [ ] Histórico de revisões
- [ ] Reaplicação após rejeição

---

## 🐛 TROUBLESHOOTING

### **Erro: "Aplicação já existe"**
- Usuário já tem uma aplicação (PENDING, APPROVED ou REJECTED)
- Solução: Deletar aplicação antiga ou permitir reaplicação

### **Erro: "Erro ao fazer upload"**
- Verificar permissões da pasta `/public/uploads/`
- Verificar tamanho do arquivo (máx 5MB)
- Verificar tipo do arquivo (JPG, PNG, PDF)

### **Erro: "Não autorizado"**
- Verificar se usuário está logado
- Verificar role do usuário (deve ser ADMIN para aprovar)

---

## 📊 MÉTRICAS

Para monitorar o sistema:

```sql
-- Total de aplicações
SELECT COUNT(*) FROM realtor_applications;

-- Por status
SELECT status, COUNT(*) 
FROM realtor_applications 
GROUP BY status;

-- Tempo médio de aprovação
SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at))/3600) as avg_hours
FROM realtor_applications 
WHERE status = 'APPROVED';

-- Taxa de aprovação
SELECT 
  (COUNT(*) FILTER (WHERE status = 'APPROVED')::float / COUNT(*) * 100) as approval_rate
FROM realtor_applications;
```

---

**Data:** 2025-10-20  
**Versão:** 1.0  
**Status:** ✅ Implementado e Testado
