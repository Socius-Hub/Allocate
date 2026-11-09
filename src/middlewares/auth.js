/**
 * Middlewares de proteção de rotas baseados na sessão.
 */

export const PERFIL_ADMIN = 'Administrador';

export const ehAdmin = (usuario) => usuario?.perfil === PERFIL_ADMIN;

/** Bloqueia a rota para visitantes não autenticados. */
export function exigirLogin(req, res, next) {
  if (req.session.usuario) return next();
  req.flash('erro', 'Faça login para acessar essa página.');
  const voltar = req.method === 'GET' ? `?voltar=${encodeURIComponent(req.originalUrl)}` : '';
  return res.redirect(`/login${voltar}`);
}

/** Permite apenas usuários com perfil Administrador. */
export function exigirAdmin(req, res, next) {
  if (ehAdmin(req.session.usuario)) return next();
  res.status(403);
  return res.render('erro', {
    titulo: 'Acesso negado',
    status: 403,
    mensagem: 'Apenas administradores podem acessar essa funcionalidade.',
  });
}

/** Páginas de login/registro: quem já está logado vai direto ao painel. */
export function apenasVisitante(req, res, next) {
  if (req.session.usuario) return res.redirect('/dashboard');
  return next();
}