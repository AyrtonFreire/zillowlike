# 🔐 Configuração de Variáveis de Ambiente

## Arquivo `.env`

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/zillowlike"

# NextAuth
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-secret-key-here"  # Gere com: openssl rand -base64 32

# Google OAuth (para NextAuth)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Pusher (Notificações em Tempo Real)
PUSHER_APP_ID="your-pusher-app-id"
NEXT_PUBLIC_PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
```

---

## 📝 Como Obter as Credenciais

### 1. **Database URL**
Já configurado se você está usando PostgreSQL local.

### 2. **NextAuth Secret**
Gere uma chave secreta:
```bash
openssl rand -base64 32
```

### 3. **Google OAuth**
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto
3. Ative a API "Google+ API"
4. Vá em "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3001/api/auth/callback/google`
6. Copie o Client ID e Client Secret

### 4. **Pusher (Notificações)**
1. Acesse [Pusher.com](https://pusher.com/)
2. Crie uma conta gratuita
3. Crie um novo app
4. Vá em "App Keys" e copie:
   - app_id
   - key
   - secret
   - cluster

---

## 🚀 Modo Demo (Sem Pusher)

Se você não quiser configurar Pusher agora, o sistema funcionará sem notificações em tempo real. As páginas ainda terão auto-refresh a cada 30 segundos.

Para desabilitar Pusher temporariamente, deixe as variáveis com valores demo:
```env
PUSHER_APP_ID="demo-app-id"
NEXT_PUBLIC_PUSHER_KEY="demo-key"
PUSHER_SECRET="demo-secret"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
```

---

## ✅ Verificar Configuração

Após configurar o `.env`, reinicie o servidor:
```bash
npm run dev:3001
```

Verifique se não há erros no console relacionados a variáveis de ambiente.
