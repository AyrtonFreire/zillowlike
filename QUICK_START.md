# ⚡ Quick Start - ZillowLike

## 🔧 Fix Prisma Client (Importante!)

O Prisma Client precisa ser regenerado para funcionar corretamente:

```powershell
# Opção 1: Script automático (Windows)
.\scripts\fix-prisma.ps1

# Opção 2: Manual
npm run prisma:generate
```

---

## 🚀 Rodando o Projeto

### 1. Desenvolvimento Local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp env.example .env.local
# Edite .env.local com suas credenciais

# 3. Banco de dados (Docker)
npm run docker:up

# 4. Migrações
npm run prisma:migrate

# 5. (Opcional) Seed
npm run seed

# 6. Rodar app
npm run dev:3001

# 7. Rodar workers (novo terminal)
npm run worker

# 8. Agendar jobs recorrentes
Invoke-RestMethod -Uri "http://localhost:3001/api/workers/start" -Method POST
```

### 2. Docker (Produção)

```bash
# 1. Configurar .env
cp env.example .env
# Edite .env com credenciais de produção

# 2. Subir tudo
npm run docker:up

# 3. Migrações
docker-compose exec app npx prisma migrate deploy

# 4. Verificar health
curl http://localhost:3001/api/health
```

---

## 📚 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev:3001` | Roda app em modo desenvolvimento |
| `npm run worker` | Roda workers BullMQ |
| `npm run build` | Build de produção |
| `npm run start` | Inicia app em produção |
| `npm run prisma:generate` | Regenera Prisma Client |
| `npm run prisma:migrate` | Aplica migrações |
| `npm run prisma:studio` | Abre Prisma Studio (DB UI) |
| `npm run seed` | Popula banco com dados de teste |
| `npm run docker:up` | Sobe containers Docker |
| `npm run docker:down` | Para containers Docker |
| `npm run docker:logs` | Ver logs dos containers |
| `npm run test` | Roda testes |
| `npm run test:ui` | Roda testes com UI |
| `npm run lint` | Verifica código |

---

## 🔑 Configuração Rápida

### OAuth (GitHub - 5 minutos)

1. Acesse: https://github.com/settings/developers
2. "New OAuth App"
3. Callback URL: `http://localhost:3001/api/auth/callback/github`
4. Copie Client ID e Secret para `.env.local`:
   ```env
   GITHUB_ID="seu_client_id"
   GITHUB_SECRET="seu_client_secret"
   ```

### Redis (Upstash - 5 minutos)

1. Acesse: https://upstash.com/
2. "Create Database" (Free tier)
3. Copie credenciais para `.env.local`:
   ```env
   REDIS_HOST="redis-xxxxx.upstash.io"
   REDIS_PORT="6379"
   REDIS_PASSWORD="seu_password"
   REDIS_TLS="true"
   ```

### NextAuth Secret

```powershell
# Windows PowerShell
$bytes = New-Object Byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# Linux/Mac
openssl rand -base64 32
```

Adicione ao `.env.local`:
```env
NEXTAUTH_SECRET="secret_gerado_acima"
```

---

## 🏥 Health Check

Verifique se tudo está funcionando:

```bash
curl http://localhost:3001/api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  },
  "uptime": 123.45
}
```

---

## 📖 Documentação Completa

| Documento | Conteúdo |
|-----------|----------|
| `QUICK_START.md` | ⚡ Este arquivo (start rápido) |
| `README_DEPLOYMENT.md` | 📦 Deploy rápido |
| `DEPLOYMENT_GUIDE.md` | 📚 Guia completo de deploy |
| `COMPLETE_IMPLEMENTATION.md` | 📋 Visão geral técnica |
| `REFACTORING_SUMMARY.md` | 🔧 Refatoração e limpeza |
| `IMPLEMENTATION_STATUS.md` | ✅ Checklist de features |

---

## 🆘 Problemas Comuns

### EPERM no Windows

```powershell
# Pare o dev server e rode:
.\scripts\fix-prisma.ps1
```

### Workers não processam jobs

```bash
# Verifique Redis
docker-compose exec redis redis-cli ping
# Esperado: PONG

# Verifique se agendou os jobs
curl http://localhost:3001/api/workers/start -X POST
```

### OAuth não funciona

```bash
# Certifique-se que callback URL está exato:
# GitHub: http://localhost:3001/api/auth/callback/github
# Google: http://localhost:3001/api/auth/callback/google
```

---

## 🎯 Próximos Passos

### Para Desenvolvimento
1. ✅ Configurar OAuth
2. ✅ Rodar projeto local
3. ✅ Testar funcionalidades
4. ✅ Ver Prisma Studio (`npm run prisma:studio`)

### Para Deploy
1. ✅ Configurar Redis (Upstash)
2. ✅ Configurar OAuth (produção)
3. ✅ Deploy (Ver `DEPLOYMENT_GUIDE.md`)
4. ✅ Monitorar (Sentry, UptimeRobot)

---

## 📊 Status do Projeto

**Production Ready**: ████████████████████ 100%

✅ Todas as features implementadas  
✅ Docker configurado  
✅ CI/CD pronto  
✅ Security headers  
✅ Rate limiting  
✅ Workers BullMQ  
✅ Health checks  
✅ Observabilidade (Sentry)  

---

**🚀 Pronto para começar!**

Para mais detalhes, consulte `DEPLOYMENT_GUIDE.md`
