# Allocate

Aplicação web para **gestão de eventos, inscrições e orçamento por departamento**.
Node.js + Express + EJS, padrão **MVC**, com autenticação por sessão e senhas com **bcrypt**.
Banco relacional **PostgreSQL** (produção / Render) ou **MySQL** (testes offline).

## Funcionalidades

| Área | Rotas | Acesso |
|---|---|---|
| Início e catálogo de eventos | `/`, `/catalogo`, `/catalogo/:id` | Público |
| Login e cadastro | `/login`, `/registro` | Público |
| Painel | `/dashboard` | Logado |
| Eventos (CRUD) + tiers de inscrição (CRUD) | `/eventos`, `/eventos/:id/tiers` | Logado |
| Inscrições (criar, listar, cancelar) | `/inscricoes` | Logado (colaborador vê só as próprias) |
| Simulador de orçamento (cenários e itens) | `/simulador-orcamento` | Logado (aprovar cenário: admin) |
| Orçamento por departamento + exportação CSV | `/orcamento-departamento` | Logado (editar: admin) |
| Fila de aprovações (debita/estorna o orçamento) | `/aprovacoes` | Administrador |
| Usuários (CRUD) | `/funcionarios` | Administrador |
| Categorias, departamentos, ciclos e troca de senha | `/configuracoes` | Logado (cadastros: admin) |

**Usuários de teste** (criados automaticamente):

| E-mail | Senha | Perfil |
|---|---|---|
| admin@allocate.com | admin123 | Administrador |
| ana.souza@allocate.com | senha123 | Usuário |

Quem se cadastra por `/registro` recebe o perfil **Usuário**.

## Estrutura (MVC)

```
app.js                    # ponto de entrada: configura Express, EJS, sessão e rotas
database/
  postgres/schema.sql     # tabelas, trigger e views (PostgreSQL / Render)
  mysql/schema.sql        # mesma estrutura em MySQL (offline)
  seed.sql                # dados de exemplo (serve para os dois bancos)
src/
  config/                 # conexão com o banco, sessão e criação automática das tabelas
  models/                 # acesso ao banco (SQL)
  controllers/            # regras de negócio e validação dos formulários
  routes/                 # publicRoutes.js (sem login) e privateRoutes.js (com login)
  middlewares/            # exigirLogin, exigirAdmin, mensagens flash e tratamento de erros
  views/                  # páginas EJS (+ partials)
  public/                 # CSS e JS estáticos
  utils/                  # formatação (moeda/data), validação e helpers
```

## Rodando localmente

Pré-requisito: Node.js 20 ou superior.

```bash
npm install
cp .env.example .env      # no Windows: copy .env.example .env
```

Edite o `.env` com os dados do seu banco e rode:

```bash
npm run dev               # ou: npm start
```

Acesse http://localhost:3000. Na primeira execução as tabelas e os dados de exemplo são criados sozinhos.
No MySQL, o database `allocate_db` também é criado automaticamente.

| Comando | O que faz |
|---|---|
| `npm run dev` | inicia e reinicia ao salvar arquivos |
| `npm run db:init` | cria as tabelas se não existirem |
| `npm run db:reset` | **apaga tudo** e recria com os dados de exemplo |

Se preferir rodar o SQL na mão (MySQL Workbench): execute `database/mysql/schema.sql` e depois `database/seed.sql`
dentro do database `allocate_db`.

## Deploy no Render (PostgreSQL)

1. Suba o projeto para um repositório no GitHub (o `.env` **não** vai, ele está no `.gitignore`).
2. No Render: **New + → Blueprint** e selecione o repositório.
   O arquivo `render.yaml` cria o **PostgreSQL** e o **Web Service** e já configura as variáveis
   `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV` e `DB_CLIENT`.
3. Aguarde o deploy. Na primeira inicialização as tabelas são criadas automaticamente (veja os logs: `[db] Banco pronto.`).

<details>
<summary>Sem Blueprint (configuração manual)</summary>

1. **New + → PostgreSQL** (plano Free). Copie a **Internal Database URL**.
2. **New + → Web Service** com o repositório:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     - `DATABASE_URL` = Internal Database URL copiada
     - `DB_CLIENT` = `postgres`
     - `SESSION_SECRET` = um texto longo e aleatório
     - `NODE_ENV` = `production`
</details>

Para acessar o banco do Render pelo seu computador (ex: `npm run db:reset`), use a **External Database URL**
no `.env` com `DB_CLIENT=postgres` e `DB_SSL=true`.

## Segurança e boas práticas aplicadas

- Senhas com hash **bcrypt** (10 rounds) e regras mínimas (8+ caracteres, letras e números).
- Sessão com cookie `httpOnly`, `sameSite=lax` e `secure` em produção. No Postgres a sessão fica salva no banco.
- Rotas privadas protegidas pelo middleware `exigirLogin`; áreas administrativas por `exigirAdmin`.
- Credenciais apenas em variáveis de ambiente (`.env` / painel do Render).
- Consultas parametrizadas (sem concatenar valores do usuário no SQL) e saída escapada pelo EJS (`<%= %>`).
- Validação no navegador **e** no servidor, com mensagens por campo e páginas de erro amigáveis (404/403/500).
- Regras de negócio no banco: `CHECK`, `UNIQUE`, chaves estrangeiras, trigger de capacidade de inscrição e views de relatório.
