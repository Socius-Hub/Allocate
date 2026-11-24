# Allocate

![Tela inicial do Allocate](Documentos/tela-inicial.png)

Aplicação web para **gestão de eventos, inscrições e orçamento por departamento**.
Node.js + Express + EJS, padrão **MVC**, com autenticação por sessão e senhas com **bcrypt**.
Banco de dados **PostgreSQL**.

🔗 **Versão publicada:** https://allocate-7fwu.onrender.com/
(plano gratuito do Render: o primeiro acesso depois de um tempo parado pode levar ~1 minuto)

## Funcionalidades

| Área | Rotas | Acesso |
|---|---|---|
| Início e catálogo de eventos | `/`, `/catalogo`, `/catalogo/:id` | Público |
| Login e cadastro | `/login`, `/registro` | Público |
| Painel | `/dashboard` | Logado |
| Meu perfil | `/perfil` | Logado |
| Eventos (CRUD) + tiers de inscrição (CRUD) | `/eventos`, `/eventos/:id/tiers` | Logado |
| Inscrições (criar, listar, cancelar) | `/inscricoes` | Logado (usuário comum vê só as próprias) |
| Simulador de orçamento (cenários e itens) | `/simulador-orcamento` | Logado (aprovar/excluir cenário: admin) |
| Orçamento por departamento + exportação CSV | `/orcamento-departamento` | Logado (editar: admin) |
| Fila de aprovações (debita/estorna o orçamento) | `/aprovacoes` | Administrador |
| Usuários (CRUD) | `/funcionarios` | Administrador |
| Categorias, departamentos, ciclos e troca de senha | `/configuracoes` | Logado (cadastros: admin) |

**Usuários de teste** (criados automaticamente com os dados de exemplo):

| E-mail | Senha | Nome | Perfil |
|---|---|---|---|
| admin@allocate.com | admin123 | Dr. Carlos Silva | Administrador |
| ana.souza@allocate.com | senha123 | Dra. Ana Souza | Usuário |
| roberto.lima@allocate.com | senha123 | Roberto Lima | Usuário |
| carlos.reis@allocate.com | senha123 | Carlos Reis | Usuário |

Quem se cadastra por `/registro` recebe o perfil **Usuário**.

## Estrutura (MVC)

```
app.js                    # ponto de entrada: configura Express, EJS, sessão e rotas
render.yaml               # Blueprint do Render (banco + web service)
Database/
  Postgres/schema.sql     # tabelas + views de relatório + triggers (instalação manual, opcional)
  MySQL/schema.sql        # versão MySQL do modelo, apenas como referência (o app não usa MySQL)
src/
  config/                 # conexão com o banco, sessão e criação automática das tabelas e dados (initDB.js)
  models/                 # acesso ao banco (SQL)
  controllers/            # regras de negócio e validação dos formulários
  routes/                 # publicRoutes.js (sem login) e privateRoutes.js (com login)
  middlewares/            # exigirLogin, exigirAdmin, mensagens flash e tratamento de erros
  views/                  # páginas EJS (+ partials)
  public/                 # CSS, JS e imagens estáticos
  scripts/db.js           # comandos npm run db:init / db:reset
  utils/                  # formatação (moeda/data), validação e helpers
```

## Rodando localmente

Pré-requisitos: **Node.js 20+** e um **PostgreSQL** acessível. Se você não tem o PostgreSQL instalado,
pode usar o Docker:

```bash
docker run -d --name allocate-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=allocate_db -p 5432:5432 postgres:16
```

Depois:

```bash
npm install
cp .env.example .env      # no Windows (PowerShell/cmd): copy .env.example .env
```

Edite o `.env` e ajuste o `DATABASE_URL`, por exemplo:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/allocate_db
```

E rode:

```bash
npm run dev               # ou: npm start
```

Acesse http://localhost:8081. Na primeira execução, as tabelas e os dados de exemplo são criados sozinhos
(no log: `[db] Dados iniciais inseridos com sucesso!`). O database (`allocate_db`) precisa existir antes.

### Variáveis de ambiente

| Variável | Para que serve | Padrão |
|---|---|---|
| `DATABASE_URL` | conexão com o PostgreSQL (**obrigatória**) | — |
| `SESSION_SECRET` | segredo que assina o cookie da sessão | texto fixo de desenvolvimento |
| `PORT` | porta do servidor | `8081` |
| `NODE_ENV` | `production` ativa cookie `secure` e SSL no banco | — |
| `DB_SSL` | `true` força SSL na conexão (necessário para acessar o banco do Render de fora) | `false` (ativado sozinho em produção) |
| `DB_AUTO_INIT` | `false` desliga a criação automática das tabelas/dados ao iniciar | `true` |

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | inicia e reinicia ao salvar arquivos |
| `npm start` | inicia o servidor |
| `npm run db:init` | cria as tabelas (e os dados de exemplo, se o banco estiver vazio) |
| `npm run db:reset` | **apaga todas as tabelas e dados** e recria com os dados de exemplo (também encerra as sessões abertas) |

### Views e triggers (opcional)

O app cria sozinho apenas as **tabelas** de que precisa. O arquivo `Database/Postgres/schema.sql` contém, além
delas, as **views de relatório** (`vw_usuarios_detalhes`, `vw_eventos_detalhes`, `vw_inscricoes_completas`,
`vw_orcamento_departamentos`) e os **triggers** de validação (capacidade de inscrição e itens de cenário).
Para instalá-los, execute esse arquivo no banco (ex: pelo pgAdmin, DBeaver ou `psql -f`).
Atenção: `npm run db:reset` apaga também as views e triggers — execute o `schema.sql` de novo depois.

## Deploy no Render (PostgreSQL)

1. Suba o projeto para um repositório no GitHub (o `.env` **não** vai, ele está no `.gitignore`).
2. No Render: **New + → Blueprint** e selecione o repositório.
   O arquivo `render.yaml` cria o **PostgreSQL** e o **Web Service** e já configura as variáveis
   `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV` e `DB_AUTO_INIT`.
3. Aguarde o deploy. Na primeira inicialização as tabelas são criadas automaticamente (veja os logs: `[db] Dados iniciais inseridos com sucesso!`).

Cada `push` na branch `main` gera um novo deploy automaticamente.

<details>
<summary>Sem Blueprint (configuração manual)</summary>

1. **New + → PostgreSQL** (plano Free). Copie a **Internal Database URL**.
2. **New + → Web Service** com o repositório:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/healthz`
   - Environment Variables:
     - `DATABASE_URL` = Internal Database URL copiada
     - `SESSION_SECRET` = um texto longo e aleatório
     - `NODE_ENV` = `production`
</details>

## Segurança e boas práticas aplicadas

- Senhas com hash **bcrypt** (10 rounds) e regras mínimas (8+ caracteres, letras e números).
- Sessão com cookie `httpOnly`, `sameSite=lax` e `secure` em produção, salva no banco (tabela `session`),
  então o login sobrevive a reinícios do servidor.
- Rotas privadas protegidas pelo middleware `exigirLogin`; áreas administrativas por `exigirAdmin`.
- Credenciais apenas em variáveis de ambiente (`.env` / painel do Render).
- Consultas parametrizadas (sem concatenar valores do usuário no SQL) e saída escapada pelo EJS (`<%= %>`).
- Validação no navegador **e** no servidor, com mensagens por campo e páginas de erro amigáveis (404/403/500).
  Violações de `UNIQUE`, chave estrangeira e `CHECK` viram mensagens para o usuário em vez de erro 500.
- Regras de negócio no banco: `CHECK`, `UNIQUE` e chaves estrangeiras; aprovação/rejeição de inscrições
  e exclusões ajustam o orçamento do departamento dentro de uma transação.
