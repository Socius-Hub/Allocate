/*

  Allocate - Ponto de Entrada Principal da Aplicação
    
  Proj. de Extensão III - 4° Bimestre TADs - 2026
 
  OBS: Configura e inicializa o servidor Express, motor de templates EJS, variáveis de ambiente,
       políticas de segurança, gestão de sessões, middlewares globais, rotas públicas e privadas,
       gestores de erros e a inicialização automática da base de dados antes de iniciar a escuta de conexões

*/

import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

import { DB_CLIENT } from "./src/config/database.js";
import { inicializarBanco } from "./src/config/initDB.js";
import { criarSessao } from "./src/config/session.js";
import { variaveisGlobais } from "./src/middlewares/variaveisGlobais.js";
import { paginaNaoEncontrada, tratarErros } from "./src/middlewares/erros.js";
import { fmt } from "./src/utils/formatadores.js";
import publicRoutes from "./src/routes/publicRoutes.js";
import privateRoutes from "./src/routes/privateRoutes.js";

// Configuração do diretório atual para suporte a módulos ES (ESM)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Inicialização da instância do Express e definição da porta do servidor
const app = express();
const PORT = process.env.PORT || 8081;

// CONFIG. DA VIEW ENGINE (EJS)

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

// Disponibiliza globalmente o utilitário de formatação `fmt` em todas as views EJS
app.locals.fmt = fmt;

// CONFIG. DE SEGURANÇA E AMBIENTE

// O Render e outros PaaS ficam atrás de um proxy HTTPS: necessário para ativar o cookie "secure" da sessãoapp.set("trust proxy", 1);
app.disable("x-powered-by");

// MIDDLEWARES GLOBAIS

app.use(
  express.static(path.join(__dirname, "src", "public"), { maxAge: "1d" }),
);

// Parser de dados de formulários URL-encoded com limite de tamanho de segurança (100kb)
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Configuração e gestão de sessões baseadas em cookies
app.use(criarSessao());

// Injeção de variáveis globais e mensagens flash nas requisições e views
app.use(variaveisGlobais);

// REGISTROS DE ROTAS E MIDDLEWARES DE ERRO
// Endpoint de verificação de saúde da aplicação
app.get("/healthz", (req, res) => res.send("ok"));
app.use(publicRoutes);
app.use(privateRoutes);

// gestão centralizada de erros e rotas não encontradas
app.use(paginaNaoEncontrada);

// Middleware global de tratamento de exceções e erros do servidor
app.use(tratarErros);

// INICIALIZAÇÃO DO SERVIDOR E BASE DE DADOS

/* Função assíncrona responsável por preparar a base de dados (caso a auto-inicialização esteja ativa)
e colocar o servidor Express a escutar conexões na porta especificada */
async function iniciar() {

  if (!process.env.DATABASE_URL) {
    console.error('[db] DATABASE_URL não definido. Configure o arquivo .env (veja .env.example).');
  } else if (process.env.DB_AUTO_INIT !== 'false') {
    try {
      await inicializarBanco();
    } catch (err) {
      console.error(`[db] Não foi possível preparar o banco (${DB_CLIENT}):`, err.message || err.code || err);
      console.error('[db] Verifique as variáveis de ambiente no arquivo .env (veja .env.example).');
    }
  }
  app.listen(PORT, () =>
    console.log(
      `Allocate rodando em http://localhost:${PORT} (banco: ${DB_CLIENT})`,
    ),
  );
}

//Executa o arranque da aplicação
iniciar();