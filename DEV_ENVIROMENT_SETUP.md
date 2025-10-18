# 🚀 Ambiente Beta/Staging: Primeiro Dia de Produção

## 📘 1. Contexto e Objetivo

O objetivo é criar um **ambiente de beta/staging limpo**, idêntico ao primeiro dia de produção, onde **usuários reais** testarão todas as funcionalidades sem dados fictícios.

### Esse ambiente servirá para:

- ✅ **Usuários reais** se cadastram, publicam imóveis e interagem naturalmente
- ✅ Testar fluxo completo: cadastro → publicação → leads → fila de corretores
- ✅ Validar integrações externas (Cloudinary, OAuth, Pusher) em cenário real
- ✅ Coletar feedback genuíno antes do lançamento público
- ✅ Ambiente **100% limpo**, sem dados fake ou usuários de teste

### Filosofia: "Primeiro dia de produção"

Este ambiente deve estar **pronto para receber o primeiro usuário real** como se fosse o lançamento oficial, mas em um ambiente isolado e controlado.

---

## 2. Perfis de Usuários e Acessos

| Tipo de usuário | Permissões | Exemplo de uso |
|-----------------|------------|----------------|
| **Administrador (você)** | Acesso total (criar usuários, resetar fila, limpar banco, monitorar logs) | Gerenciar ciclo de testes |
| **Corretor (beta tester)** | Criar conta, postar imóveis, atender leads, visualizar estatísticas | Testar experiência do corretor |
| **Usuário comum (pessoa física)** | Criar conta, postar imóvel próprio, ver listagens, entrar em contato | Testar experiência de proprietário |
| **Usuário anônimo (visitante)** | Ver listagens públicas | Testar SEO e UX pública |

---

## 3. Configuração Inicial

### 3.1. Clonar e Instalar Dependências

```bash
# Clone o repositório (substitua seu-usuario pelo seu username do GitHub)
git clone https://github.com/AyrtonFreire/zillowlike.git
cd zillowlike
npm install
```

### 3.2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```bash
cp .env.example .env.local
```

Edite `.env.local` com as configurações de desenvolvimento:

```env
# === DATABASE ===
DATABASE_URL="postgresql://user:password@localhost:5432/zillowlike_dev"

# === NEXTAUTH ===
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="seu-secret-super-seguro-aqui-min-32-chars"

# === OAUTH PROVIDERS (opcional em dev, mas recomendado) ===
GITHUB_ID="seu-github-oauth-app-id"
GITHUB_SECRET="seu-github-oauth-app-secret"

GOOGLE_CLIENT_ID="seu-google-client-id"
GOOGLE_CLIENT_SECRET="seu-google-client-secret"

# === CLOUDINARY (para upload de imagens) ===
CLOUDINARY_CLOUD_NAME="seu-cloud-name"
CLOUDINARY_API_KEY="sua-api-key"
CLOUDINARY_API_SECRET="seu-api-secret"

# === REDIS (para cache e filas) ===
REDIS_HOST="localhost"
REDIS_PORT="6379"
# OU use Redis Cloud gratuito:
# REDIS_URL="redis://default:password@host:port"

# === PUSHER (notificações em tempo real) ===
NEXT_PUBLIC_PUSHER_KEY="sua-pusher-key"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
PUSHER_APP_ID="seu-pusher-app-id"
PUSHER_SECRET="seu-pusher-secret"

# === TURNSTILE (captcha - opcional em dev) ===
NEXT_PUBLIC_TURNSTILE_SITE_KEY="seu-site-key"
TURNSTILE_SECRET_KEY="seu-secret-key"

# === NODE ENV ===
NODE_ENV="development"
```

---

## 4. Setup do Banco de Dados

### 4.1. Instalar PostgreSQL

**Opção 1: Supabase (RECOMENDADO para Windows - gratuito e sem instalar nada)**
1. Acesse https://supabase.com
2. Crie uma conta gratuita
3. Create new project (escolha senha forte)
4. Em **Settings → Database**, role até **Connection String** e copie a string **Connection Pooling** (modo `Transaction`)
5. Cole no `.env.local` como `DATABASE_URL`

Exemplo:
```env
DATABASE_URL="postgresql://postgres.[projeto]:[senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
```

**Opção 2: Local com Docker**

**PowerShell (Windows):**
```powershell
# Use backtick (`) para quebrar linha no PowerShell
docker run --name zillowlike-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=zillowlike_dev `
  -p 5432:5432 `
  -d postgres:15

# OU em uma linha:
docker run --name zillowlike-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=zillowlike_dev -p 5432:5432 -d postgres:15
```

**Bash/Terminal (Mac/Linux):**
```bash
docker run --name zillowlike-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=zillowlike_dev \
  -p 5432:5432 \
  -d postgres:15
```

Depois, edite `.env.local`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zillowlike_dev"
```

### 4.2. Rodar Migrations

```bash
npx prisma migrate dev
```

Isso criar:
- ✅ Todas as tabelas necessárias (users, properties, leads, realtorQueue, etc.)
- ✅ Índices de performance
- ✅ Banco **limpo e vazio**, pronto para receber dados reais

### 4.3. Validar Estrutura do Banco

Valide que o banco está pronto (sem criar dados fake):

```bash
npm run db:validate
```

Você verá:
```
✅ Database is ready and accessible!

📈 Current Stats:
   - Users: 0
   - Properties: 0
   - Leads: 0
   - Realtors in queue: 0

💡 This is a CLEAN database ready for REAL users!
```

### 4.4. Criar Primeiro Usuário Admin

Execute o script interativo:

```bash
npm run create-admin
```

Você será solicitado a informar:
- Nome completo
- Email (use seu email **real** do GitHub ou Google)

**Importante:** Use o mesmo email que você usará para fazer login via OAuth.

Exemplo:
```
Name: Ayrton Freire
Email: ayrton@gmail.com

✅ Admin user created successfully!

👤 Admin Details:
   Name:  Ayrton Freire
   Email: ayrton@gmail.com

🔑 Next Steps:
   1. Start the server: npm run dev
   2. Sign in with OAuth (GitHub/Google)
   3. Your role will automatically be ADMIN
```

---

## 5. Configurar Integrações Externas

### 5.1. Cloudinary (Upload de Imagens)

1. Acesse https://cloudinary.com e crie conta gratuita
2. Em Dashboard, copie:
   - Cloud Name
   - API Key
   - API Secret
3. Cole no `.env.local`
4. Teste upload em `/owner/new` após login

### 5.2. OAuth (Google/GitHub)

**GitHub:**
1. Acesse https://github.com/settings/developers
2. New OAuth App
3. Homepage URL: `http://localhost:3000`
4. Callback URL: `http://localhost:3000/api/auth/callback/github`
5. Copie Client ID e Client Secret

**Google:**
1. Acesse https://console.cloud.google.com
2. Crie novo projeto
3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copie Client ID e Client Secret

### 5.3. Redis (Cache e Filas)

**Opção 1: Upstash (RECOMENDADO - gratuito e sem instalar nada)**
1. Acesse https://upstash.com
2. Crie conta gratuita
3. Create Redis Database (escolha região mais próxima)
4. Copie a `UPSTASH_REDIS_REST_URL` e cole no `.env.local` como `REDIS_URL`

**Opção 2: Local com Docker**

**PowerShell (Windows):**
```powershell
docker run --name zillowlike-redis -p 6379:6379 -d redis:7
```

**Bash (Mac/Linux):**
```bash
docker run --name zillowlike-redis -p 6379:6379 -d redis:7
```

Depois, configure no `.env.local`:
```env
REDIS_HOST="localhost"
REDIS_PORT="6379"
```

### 5.4. Pusher (Notificações em Tempo Real)

1. Acesse https://pusher.com e crie conta gratuita
2. Create new app → Channels
3. Copie:
   - app_id
   - key (pública)
   - secret
   - cluster
4. Cole no `.env.local`

---

## 6. Iniciar o Ambiente

### 6.1. Modo Desenvolvimento (Hot Reload)

```bash
npm run dev
```

Acesse: http://localhost:3000

### 6.2. Workers de Fila (Terminal separado)

Para testar o sistema de distribuição de leads:

```bash
npm run worker
```

---

## 7. Roteiro de Testes com Usuários Reais

### 7.1. Preparação (Você como Admin)

- [ ] Fazer login com seu usuário admin
- [ ] Acessar `/admin/dashboard` e verificar que tudo está funcionando
- [ ] Verificar que as filas estão ativas (Redis/Pusher conectados)
- [ ] Testar criação de um imóvel próprio como teste
- [ ] Deletar o imóvel de teste

### 7.2. Convidar Beta Testers

**Perfil: Proprietário (Owner)**
- Pessoa que tem imóvel próprio para vender/alugar
- Testará: cadastro, publicação, upload de fotos, edição

**Perfil: Corretor (Realtor)**
- Corretor de imóveis real
- Testará: fila de atendimento, aceitação de leads, dashboard

**Perfil: Comprador (User)**
- Pessoa buscando imóvel
- Testará: busca, filtros, favoritos, envio de leads

### 7.3. Instruções para Beta Testers

**Email/Mensagem para enviar:**

> Olá! Você foi convidado para testar a plataforma [Nome] antes do lançamento oficial.
> 
> **Link:** https://seu-dominio-dev.vercel.app
> 
> **O que testar:**
> 1. Crie sua conta (pode usar Google/GitHub)
> 2. Complete seu perfil
> 3. [SE PROPRIETÁRIO] Publique um imóvel real com fotos
> 4. [SE CORRETOR] Entre na fila e aguarde leads
> 5. [SE COMPRADOR] Busque imóveis e envie mensagens
> 
> **Importante:** Este é um ambiente de testes. Dados podem ser resetados.
> 
> **Feedback:** Reporte bugs/sugestões em [seu email]

### 7.4. Monitoramento Durante Testes

**Como Admin, monitore:**

- [ ] Logs em tempo real (terminal do servidor)
- [ ] Prisma Studio para ver dados sendo criados
- [ ] Dashboard admin para métricas
- [ ] Fila de corretores (`/admin/queue-dashboard`)
- [ ] Erros no Sentry (se configurado)

### 7.5. Coleta de Feedback

**Perguntas-chave:**
- ✅ Cadastro foi intuitivo?
- ✅ Upload de imagens funcionou?
- ✅ Busca/filtros são úteis?
- ✅ [Corretor] Recebeu notificações em tempo real?
- ✅ Performance está boa?
- ✅ Algum bug ou comportamento estranho?

---

## 8. Fluxo E2E com Usuários Reais

### Cenário Real: "Proprietário publica → Comprador envia lead → Corretor atende"

**Participantes:**
- 👤 **Ana** (Proprietária com apartamento para vender)
- 👤 **Carlos** (Comprador procurando apartamento)
- 👤 **Júlia** (Corretora cadastrada na plataforma)
- 🔧 **Você** (Admin monitorando)

---

### Passo 1: Ana publica imóvel

1. Ana acessa a plataforma
2. Cria conta via Google
3. Vai em "Publicar Imóvel"
4. Preenche:
   - Endereço completo
   - Preço, quartos, banheiros
   - Descrição detalhada
5. Faz upload de 5 fotos do apartamento
6. Publica

**Você monitora:**
- Prisma Studio: novo registro em `properties`
- Imagens apareceram no Cloudinary
- Imóvel aparece no mapa

---

### Passo 2: Carlos se interessa

1. Carlos acessa sem login
2. Busca "São Paulo, 2 quartos"
3. Encontra o apartamento da Ana
4. Clica em "Entrar em contato"
5. Preenche nome, email, telefone e mensagem
6. Envia

**Você monitora:**
- Novo registro em `leads`
- Sistema distribuiu para fila
- Captcha Turnstile validou (se configurado)

---

### Passo 3: Júlia recebe o lead

1. Júlia está logada como corretora
2. Está na fila aguardando leads
3. **NOTIFICAÇÃO em tempo real** (Pusher)
4. Lead aparece reservado para ela (10 min)
5. Júlia vê:
   - Dados do imóvel
   - Contato do Carlos
   - Mensagem dele
6. Júlia aceita o lead
7. Sistema marca ela como "atendendo"

**Você monitora:**
- Fila funcionando (`/admin/queue-dashboard`)
- Júlia subiu na fila após aceitar
- Timer de 10 min foi respeitado

---

### Passo 4: Você analisa métricas

1. Acessa `/admin/dashboard`
2. Vê:
   - 1 imóvel publicado
   - 1 lead gerado
   - 1 lead aceito
   - Tempo médio de resposta
   - Taxa de conversão da fila

---

### ✅ Sucesso!

Fluxo completo testado com **pessoas reais** em ambiente controlado.

---

## 9. Troubleshooting

### Erro: "Database connection failed"

```bash
# Verificar se PostgreSQL está rodando
docker ps  # se usando Docker

# Testar conexão
npx prisma studio
```

### Erro: "Redis connection failed"

```bash
# Verificar se Redis está rodando
docker ps

# Ou comentar variáveis REDIS_* no .env.local para desabilitar
```

### Erro: "Upload de imagens falha"

- Verificar credenciais Cloudinary no `.env.local`
- Testar assinatura: `curl http://localhost:3000/api/upload/cloudinary-sign -X POST`

### OAuth não funciona

- Verificar callback URLs nas configurações do provider
- Deve ser exatamente: `http://localhost:3000/api/auth/callback/{provider}`
- Verificar Client ID/Secret no `.env.local`

### Fila não distribui leads

- Verificar se worker está rodando: `npm run worker`
- Verificar Redis conectado
- Ver logs do worker no terminal

---

## 10. Ferramentas de Debug

### Prisma Studio (Visualizar/Editar Banco)

```bash
npx prisma studio
```

Acesse: http://localhost:5555

### Redis Commander (Visualizar Cache/Filas)

```bash
npm install -g redis-commander
redis-commander
```

Acesse: http://localhost:8081

---

## 11. Scripts Úteis

### Resetar Banco (apaga tudo e recria)

```bash
npx prisma migrate reset
```

### Limpar Cache Redis

```bash
redis-cli FLUSHALL
```

---

## 12. Checklist Final

Antes de compartilhar com beta testers:

- Todos os serviços externos configurados e testados
- Seed executado com usuários de teste
- Fluxo E2E testado (proprietário → lead → corretor)
- Notificações em tempo real funcionando
- Upload de imagens OK
- Autenticação social (Google/GitHub) OK
- Sistema de fila distribuindo leads corretamente
- Responsividade mobile OK
- Logs estruturados habilitados
- Documentação compartilhada com testers

---

## Próximos Passos

1. **Coletar Feedback**: Use ferramentas como Hotjar, Google Analytics
2. **Monitorar Erros**: Configurar Sentry em staging
3. **Performance**: Testar com múltiplos usuários simultâneos
4. **Refinar UX**: Ajustar baseado no feedback
5. **Preparar Produção**: Ver `DEPLOYMENT_GUIDE.md`

---

## Suporte

- **Documentação Técnica**: Ver `FUNCOES_E_SISTEMAS.md`
- **Guia Rápido**: Ver `QUICK_START.md`
- **Issues**: Reportar em GitHub Issues

---

**Ambiente configurado com sucesso? Comece testando o fluxo E2E da seção 8!**