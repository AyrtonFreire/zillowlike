# 🔐 Environment Variables para Produção (Vercel)

Configure estas variáveis em: **Vercel Dashboard → Settings → Environment Variables**

## 📋 Variáveis Obrigatórias

```env
# === DATABASE (Supabase - Connection Pooling) ===
DATABASE_URL=postgresql://postgres.[projeto]:[senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

# === NEXTAUTH ===
NEXTAUTH_URL=https://seu-projeto.vercel.app
NEXTAUTH_SECRET=gere-um-secret-aleatorio-com-openssl-rand-base64-32

# === OAUTH PROVIDERS ===
GITHUB_ID=seu-github-oauth-app-id
GITHUB_SECRET=seu-github-oauth-app-secret

GOOGLE_CLIENT_ID=seu-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-google-client-secret

# === CLOUDINARY (Upload de Imagens) ===
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret

# === REDIS (Upstash) ===
REDIS_URL=rediss://default:[senha]@[region].upstash.io:6379

# === PUSHER (Notificações Tempo Real) ===
NEXT_PUBLIC_PUSHER_KEY=sua-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=us2
PUSHER_APP_ID=seu-pusher-app-id
PUSHER_SECRET=seu-pusher-secret

# === TURNSTILE (Captcha - Cloudflare) ===
NEXT_PUBLIC_TURNSTILE_SITE_KEY=seu-site-key
TURNSTILE_SECRET_KEY=seu-secret-key

# === SENTRY (Monitoramento - Opcional) ===
SENTRY_DSN=https://[chave]@sentry.io/[projeto]
NEXT_PUBLIC_SENTRY_DSN=https://[chave]@sentry.io/[projeto]
```

---

## ⚠️ Importante

### Callback URLs para OAuth

Após deploy, atualize as callback URLs nos providers:

**GitHub:**
- Homepage URL: `https://seu-projeto.vercel.app`
- Callback URL: `https://seu-projeto.vercel.app/api/auth/callback/github`

**Google:**
- Authorized redirect URIs: `https://seu-projeto.vercel.app/api/auth/callback/google`

---

## 🔑 Como gerar NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Ou use: https://generate-secret.vercel.app/32

---

## 📝 Checklist de Configuração

- [ ] Supabase: Connection pooling configurada
- [ ] NEXTAUTH_SECRET gerado
- [ ] OAuth Apps configurados com URLs de produção
- [ ] Cloudinary: credenciais copiadas
- [ ] Upstash Redis: URL copiada
- [ ] Pusher: credentials copiadas
- [ ] Todas as variáveis adicionadas no Vercel
- [ ] Deploy realizado com sucesso
- [ ] Admin criado no banco de produção
