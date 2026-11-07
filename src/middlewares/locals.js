import { ehAdmin } from './auth.js';

/**
 * Disponibiliza para todas as views:
 *  - usuarioLogado / isAdmin
 *  - flash: mensagens de sucesso/erro que sobrevivem a um redirect
 *  - caminho: URL atual (para destacar o menu)
 */
export function variaveisGlobais(req, res, next) {
  req.flash = (tipo, mensagem) => {
    req.session.flash = req.session.flash || [];
    req.session.flash.push({ tipo, mensagem });
  };

  res.locals.flash = req.session.flash || [];
  delete req.session.flash;

  res.locals.usuarioLogado = req.session.usuario || null;
  res.locals.isAdmin = ehAdmin(req.session.usuario);
  res.locals.caminho = req.path;
  res.locals.query = req.query;
  res.locals.erros = {};
  res.locals.dados = {};
  next();
}
