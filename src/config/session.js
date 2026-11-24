/*

  OBS: Este arquivo é responsável por configurar a sessão do utilizador com suporte a PostgreSQL

*/

import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./database.js";

// Verifica se a aplicação está a executar em ambiente de produção (ex: Render)
const producao = process.env.NODE_ENV === "production";

// Alerta de segurança caso o segredo que assina o cookie da sessão não esteja definido no servidor
if (producao && !process.env.SESSION_SECRET) {
  console.warn(
    "[sessão] SESSION_SECRET não definido! Defina essa variável de ambiente no Render.",
  );
}

// Cria e configura a instância do middleware de gestão de sessões
export function criarSessao() {
  const opcoes = {
    secret: process.env.SESSION_SECRET || "dev-segredo-troque-isto",
    resave: false,
    saveUninitialized: false,
    name: "allocate.sid",
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: producao, // no Render o site é HTTPS
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    },
  };

  // Guarda as sessões na tabela "session" do PostgreSQL (o login sobrevive a reinícios do servidor)
  const PgStore = connectPgSimple(session);
  opcoes.store = new PgStore({
    pool,
    tableName: "session",
    createTableIfMissing: true,
  });

  // Retorna o middleware configurado para ser utilizado na aplicação Express
  return session(opcoes);
}