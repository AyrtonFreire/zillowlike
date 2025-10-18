# 🐳 Docker (Opcional - Self-Hosting)

O projeto **NÃO requer Docker** para desenvolvimento ou deploy em produção.

---

## 🎯 Deploy Recomendado: Serverless (Sem Docker)

A stack foi projetada para rodar em plataformas serverless:

| Componente | Serviço | Custo |
|------------|---------|-------|
| **App Next.js** | Vercel/Railway | Gratuito até 100GB bandwidth |
| **PostgreSQL** | Supabase | Gratuito até 500MB |
| **Redis** | Upstash | Gratuito até 10k commands/day |
| **Imagens** | Cloudinary | Gratuito até 25k créditos/mês |
| **Auth** | NextAuth + OAuth | Gratuito |
| **Notificações** | Pusher | Gratuito até 200k mensagens/dia |

**Total:** R$ 0/mês para ambiente beta/staging

---

## 🐳 Quando Usar Docker?

Use Docker apenas se você precisa de:

1. **Self-hosting completo** (VPS própria)
2. **Controle total sobre infraestrutura**
3. **Compliance/regulatório** que exige dados on-premise
4. **Customizações profundas** no banco/Redis

---

## 📦 Arquivos Docker no Projeto

O repositório contém configuração Docker para self-hosting:

- `docker-compose.yml` - Orquestração completa (app + postgres + redis + workers)
- `Dockerfile` - Build da aplicação Next.js
- `Dockerfile.worker` - Build dos workers BullMQ

---

## 🚀 Como usar Docker (Self-Hosting)

### Pré-requisitos

- Docker Desktop instalado
- Docker Compose

### Configuração

1. **Edite `.env` com credenciais locais:**

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=zillowlike

DATABASE_URL=postgresql://postgres:postgres@postgres:5432/zillowlike?schema=public
REDIS_HOST=redis
REDIS_PORT=6379

NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=gere-um-secret-aleatorio

# Resto das credenciais (Cloudinary, OAuth, etc.)
```

2. **Inicie todos os serviços:**

```bash
docker-compose up -d
```

Isso inicia:
- ✅ PostgreSQL (porta 5432)
- ✅ Redis (porta 6379)
- ✅ App Next.js (porta 3001)
- ✅ Workers BullMQ (2 réplicas)

3. **Rode migrations:**

```bash
docker-compose exec app npx prisma migrate deploy
```

4. **Crie admin:**

```bash
docker-compose exec app npm run create-admin
```

5. **Acesse:**

`http://localhost:3001`

### Logs

```bash
# Todos os serviços
docker-compose logs -f

# Apenas app
docker-compose logs -f app

# Apenas workers
docker-compose logs -f worker
```

### Parar

```bash
docker-compose down

# Com volumes (apaga banco)
docker-compose down -v
```

---

## ⚠️ Limitações do Docker em Produção

- **Escalabilidade:** Requer orquestração (Kubernetes) para escalar
- **Custos:** VPS/servidor dedicado necessário (mín R$ 30-50/mês)
- **Manutenção:** Você é responsável por backups, updates, segurança
- **Complexidade:** Mais complexo que serverless para iniciantes

---

## 🎯 Recomendação Final

Para **beta/staging e produção inicial**, use a stack serverless documentada em **[DEPLOY_BETA.md](./DEPLOY_BETA.md)**.

Migre para Docker/self-hosting apenas quando:
- Tiver > 10 mil usuários ativos
- Precisar de customizações avançadas
- Custo serverless exceder custo de VPS
- Tiver equipe DevOps dedicada

---

**TL;DR:** Docker é opcional e desnecessário para a maioria dos casos. Use Vercel + Supabase + Upstash.
