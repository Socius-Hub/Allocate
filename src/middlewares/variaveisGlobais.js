/*

  OBS: Middleware de Variáveis Globais e Mensagens Flash (variaveisGlobais).
       Responsável por injetar variáveis comuns e dados de sessão em `res.locals` para que fiquem 
       acessíveis globalmente em todas as views (templates), bem como gerir o sistema de mensagens flash
       
 */
import { ehAdmin } from "./auth.js";

// Middleware que inicializa variáveis globais de visualização e gere o sistema de mensagens flash por sessão
export function variaveisGlobais(req, res, next) {
  //Método auxiliar injetado no objeto `req` para registar mensagens flash temporárias na sessão
  req.flash = (tipo, mensagem) => {
    req.session.flash = req.session.flash || [];
    req.session.flash.push({ tipo, mensagem });
  };

  //Recupera as mensagens flash pendentes da sessão para exibi-las na view atual
  res.locals.flash = req.session.flash || [];
  // Apaga imediatamente as mensagens flash da sessão após recuperá-las (garante consumo único / ciclo de vida curto)
  delete req.session.flash;

  // Disponibiliza globalmente nas views os dados do utilizador autenticado e o status de privilégio de administrador
  res.locals.usuarioLogado = req.session.usuario || null;
  res.locals.isAdmin = ehAdmin(req.session.usuario);

  // Disponibiliza o caminho atual do URL e os parâmetros de consulta (query string) para navegação e breadcrumbs
  res.locals.caminho = req.path;
  res.locals.query = req.query;

  // Inicializa objetos padrão vazios para erros de validação e dados de formulários nas views, evitando falhas de referência
  res.locals.erros = {};
  res.locals.dados = {};

  // Prossegue para o próximo middleware ou rota da cadeia do Express
  next();
}