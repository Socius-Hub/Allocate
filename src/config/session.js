/**
 * Configuração da sessão (express-session).
 * - Em Postgres (Render) as sessões ficam salvas no banco (tabela "session"),
 *   então o usuário não é deslogado quando o servidor reinicia.
 * - Em MySQL (offline) usa a memória do processo, suficiente para testes.
 */
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool, isPostgres } from './database.js';

const producao = process.env.NODE_ENV === 'production';

if (producao && !process.env.SESSION_SECRET) {
  console.warn('[sessão] SESSION_SECRET não definido! Defina essa variável de ambiente no Render.');
}

export function criarSessao() {
  const opcoes = {
    secret: process.env.SESSION_SECRET || 'dev-segredo-troque-isto',
    resave: false,
    saveUninitialized: false,
    name: 'allocate.sid',
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: producao, // no Render o site é HTTPS
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    },
  };

  if (isPostgres) {
    const PgStore = connectPgSimple(session);
    opcoes.store = new PgStore({ pool, tableName: 'session', createTableIfMissing: true });
  }

  return session(opcoes);
}