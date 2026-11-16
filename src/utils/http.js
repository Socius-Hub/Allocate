/*

  OBS: Utilitários HTTP para Controladores (http.js).
  Fornece funções auxiliares para criar controladores de rotas Express,
  lida com erros HTTP, mensagens amigáveis de erros de banco de dados,
  conversão de parâmetros de URL, paginação e montagem de query strings
  
 */

//Envolve todos os métodos de um controller para enviar erros ao middleware de erro.
export function controller(obj) {
  const envolvido = {};
  for (const [nome, fn] of Object.entries(obj)) {
    envolvido[nome] = (req, res, next) =>
      Promise.resolve(fn(req, res, next)).catch(next);
  }
  return envolvido;
}

// Erro com status HTTP e mensagem amigável (ex: 404)
export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

//Cria um ErroHttp padrão do tipo 404 (Não Encontrado) para um determinado objeto ou registo
export const naoEncontrado = (o = "Registro") =>
  new ErroHttp(404, `${o} não encontrado.`);

//Converte códigos e tipos de erros conhecidos de base de dados em mensagens amigáveis para o utilizador
export function mensagemErroBanco(err) {
  switch (err?.tipo) {
    case "UNIQUE":
      return "Já existe um registro com esses dados (valor duplicado).";
    case "FK":
      return "Não é possível concluir: existem registros vinculados a este item.";
    case "CHECK":
      return "Algum valor informado não é permitido. Revise os campos.";
    case "REGRA":
      return err.message;
    default:
      return null;
  }
}

// Converte id da URL em inteiro positivo (ou null)
export function idParam(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

//Realiza o cálculo de paginação simples a partir do parâmetro de query `?pagina=`
export function paginacao(req, porPagina = 10) {
  const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
  return { pagina, porPagina, offset: (pagina - 1) * porPagina };
}

//Monta dinamicamente uma query string de URL preservando os filtros atuais e aplicando novas modificações
export function montarQuery(atual, mudancas = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...atual, ...mudancas })) {
    if (v !== undefined && v !== null && v !== "") params.set(k, v);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}
