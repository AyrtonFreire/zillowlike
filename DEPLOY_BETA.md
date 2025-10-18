# 🚀 Deploy de Ambiente Beta Público

Guia completo para deploy do ambiente de staging/beta acessível publicamente para testes com usuários reais.

---

## 📋 Pré-requisitos

Antes de fazer deploy, garanta que você já tenha:

- ✅ Conta no Supabase (banco PostgreSQL configurado)
- ✅ Conta no Cloudinary (upload de imagens)
- ✅ Conta no Upstash (Redis para filas)
- ✅ Conta no Pusher (notificações tempo real)
- ✅ OAuth Apps criados (GitHub/Google)
- ✅ Código commitado no GitHub

---

## 🎯 Opção 1: Deploy via Vercel (Recomendado - Mais Fácil)

### Passo 1: Criar conta na Vercel

1. Acesse https://vercel.com
2. Sign up com sua conta do GitHub
3. Autorize acesso aos repositórios

### Passo 2: Importar Projeto

1. No Dashboard da Vercel, clique em **"Add New..."** → **"Project"**
2. Selecione o repositório `AyrtonFreire/zillowlike`
3. Configure o projeto:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (raiz)
   - **Build Command:** `npm run build` (já configurado)
   - **Install Command:** `npm ci` (já configurado)

### Passo 3: Configurar Environment Variables

Na tela de import, clique em **"Environment Variables"** e adicione **TODAS** as variáveis do arquivo `ENV_PRODUCTION_TEMPLATE.md`:

```env
DATABASE_URL=postgresql://postgres.[projeto]:[senha]@...supabase.com:6543/postgres
NEXTAUTH_URL=https://seu-projeto.vercel.app
NEXTAUTH_SECRET=gere-com-openssl-rand-base64-32
GITHUB_ID=...
GITHUB_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
REDIS_URL=rediss://...upstash.io:6379
NEXT_PUBLIC_PUSHER_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=us2
PUSHER_APP_ID=...
PUSHER_SECRET=...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

⚠️ **Importante:** Use as mesmas credenciais que você já configurou localmente, mas atualize:
- `NEXTAUTH_URL` para a URL da Vercel (ex: `https://zillowlike-beta.vercel.app`)
- `DATABASE_URL` do Supabase (Connection Pooling)

### Passo 4: Deploy

1. Clique em **"Deploy"**
2. Aguarde 2-3 minutos
3. Você verá: ✅ **"Your project is ready!"**
4. Clique em **"Visit"** para ver o site ao vivo

### Passo 5: Atualizar OAuth Callbacks

**GitHub:**
1. Acesse https://github.com/settings/developers
2. Edite seu OAuth App
3. Atualize:
   - **Homepage URL:** `https://seu-projeto.vercel.app`
   - **Authorization callback URL:** `https://seu-projeto.vercel.app/api/auth/callback/github`

**Google:**
1. Acesse https://console.cloud.google.com
2. APIs & Services → Credentials
3. Edite seu OAuth 2.0 Client
4. Adicione em **Authorized redirect URIs:**
   - `https://seu-projeto.vercel.app/api/auth/callback/google`

### Passo 6: Rodar Migrations no Banco de Produção

**Opção A: Via Vercel CLI (Terminal local)**
```powershell
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Link ao projeto
vercel link

# Rodar migrations
vercel env pull .env.production
npx prisma migrate deploy
```

**Opção B: Criar script de build (mais seguro)**

A migration já roda automaticamente no build via `package.json`:
```json
"build": "prisma migrate deploy && next build --turbopack"
```

### Passo 7: Criar Admin no Banco de Produção

Acesse seu projeto localmente, mas conectado ao banco de produção:

1. Temporariamente, edite seu `.env` local com a `DATABASE_URL` de produção
2. Execute:
```powershell
npm run create-admin
```
3. Insira seu email **real** (o mesmo do OAuth)
4. Volte o `.env` para desenvolvimento local

**OU via Prisma Studio:**
```powershell
# Conecte ao banco de produção
DATABASE_URL="sua-url-prod" npx prisma studio
```
- Crie manualmente um usuário com `role: ADMIN`

### Passo 8: Testar

1. Acesse `https://seu-projeto.vercel.app`
2. Clique em **"Sign in"**
3. Use OAuth (GitHub/Google) com o email do admin
4. Você deve entrar como ADMIN
5. Teste publicar um imóvel em `/owner/new`

---

## 🎯 Opção 2: Deploy via Railway (Alternativa)

Railway suporta workers de fila (BullMQ) melhor que Vercel.

### Passo 1: Criar conta

1. Acesse https://railway.app
2. Sign up com GitHub

### Passo 2: New Project

1. **"Deploy from GitHub repo"**
2. Selecione `AyrtonFreire/zillowlike`
3. Railway detecta automaticamente Next.js

### Passo 3: Adicionar Database & Redis

1. Clique em **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Clique em **"+ New"** → **"Database"** → **"Add Redis"**
3. Railway gera automaticamente `DATABASE_URL` e `REDIS_URL`

### Passo 4: Environment Variables

Adicione as mesmas variáveis da Vercel (Railway já tem `DATABASE_URL` e `REDIS_URL`).

### Passo 5: Deploy Workers

Crie um segundo serviço para workers:

1. **"+ New"** → **"Empty Service"**
2. Conecte ao mesmo repo
3. Configure:
   - **Start Command:** `npm run worker`
   - Mesmas env vars

---

## 🔄 Redeploys Automáticos

Ambas plataformas fazem redeploy automático ao fazer `git push` na branch `main`:

```powershell
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

Vercel/Railway detecta e faz redeploy em ~2 min.

---

## 📊 Monitoramento

### Vercel Analytics
- Habilitado automaticamente
- Acesse: Dashboard → Analytics

### Logs
- Vercel: Dashboard → Logs (real-time)
- Railway: Dashboard → Deployments → View Logs

### Sentry (Opcional)
1. Crie conta em https://sentry.io
2. Crie projeto Next.js
3. Copie DSN
4. Adicione env vars:
   ```
   SENTRY_DSN=https://...@sentry.io/...
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   ```

---

## 🐛 Troubleshooting

### Erro: "Database connection failed"
- Verifique `DATABASE_URL` no Vercel Dashboard
- Use **Connection Pooling** do Supabase (porta 6543)
- Teste conexão: `psql "sua-database-url"`

### Erro: "Build failed"
- Verifique logs de build na Vercel
- Certifique-se que `prisma generate` rodou
- Verifique se `postinstall` está em `package.json`

### Erro: "OAuth redirect mismatch"
- Atualize callback URLs nos providers (GitHub/Google)
- Certifique-se que `NEXTAUTH_URL` está correto

### Workers não rodam na Vercel
- **Limitação:** Vercel não suporta long-running processes
- **Solução 1:** Use Railway para workers
- **Solução 2:** Use Vercel Cron Jobs (limitado)
- **Solução 3:** Use serviço separado (Render, Fly.io)

---

## ✅ Checklist Final

Antes de compartilhar URL com beta testers:

- [ ] Deploy bem-sucedido (`https://seu-projeto.vercel.app` acessível)
- [ ] Banco de produção com migrations aplicadas
- [ ] Admin criado no banco de produção
- [ ] OAuth funcionando (login via GitHub/Google)
- [ ] Upload de imagens funcionando (Cloudinary)
- [ ] Redis/Upstash conectado (filas)
- [ ] Pusher conectado (notificações tempo real)
- [ ] Teste E2E: cadastro → publicar imóvel → criar lead
- [ ] Logs monitorados (sem erros críticos)
- [ ] URL compartilhada com beta testers

---

## 🎉 Próximos Passos

1. **Compartilhe a URL** com seus beta testers
2. **Monitore logs** nas primeiras horas
3. **Colete feedback** via formulário ou canal dedicado
4. **Itere rapidamente** com base no feedback
5. **Prepare para produção** quando estável

---

## 📞 Suporte

- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **Supabase Docs:** https://supabase.com/docs

---

**Deploy configurado com sucesso? Acesse seu site e comece a testar! 🚀**
