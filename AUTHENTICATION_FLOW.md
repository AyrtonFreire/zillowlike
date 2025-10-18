# Fluxo de Autenticação - Documentação Técnica

## 🔐 Problema Resolvido

**Problema**: Usuários com roles específicos (ADMIN, REALTOR, OWNER) estavam sendo logados com role USER, perdendo acesso aos seus dashboards.

**Causa Raiz**: O NextAuth estava criando novos usuários com role padrão "USER" mesmo quando o usuário já existia no banco com outro role.

## ✅ Solução Implementada

### 1. SignIn Callback (src/lib/auth.ts)

**O que faz**: Verifica se o usuário já existe no banco ANTES de criar/atualizar

```typescript
async signIn({ user, account, profile }) {
  // Busca usuário existente por email
  const existingUser = await prisma.user.findUnique({
    where: { email: user.email },
    include: { accounts: true },
  });

  if (existingUser) {
    // CRÍTICO: Atualiza o objeto user com o role do banco
    (user as any).id = existingUser.id;
    (user as any).role = existingUser.role;
    
    // Vincula conta OAuth se ainda não estiver vinculada
    // ...
  }
  
  return true;
}
```

**Benefício**: Garante que o role correto seja passado para o JWT callback

### 2. JWT Callback (src/lib/auth.ts)

**O que faz**: SEMPRE busca o role mais recente do banco de dados

```typescript
async jwt({ token, user, trigger }) {
  // SEMPRE busca do banco (fonte da verdade)
  if (token.sub) {
    const dbUser = await prisma.user.findUnique({ 
      where: { id: token.sub }, 
      select: { role: true } 
    });
    
    if (dbUser) {
      token.role = dbUser.role; // Sempre usa o role do banco
    }
  }
  
  return token;
}
```

**Benefício**: 
- Role sempre atualizado em cada requisição
- Mudanças de role refletidas imediatamente
- Não depende de cache

### 3. Session Callback (src/lib/auth.ts)

**O que faz**: Propaga o role do token para a sessão

```typescript
async session({ session, token }) {
  (session as any).role = token.role;
  (session as any).user.role = token.role;
  return session;
}
```

## 🔄 Fluxo Completo

### Primeiro Login (Usuário Novo)
1. Usuário clica em "Login com Google"
2. Google autentica e retorna email
3. **SignIn Callback**: Verifica se email existe no banco → NÃO
4. NextAuth cria novo usuário com role "USER"
5. **JWT Callback**: Busca role do banco → "USER"
6. **Session Callback**: Propaga role "USER" para sessão
7. Usuário é redirecionado para `/dashboard`

### Primeiro Login (Usuário Existente - Ex: ADMIN criado via script)
1. Usuário clica em "Login com Google"
2. Google autentica e retorna email
3. **SignIn Callback**: Verifica se email existe no banco → SIM
4. **SignIn Callback**: Atualiza `user.role = "ADMIN"` (do banco)
5. **JWT Callback**: Recebe user com role "ADMIN"
6. **JWT Callback**: Confirma role no banco → "ADMIN"
7. **Session Callback**: Propaga role "ADMIN" para sessão
8. Usuário é redirecionado para `/admin`

### Login Subsequente
1. Usuário já tem sessão/token
2. **JWT Callback**: Busca role do banco → retorna role atual
3. **Session Callback**: Propaga role para sessão
4. Se role mudou (ex: USER → REALTOR), reflete imediatamente

### Mudança de Role (Ex: Admin promove USER para REALTOR)
1. Admin muda role via `/api/admin/users/[userId]/role`
2. Role atualizado no banco: `USER` → `REALTOR`
3. Próxima requisição do usuário:
   - **JWT Callback**: Busca role do banco → "REALTOR"
   - **JWT Callback**: Detecta mudança e loga
   - **Session Callback**: Propaga "REALTOR"
4. Usuário agora tem acesso a `/broker/dashboard`

## 🛡️ Garantias de Segurança

1. **Fonte Única da Verdade**: Banco de dados é sempre consultado
2. **Sem Cache de Role**: Role nunca fica desatualizado
3. **Logs Completos**: Todas as mudanças são logadas
4. **Fallback Seguro**: Em caso de erro, usa role "USER" (menos permissivo)

## 🧪 Como Testar

### Teste 1: Admin Existente
```bash
# 1. Criar admin via script
npx tsx scripts/set-admin.ts
# Email: seu@email.com

# 2. Fazer login no site com esse email
# Resultado esperado: Redireciona para /admin
```

### Teste 2: Mudança de Role
```bash
# 1. Login como USER
# 2. Admin muda seu role para REALTOR
# 3. Recarregar página (F5)
# Resultado esperado: Botão "Painel" agora leva para /broker/dashboard
```

### Teste 3: Novo Usuário
```bash
# 1. Login com email novo (nunca usado)
# Resultado esperado: Cria com role USER, redireciona para /dashboard
```

## 📊 Logs para Monitoramento

### Logs no Console do Navegador
```
TopNavMega - User: user@email.com Role: ADMIN
```

### Logs no Servidor (Vercel Runtime Logs)
```
SignIn Callback - Existing user found: { email: '...', id: '...', role: 'ADMIN' }
JWT Callback - Role updated: { email: '...', oldRole: 'USER', newRole: 'ADMIN' }
```

## 🚨 Troubleshooting

### Problema: Usuário ainda vê role errado
**Solução**: 
1. Logout
2. Limpar cookies (Ctrl+Shift+Del)
3. Login novamente

### Problema: Role não atualiza após mudança
**Verificar**:
1. Logs do servidor mostram "Role updated"?
2. Banco de dados tem o role correto?
3. Usuário fez refresh da página?

## 📝 Manutenção

### Ao adicionar novo Role
1. Adicionar no enum do Prisma Schema
2. Adicionar no middleware (roleBasedPaths)
3. Criar dashboard correspondente
4. Testar fluxo completo

### Ao modificar autenticação
1. Sempre manter banco como fonte da verdade
2. Sempre logar mudanças de role
3. Sempre testar com usuários existentes e novos
