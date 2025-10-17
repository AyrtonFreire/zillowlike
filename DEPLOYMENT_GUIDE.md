# Guia de Deploy - Production Ready

## 📋 Pré-requisitos

- ✅ Migração de índices aplicada (`npx prisma migrate deploy`)
- ✅ Docker e Docker Compose instalados
- ✅ Conta GitHub/Google para OAuth
- ✅ Redis configurado (local ou Upstash)

---

## 🔐 1. Configurar OAuth Providers

### GitHub OAuth

1. **Criar OAuth App no GitHub**
   - Acesse: https://github.com/settings/developers
   - Clique em "New OAuth App"
   - Preencha:
     - **Application name**: Zillowlike
     - **Homepage URL**: `http://localhost:3001` (dev) ou `https://seu-dominio.com` (prod)
     - **Authorization callback URL**: `http://localhost:3001/api/auth/callback/github`
   - Clique em "Register application"

2. **Copiar credenciais**
   ```bash
   Client ID: Ghp_xxxxxxxxxxxxx
   Client Secret: (clique em "Generate a new client secret")
   ```

3. **Adicionar ao `.env.local`**
   ```env
   GITHUB_ID="seu_client_id_aqui"
   GITHUB_SECRET="seu_client_secret_aqui"
   ```

### Google OAuth

1. **Criar projeto no Google Cloud Console**
   - Acesse: https://console.cloud.google.com/
   - Crie um novo projeto ou selecione existente
   - Ative a "Google+ API"

2. **Configurar OAuth Consent Screen**
   - Na barra lateral: APIs & Services > OAuth consent screen
   - Tipo de usuário: **External**
   - Preencha nome do app, email de suporte, etc.

3. **Criar credenciais OAuth 2.0**
   - APIs & Services > Credentials
   - "Create Credentials" > "OAuth client ID"
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3001/api/auth/callback/google` (dev)
     - `https://seu-dominio.com/api/auth/callback/google` (prod)

4. **Copiar credenciais**
   ```bash
   Client ID: 123456789-xxxxxxxxxxxxx.apps.googleusercontent.com
   Client Secret: GOCSPX-xxxxxxxxxxxxxxxxxxxx
   ```

5. **Adicionar ao `.env.local`**
   ```env
   GOOGLE_CLIENT_ID="seu_client_id_aqui"
   GOOGLE_CLIENT_SECRET="seu_client_secret_aqui"
   ```

### NextAuth Secret

Gere um secret seguro:

```bash
# Windows PowerShell
$bytes = New-Object Byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# Linux/Mac
openssl rand -base64 32
```

Adicione ao `.env.local`:
```env
NEXTAUTH_SECRET="seu_secret_aqui"
NEXTAUTH_URL="http://localhost:3001"
```

---

## ☁️ 2. Configurar Redis (Upstash - Managed)

### Criar Redis Database no Upstash

1. **Criar conta**
   - Acesse: https://upstash.com/
   - Crie uma conta gratuita

2. **Criar database**
   - Dashboard > "Create Database"
   - Nome: `zillowlike-redis`
   - Região: Escolha mais próxima (ex: `us-east-1`)
   - Tipo: **Regional** (Free tier)
   - Clique em "Create"

3. **Copiar credenciais**
   - Na página do database, copie:
     - **UPSTASH_REDIS_REST_URL**
     - **UPSTASH_REDIS_REST_TOKEN**
   - Ou use o endpoint direto:
     - **Endpoint**: `redis-12345.upstash.io`
     - **Port**: `6379`
     - **Password**: `seu_password_aqui`

4. **Configurar no projeto**

   **Opção A: REST API (recomendado para serverless)**
   ```env
   UPSTASH_REDIS_REST_URL="https://redis-12345.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="seu_token_aqui"
   ```

   **Opção B: TCP/TLS (recomendado para workers)**
   ```env
   REDIS_HOST="redis-12345.upstash.io"
   REDIS_PORT="6379"
   REDIS_PASSWORD="seu_password_aqui"
   REDIS_TLS="true"
   ```

5. **Atualizar config do Redis** (`src/lib/queue/config.ts`)
   ```typescript
   export const redisConnection: ConnectionOptions = {
     host: process.env.REDIS_HOST || "localhost",
     port: parseInt(process.env.REDIS_PORT || "6379"),
     password: process.env.REDIS_PASSWORD,
     tls: process.env.REDIS_TLS === "true" ? {} : undefined,
     maxRetriesPerRequest: null,
   };
   ```

---

## 🐳 3. Deploy com Docker

### Desenvolvimento Local

```bash
# 1. Criar .env file com todas as variáveis
cp env.example .env

# 2. Editar .env com suas credenciais reais
# (OAuth, Redis, etc.)

# 3. Subir todos os serviços
docker-compose up -d

# 4. Ver logs
docker-compose logs -f app

# 5. Executar migrações
docker-compose exec app npx prisma migrate deploy

# 6. (Opcional) Seed do banco
docker-compose exec app npm run seed
```

### Verificar Health

```bash
# App
curl http://localhost:3001/api/health

# Esperado:
# {
#   "status": "ok",
#   "services": {
#     "database": "healthy",
#     "redis": "healthy"
#   }
# }
```

### Parar serviços

```bash
docker-compose down

# Ou com volumes (limpa DB)
docker-compose down -v
```

---

## 🚀 4. Deploy em Produção

### Opção A: Docker Compose (VPS/EC2)

1. **Preparar servidor**
   ```bash
   # Instalar Docker e Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. **Transferir código**
   ```bash
   git clone https://github.com/seu-usuario/zillowlike.git
   cd zillowlike
   ```

3. **Configurar .env**
   ```bash
   cp env.example .env
   nano .env  # Edite com credenciais de produção
   ```

4. **Deploy**
   ```bash
   docker-compose up -d
   docker-compose exec app npx prisma migrate deploy
   ```

5. **Configurar SSL (Nginx + Let's Encrypt)**
   ```nginx
   server {
       listen 80;
       server_name seu-dominio.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl;
       server_name seu-dominio.com;

       ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Opção B: AWS ECS/Fargate

1. **Criar ECR repositories**
   ```bash
   aws ecr create-repository --repository-name zillowlike
   aws ecr create-repository --repository-name zillowlike-worker
   ```

2. **Build e push images**
   ```bash
   # Login
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

   # Build
   docker build -t zillowlike .
   docker tag zillowlike:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/zillowlike:latest

   # Push
   docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/zillowlike:latest
   ```

3. **Criar Task Definition e Service no ECS**
   - Use o console AWS ou Terraform
   - Configure variáveis de ambiente via AWS Secrets Manager

### Opção C: Vercel (App) + Railway (Workers)

**Vercel (Next.js App)**
1. Conecte repositório GitHub ao Vercel
2. Configure variáveis de ambiente
3. Deploy automático

**Railway (Workers)**
1. Crie novo projeto no Railway
2. Conecte ao GitHub
3. Configure Dockerfile como `Dockerfile.worker`
4. Adicione variáveis de ambiente

---

## 🤖 5. CI/CD (GitHub Actions)

### Configurar Secrets no GitHub

1. Acesse: Repository > Settings > Secrets and variables > Actions
2. Adicione os seguintes secrets:

```
DOCKER_USERNAME: seu-usuario-dockerhub
DOCKER_PASSWORD: seu-token-dockerhub

# Para AWS (se usar ECS)
AWS_ACCESS_KEY_ID: seu-access-key
AWS_SECRET_ACCESS_KEY: seu-secret-key
AWS_REGION: us-east-1
```

### Pipeline Automático

O pipeline `.github/workflows/ci.yml` vai:

1. **Em todo Push/PR**:
   - ✅ Lint e TypeCheck
   - ✅ Rodar testes
   - ✅ Build da aplicação

2. **Em Push para `main`**:
   - ✅ Build de imagens Docker
   - ✅ Push para Docker Hub
   - ✅ Deploy (se configurado)

### Customizar Deploy Step

Edite `.github/workflows/ci.yml` na etapa `deploy`:

**Para AWS ECS:**
```yaml
- name: Deploy to AWS ECS
  run: |
    aws ecs update-service \
      --cluster zillowlike \
      --service zillowlike-app \
      --force-new-deployment
```

**Para Docker Swarm:**
```yaml
- name: Deploy to Swarm
  run: |
    docker service update --image ${{ secrets.DOCKER_USERNAME }}/zillowlike:latest zillowlike_app
```

---

## 📊 6. Monitoramento

### Health Checks

- **App**: `GET /api/health`
- **Worker**: Process health check (Docker HEALTHCHECK)

### Logs

```bash
# Docker Compose
docker-compose logs -f app
docker-compose logs -f worker

# Produção (se usar journald)
journalctl -u docker -f | grep zillowlike
```

### Sentry (Error Tracking)

1. Criar projeto em https://sentry.io/
2. Copiar DSN
3. Adicionar ao `.env`:
   ```env
   SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
   NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
   ```

### Uptime Monitoring

Recomendações:
- **UptimeRobot**: https://uptimerobot.com/ (gratuito)
- **Better Uptime**: https://betteruptime.com/
- Configure para monitorar `/api/health`

---

## 🔒 7. Segurança em Produção

### Checklist

- [ ] Variáveis de ambiente usando secrets manager
- [ ] SSL/TLS habilitado (HTTPS)
- [ ] Firewall configurado (apenas portas necessárias)
- [ ] Rate limiting habilitado ✅ (já implementado)
- [ ] Security headers ✅ (já implementado)
- [ ] Backup automático do banco
- [ ] Monitoramento de erros (Sentry) ✅
- [ ] Logs centralizados (CloudWatch/DataDog)

### Backup do Banco de Dados

```bash
# Backup manual
docker-compose exec postgres pg_dump -U postgres zillowlike > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres zillowlike < backup.sql

# Backup automatizado (cron)
0 2 * * * docker-compose exec postgres pg_dump -U postgres zillowlike | gzip > /backups/zillowlike-$(date +\%Y\%m\%d).sql.gz
```

---

## 🆘 Troubleshooting

### Prisma Client Error
```bash
# Regenerar cliente
docker-compose exec app npx prisma generate
docker-compose restart app
```

### Worker não processa jobs
```bash
# Verificar logs
docker-compose logs worker

# Verificar conexão Redis
docker-compose exec redis redis-cli ping
# Esperado: PONG
```

### Permissões (EPERM error no Windows)
```bash
# Parar dev server antes de rodar prisma generate
# Ou rodar em terminal administrativo
```

### Migrations falham
```bash
# Ver status
docker-compose exec app npx prisma migrate status

# Resetar (⚠️ apaga dados)
docker-compose exec app npx prisma migrate reset

# Aplicar manualmente
docker-compose exec app npx prisma migrate deploy
```

---

## 📚 Recursos Úteis

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/deployment/production-best-practices)
- [BullMQ Production Setup](https://docs.bullmq.io/guide/going-to-production)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Upstash Redis](https://upstash.com/docs/redis)

---

**🎉 Parabéns! Seu app está pronto para produção!**

**Dúvidas? Verifique:**
- `IMPLEMENTATION_STATUS.md` - Status geral
- `SESSION_SUMMARY.md` - Como testar localmente
- `FINAL_IMPLEMENTATION_SUMMARY.md` - Resumo completo
