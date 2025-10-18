# Testes de Autenticação - Garantia de Qualidade

## 🎯 Objetivo
Garantir que o sistema de roles está funcionando corretamente e prevenir regressões.

## ✅ Checklist de Testes Manuais

### Teste 1: Login como ADMIN
- [ ] Fazer login com email configurado como ADMIN
- [ ] Verificar console: `Role: ADMIN`
- [ ] Clicar em "Painel" → deve ir para `/admin`
- [ ] Verificar `/api/debug/session` → `role: "ADMIN"`

### Teste 2: Login como REALTOR
- [ ] Criar usuário com role REALTOR via script
- [ ] Fazer login com esse email
- [ ] Verificar console: `Role: REALTOR`
- [ ] Clicar em "Painel" → deve ir para `/broker/dashboard`

### Teste 3: Login como OWNER
- [ ] Criar usuário com role OWNER via script
- [ ] Fazer login com esse email
- [ ] Verificar console: `Role: OWNER`
- [ ] Clicar em "Painel" → deve ir para `/owner/dashboard`

### Teste 4: Login como USER
- [ ] Fazer login com email novo (nunca usado)
- [ ] Verificar console: `Role: USER`
- [ ] Clicar em "Painel" → deve ir para `/dashboard`

### Teste 5: Mudança de Role em Tempo Real
- [ ] Login como USER
- [ ] Admin muda role para REALTOR via `/admin/users`
- [ ] Recarregar página (F5)
- [ ] Verificar console: `Role: REALTOR` (atualizado!)
- [ ] Botão "Painel" agora leva para `/broker/dashboard`

## 🔍 Logs Esperados

### Logs da Vercel (Server):
```
SignIn - Existing user: { email: '...', role: 'ADMIN' }
🔑 JWT Callback CALLED { trigger: 'signIn', ... }
🔑 JWT Callback - Fetched from DB: { email: '...', newRole: 'ADMIN' }
🔑 JWT Callback DONE - Final role: ADMIN
📋 Session Callback CALLED { hasToken: true, tokenRole: 'ADMIN' }
✅ Session callback - Role set: { token.role: 'ADMIN', session.user.role: 'ADMIN' }
```

### Logs do Navegador (Client):
```
TopNavMega - User: user@email.com Role: ADMIN
```

## 🚨 Red Flags (Problemas)

### ❌ Role sempre "USER" no console
**Causa**: Session não está expondo role em `session.user.role`
**Solução**: Verificar session callback em `src/lib/auth.ts`

### ❌ JWT Callback não aparece nos logs
**Causa**: JWT não está sendo executado
**Solução**: Verificar se JWT strategy está configurado

### ❌ Session callback não aparece nos logs
**Causa**: Session callback não está sendo executado
**Solução**: Verificar NextAuth configuration

### ❌ Role correto no servidor mas USER no cliente
**Causa**: Role não está em `session.user.role`
**Solução**: Adicionar em session callback:
```typescript
if (session.user) {
  (session.user as any).role = token.role;
}
```

## 📊 Monitoramento em Produção

### Métricas para Acompanhar:
1. **Taxa de ADMIN/REALTOR/OWNER indo para /dashboard por engano**
   - Deve ser 0%

2. **Logs de "Session callback - NO ROLE IN TOKEN"**
   - Deve ser 0

3. **Logs de "JWT Callback - User not found"**
   - Deve ser raro (só se usuário foi deletado)

### Alertas Configurar:
- ⚠️ Alerta se role=USER mas usuário tem outro role no banco
- ⚠️ Alerta se session callback não expõe role
- ⚠️ Alerta se JWT callback retorna erro

## 🔧 Scripts de Teste

### Criar usuário ADMIN:
```bash
npx tsx scripts/set-admin.ts
# Inserir email
```

### Verificar role de um usuário:
```bash
npx tsx scripts/diagnose-auth.ts user@email.com
```

### Testar API de debug:
```bash
curl https://zillowlike.vercel.app/api/debug/session
```

## ✅ Checklist de Deploy

Antes de fazer deploy de mudanças em autenticação:

- [ ] Testes manuais passando para todos os roles
- [ ] Logs da Vercel mostrando callbacks executando
- [ ] Console do navegador mostrando role correto
- [ ] `/api/debug/session` retornando role correto
- [ ] Redirecionamento correto para cada role
- [ ] Mudança de role refletindo em tempo real

## 📝 Notas

- **Sempre teste em janela anônima** para evitar cache
- **Sempre verifique logs da Vercel** para garantir execução server-side
- **Sempre teste mudança de role** para garantir atualização em tempo real
- **Sempre limpe cookies** entre testes de diferentes usuários
