# 🚀 Quick Start - Deployment

## ⚡ Início Rápido (5 minutos)

### 1. Configuração Inicial

```bash
# Clone e instale
git clone https://github.com/seu-usuario/zillowlike.git
cd zillowlike
npm install

# Configure ambiente
cp env.example .env.local

# Gere secrets
# PowerShell:
$bytes = New-Object Byte[] 32; [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes); [Convert]::ToBase64String($bytes)

# Adicione ao .env.local:
# NEXTAUTH_SECRET="secret-gerado-acima"
```

### 2. OAuth (GitHub - Mais rápido)

1. Acesse: https://github.com/settings/developers
2. "New OAuth App"
3. Callback URL: `http://localhost:3001/api/auth/callback/github`
4. Copie Client ID e Secret para `.env.local`

### 3. Redis (Upstash - Grátis)

1. Acesse: https://upstash.com/
2. "Create Database" (Free tier)
3. Copie credenciais para `.env.local`:
   ```env
   REDIS_HOST="redis-xxxxx.upstash.io"
   REDIS_PORT="6379"
   REDIS_PASSWORD="seu-password"
   REDIS_TLS="true"
   ```

### 4. Rodar Local

```bash
# Banco (Docker)
docker-compose up -d postgres

# Migrações
npx prisma migrate dev

# App
npm run dev:3001

# Workers (novo terminal)
npm run worker
```

### 5. Deploy Produção (Docker)

```bash
# Build e suba tudo
docker-compose up -d

# Migrações
docker-compose exec app npx prisma migrate deploy

# Pronto! 🎉
# App: http://localhost:3001
# Health: http://localhost:3001/api/health
```

---

## 📂 Arquivos de Deploy Criados

| Arquivo | Descrição |
|---------|-----------|
| `Dockerfile` | Imagem da aplicação Next.js |
| `Dockerfile.worker` | Imagem dos workers BullMQ |
| `docker-compose.yml` | Orquestração completa (app + postgres + redis + workers) |
| `.dockerignore` | Otimização de build |
| `src/app/api/health/route.ts` | Health check endpoint |
| `.github/workflows/ci.yml` | Pipeline CI/CD completo |
| `DEPLOYMENT_GUIDE.md` | Guia completo de deploy |

---

## 🎯 Deploy Rápido por Plataforma

### Vercel (App) + Upstash (Redis) + Neon (DB)

**Mais fácil e rápido:**

1. **Vercel**:
   - Conecte repo GitHub
   - Configure env vars
   - Deploy automático ✅

2. **Neon** (Postgres):
   - https://neon.tech/ (free tier)
   - Copie DATABASE_URL

3. **Upstash** (Redis):
   - https://upstash.com/ (free tier)
   - Copie credenciais

4. **Workers** (opcional):
   - Deploy em Railway.app com `Dockerfile.worker`

**Custo**: $0/mês (free tiers)

### Railway (Tudo-em-um)

1. Conecte repo GitHub
2. Railway detecta `docker-compose.yml`
3. Configure env vars
4. Deploy automático ✅

**Custo**: ~$5-10/mês

### AWS (Produção Escalável)

1. **ECS/Fargate**: App + Workers
2. **RDS**: PostgreSQL
3. **ElastiCache**: Redis
4. **CI/CD**: GitHub Actions → ECR → ECS

**Custo**: ~$50-100/mês

---

## ✅ Checklist Pré-Deploy

### Obrigatório
- [x] Migrações aplicadas ✅
- [x] OAuth configurado (GitHub ou Google)
- [x] Redis configurado (Upstash recomendado)
- [x] `NEXTAUTH_SECRET` definido
- [x] Variáveis de ambiente configuradas

### Recomendado
- [ ] Sentry configurado (error tracking)
- [ ] Backup automático do DB
- [ ] Monitoramento (UptimeRobot)
- [ ] SSL/HTTPS configurado
- [ ] Logs centralizados

### Opcional
- [ ] CI/CD configurado (GitHub Actions)
- [ ] Multi-region (CDN)
- [ ] Load balancer
- [ ] Auto-scaling

---

## 🔗 Links Úteis

- **Guia Completo**: Ver `DEPLOYMENT_GUIDE.md`
- **Status**: Ver `IMPLEMENTATION_STATUS.md`
- **Resumo Técnico**: Ver `FINAL_IMPLEMENTATION_SUMMARY.md`
- **Health Check**: `http://your-domain.com/api/health`

---

## 🆘 Problemas Comuns

### "EPERM" no Windows
```bash
# Feche VS Code e rode em terminal admin
npx prisma generate
```

### Workers não processam
```bash
# Verifique Redis
docker-compose exec redis redis-cli ping
# Esperado: PONG
```

### OAuth não funciona
```bash
# Verifique callback URL exata:
# GitHub: http://localhost:3001/api/auth/callback/github
# Google: http://localhost:3001/api/auth/callback/google
```

---

**Pronto para deploy! 🚀**

Qualquer dúvida, consulte o `DEPLOYMENT_GUIDE.md` para instruções detalhadas.
