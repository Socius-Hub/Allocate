import { mensagemErroBanco } from '../utils/http.js';

/** Rota não encontrada. */
export function paginaNaoEncontrada(req, res) {
  res.status(404).render('404', { titulo: 'Página não encontrada' });
}

/** Tratamento central de erros: mostra uma página amigável em vez de travar o app. */
// eslint-disable-next-line no-unused-vars
export function tratarErros(err, req, res, next) {
  const status = err.status || 500;
  if (res.headersSent) return next(err);

  // garante as variáveis usadas pelo layout, caso o erro ocorra antes do middleware de locals
  res.locals.usuarioLogado ??= req.session?.usuario || null;
  res.locals.caminho ??= req.path;
  res.locals.flash ??= [];
  res.locals.query ??= req.query;
  if (status >= 500) console.error('[erro]', req.method, req.originalUrl, err);

  if (status === 404) return res.status(404).render('404', { titulo: 'Não encontrado', mensagem: err.message });

  const mensagem =
    err.status ? err.message
    : mensagemErroBanco(err) ||
      (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '28P01', 'ER_ACCESS_DENIED_ERROR'].includes(err.code)
        ? 'Não foi possível conectar ao banco de dados. Tente novamente em instantes.'
        : 'Ocorreu um erro inesperado. Tente novamente mais tarde.');

  res.status(status).render('erro', { titulo: 'Erro', status, mensagem });
}