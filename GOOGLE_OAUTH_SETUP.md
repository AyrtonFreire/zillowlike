# Configuração do Google OAuth

## 1. Criar projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto ou selecione um existente
3. No menu lateral, vá em **APIs & Services** → **Credentials**

## 2. Configurar OAuth Consent Screen

1. Clique em **OAuth consent screen**
2. Escolha **External** (para permitir qualquer usuário do Google)
3. Preencha:
   - **App name**: Zillowlike
   - **User support email**: seu email
   - **Developer contact information**: seu email
4. Clique em **Save and Continue**
5. Em **Scopes**, adicione:
   - `userinfo.email`
   - `userinfo.profile`
6. Clique em **Save and Continue**
7. Em **Test users** (opcional para desenvolvimento), adicione emails de teste
8. Clique em **Save and Continue**

## 3. Criar OAuth 2.0 Client ID

1. Vá em **Credentials** → **Create Credentials** → **OAuth client ID**
2. Escolha **Application type**: Web application
3. Preencha:
   - **Name**: Zillowlike Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (desenvolvimento)
     - `https://seu-dominio.vercel.app` (produção)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (desenvolvimento)
     - `https://seu-dominio.vercel.app/api/auth/callback/google` (produção)
4. Clique em **Create**
5. **Copie** o **Client ID** e **Client Secret**

## 4. Configurar variáveis de ambiente

### Desenvolvimento (.env.local)

```bash
GOOGLE_CLIENT_ID=seu-client-id-aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret-aqui
```

### Produção (Vercel)

1. Acesse o dashboard da Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione:
   - `GOOGLE_CLIENT_ID`: cole o Client ID
   - `GOOGLE_CLIENT_SECRET`: cole o Client Secret
4. Marque **Production**, **Preview** e **Development**
5. Clique em **Save**

## 5. Redeploy

Após adicionar as variáveis na Vercel:
1. Vá em **Deployments**
2. Clique nos **3 pontos** do último deployment
3. Clique em **Redeploy**

## 6. Testar

1. Acesse seu site
2. Clique em **Login**
3. Deve aparecer o botão **Sign in with Google**
4. Faça login com uma conta Google
5. Você será redirecionado para a página de **Onboarding** para escolher seu perfil

## Remover GitHub OAuth (opcional)

Se quiser usar APENAS Google:

1. Remova as variáveis de ambiente:
   - `GITHUB_ID`
   - `GITHUB_SECRET`

2. Ou comente no código `src/lib/auth.ts`:
```typescript
// if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
//   providers.push(
//     GitHubProvider({
//       clientId: process.env.GITHUB_ID,
//       clientSecret: process.env.GITHUB_SECRET,
//     })
//   );
// }
```

## Troubleshooting

### Erro: redirect_uri_mismatch
- Verifique se a URL de redirect está EXATAMENTE igual no Google Console
- Formato: `https://seu-dominio.com/api/auth/callback/google`

### Google não aparece como opção
- Verifique se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão configurados
- Faça redeploy após adicionar as variáveis

### Erro 403: access_denied
- Adicione seu email em **Test users** no OAuth consent screen
- Ou publique o app (remova o status de teste)
