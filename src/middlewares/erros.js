/*

  OBS: Middleware de Tratamento de Erros e Rotas Não Encontradas
       Fornece um gestor global de exceções para capturar erros na aplicação Express,
       garantindo respostas amigáveis ao utilizador e registo adequado de falhas no servidor

*/

import { mensagemErroBanco } from "../utils/http.js";

// Middleware para tratamento de rotas não encontradas (Erro 404) 
export function paginaNaoEncontrada(req, res) {
  res.status(404).render("404", { titulo: "Página não encontrada" });
}

/* Middleware central de tratamento de erros da aplicação
Captura qualquer exceção não tratada nas rotas, define variáveis de segurança no `res.locals` */
export function tratarErros(err, req, res, next) {
  // Define o código de status HTTP (utiliza o status do erro ou 500 por predefinição)
  const status = err.status || 500;

  // Se os cabeçalhos já foram enviados ao cliente, é enviado para o gestor de erros padrão do Express
  if (res.headersSent) return next(err);

  // garante as variáveis usadas pelo layout, caso o erro ocorra antes do middleware de locals
  res.locals.usuarioLogado ??= req.session?.usuario || null;
  res.locals.caminho ??= req.path;
  res.locals.flash ??= [];
  res.locals.query ??= req.query;
  // Regista erros internos graves (status 500 ou superior) na consola do servidor para depuração
  if (status >= 500) console.error("[erro]", req.method, req.originalUrl, err);

  // Tratamento específico para páginas não encontradas geradas via exceção
  if (status === 404)
    return res
      .status(404)
      .render("404", { titulo: "Não encontrado", mensagem: err.message });

  // Determinação inteligente da mensagem de erro a exibir ao utilizador
  const mensagem = err.status
    ? err.message
    : mensagemErroBanco(err) ||
      ([
        "ECONNREFUSED",
        "ENOTFOUND",
        "ETIMEDOUT",
        "28P01",
        "ER_ACCESS_DENIED_ERROR",
      ].includes(err.code)
        ? "Não foi possível conectar ao banco de dados. Tente novamente em instantes."
        : "Ocorreu um erro inesperado. Tente novamente mais tarde.");

  // Renderiza a página de erro com o status correspondente e a mensagem tratada
  res.status(status).render("erro", { titulo: "Erro", status, mensagem });
}