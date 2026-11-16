/*

  OBS: Middlewares de proteção e controle de acesso baseados na sessão do utilizador
       Fornecem validações para restringir rotas a utilizadores autenticados, administradores, 
       ou impedir que utilizadores já logados acedam a páginas públicas de autenticação

*/

//Identificador textual da role de Administrador no sistema
export const PERFIL_ADMIN = "Administrador";

//Verifica se um determinado utilizador possui o perfil de Administrador
export const ehAdmin = (usuario) => usuario?.perfil === PERFIL_ADMIN;

// Middleware de autenticação: Bloqueia o acesso a rotas protegidas para visitantes não autenticados
export function exigirLogin(req, res, next) {
  if (req.session?.usuario) return next();

  req.flash("erro", "Faça login para acessar essa página.");

  // Se o método for GET, codifica e preserva o URL original para redirecionar o utilizador após efetuar login
  const voltar =
    req.method === "GET"
      ? `?voltar=${encodeURIComponent(req.originalUrl)}`
      : "";
  return res.redirect(`/login${voltar}`);
}

// Middleware de autorização: Permite o acesso apenas a utilizadores com perfil de Administrador
export function exigirAdmin(req, res, next) {
  if (ehAdmin(req.session?.usuario)) return next();
  res.status(403);
  return res.render("erro", {
    titulo: "Acesso negado",
    status: 403,
    mensagem: "Apenas administradores podem acessar essa funcionalidade.",
  });
}

/* Middleware restritivo para visitantes: Utilizadores que já se encontram autenticados
são automaticamente redirecionados para o painel (dashboard), impedindo o acesso redundante
às páginas públicas de login ou registo */
export function apenasVisitante(req, res, next) {
  if (req.session?.usuario) return res.redirect("/dashboard");
  return next();
}