# 🌱 GUIA DE SEED DO BANCO DE DADOS

## 📋 **RESUMO**

Devido à complexidade do schema do Prisma, vou fornecer um guia manual para popular o banco de dados via Prisma Studio, que é mais visual e fácil.

---

## 🚀 **PASSO A PASSO**

### **1. Abrir Prisma Studio**

```bash
npm run prisma:studio
```

Isso abrirá uma interface web em `http://localhost:5555`

---

### **2. Criar Usuários de Teste**

Clique em **User** e adicione os seguintes usuários:

#### **Admin**
- email: `admin@zillowlike.com`
- name: `Admin Master`
- role: `ADMIN`
- emailVerified: `[Data atual]`

#### **Corretor 1**
- email: `corretor1@zillowlike.com`
- name: `João Silva`
- role: `REALTOR`
- emailVerified: `[Data atual]`

#### **Corretor 2**
- email: `corretor2@zillowlike.com`
- name: `Maria Santos`
- role: `REALTOR`
- emailVerified: `[Data atual]`

#### **Proprietário 1**
- email: `proprietario1@zillowlike.com`
- name: `Carlos Oliveira`
- role: `OWNER`
- emailVerified: `[Data atual]`

#### **Proprietário 2**
- email: `proprietario2@zillowlike.com`
- name: `Ana Costa`
- role: `OWNER`
- emailVerified: `[Data atual]`

#### **Usuário Comum**
- email: `usuario@zillowlike.com`
- name: `Pedro Almeida`
- role: `USER`
- emailVerified: `[Data atual]`

---

### **3. Criar Imóveis**

Clique em **Property** e adicione imóveis:

#### **Imóvel 1 - Casa Moderna**
- title: `Casa Moderna com Piscina - Petrolina`
- description: `Linda casa moderna com 4 quartos, piscina, churrasqueira`
- price: `85000000` (R$ 850.000,00 em centavos)
- type: `HOUSE`
- status: `ACTIVE`
- street: `Rua das Flores, 123`
- city: `Petrolina`
- state: `PE`
- postalCode: `56300-000`
- latitude: `-9.3891`
- longitude: `-40.5008`
- bedrooms: `4`
- bathrooms: `3`
- parkingSpots: `2`
- areaM2: `250`
- ownerId: `[ID do proprietario1]`

#### **Imóvel 2 - Apartamento Luxuoso**
- title: `Apartamento Luxuoso Centro - Juazeiro`
- description: `Apartamento de alto padrão com 3 suítes`
- price: `45000000` (R$ 450.000,00)
- type: `APARTMENT`
- status: `ACTIVE`
- street: `Avenida Principal, 456`
- city: `Juazeiro`
- state: `BA`
- postalCode: `48900-000`
- latitude: `-9.4114`
- longitude: `-40.5050`
- bedrooms: `3`
- bathrooms: `3`
- parkingSpots: `2`
- areaM2: `120`
- ownerId: `[ID do proprietario1]`

#### **Imóvel 3 - Terreno Comercial**
- title: `Terreno Comercial - Petrolina`
- description: `Excelente terreno comercial em localização privilegiada`
- price: `32000000` (R$ 320.000,00)
- type: `LAND`
- status: `ACTIVE`
- street: `Avenida Comercial, 789`
- city: `Petrolina`
- state: `PE`
- postalCode: `56302-000`
- latitude: `-9.3950`
- longitude: `-40.5100`
- areaM2: `500`
- ownerId: `[ID do proprietario2]`

#### **Imóvel 4 - Casa para Alugar**
- title: `Casa para Alugar - 3 Quartos`
- description: `Casa confortável para locação`
- price: `250000` (R$ 2.500,00/mês em centavos)
- type: `HOUSE`
- status: `ACTIVE`
- street: `Rua Residencial, 321`
- city: `Petrolina`
- state: `PE`
- postalCode: `56304-000`
- latitude: `-9.3800`
- longitude: `-40.4900`
- bedrooms: `3`
- bathrooms: `2`
- parkingSpots: `1`
- areaM2: `150`
- ownerId: `[ID do proprietario2]`

---

### **4. Adicionar Imagens aos Imóveis**

Clique em **Image** e adicione imagens para cada imóvel:

#### **Para Imóvel 1:**
- url: `https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800`
- propertyId: `[ID do property1]`
- order: `0`

- url: `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800`
- propertyId: `[ID do property1]`
- order: `1`

#### **Para Imóvel 2:**
- url: `https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800`
- propertyId: `[ID do property2]`
- order: `0`

#### **Para Imóvel 3:**
- url: `https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800`
- propertyId: `[ID do property3]`
- order: `0`

#### **Para Imóvel 4:**
- url: `https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800`
- propertyId: `[ID do property4]`
- order: `0`

---

## 🔑 **COMO FAZER LOGIN**

1. **Faça login com Google OAuth** usando qualquer email
2. **Use o script para definir o role:**

```bash
npm run set-role seu@email.com ADMIN
```

Roles disponíveis: `USER`, `ADMIN`, `REALTOR`, `OWNER`

3. **Faça logout e login novamente** para aplicar as mudanças

---

## ✅ **CHECKLIST DE TESTE**

Após popular o banco, teste:

- [ ] Login como ADMIN → deve ir para `/admin`
- [ ] Login como REALTOR → deve ir para `/realtor`
- [ ] Login como OWNER → deve ir para `/owner`
- [ ] Login como USER → deve ir para `/dashboard`
- [ ] Visualizar imóveis na homepage
- [ ] Buscar imóveis
- [ ] Ver detalhes de um imóvel
- [ ] Favoritar imóveis (se logado)
- [ ] Botão de logout funciona
- [ ] Dark mode toggle funciona

---

## 🎯 **DICA RÁPIDA**

Se quiser popular rapidamente, use apenas 2-3 imóveis para começar. Você pode adicionar mais depois conforme necessário para testar funcionalidades específicas.

---

**Boa sorte com os testes! 🚀**
