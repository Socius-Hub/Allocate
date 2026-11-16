/*

  OBS: Este arquivo é responsável por fornecer os controladores para gerenciar as rotas públicas do sistema,
       incluindo a exibição da página inicial, catálogo de eventos e detalhes de eventos específicos.

*/

import { EventoModel, TierModel } from "../models/EventoModel.js";
import { CategoriaModel } from "../models/CadastrosModel.js";
import {
  controller,
  idParam,
  naoEncontrado,
  paginacao,
  montarQuery,
} from "../utils/http.js";

/* Renderiza a página inicial (home) do portal público
e carrega os eventos em destaque (limitados a 3), a contagem total de eventos públicos e as categorias*/
export const PublicController = controller({
  async home(req, res) {
    // Executa buscas paralelas para obter os eventos em destaque, contagem total e categoria
    const [eventos, total, categorias] = await Promise.all([
      EventoModel.listar({ publico: true }, { limite: 3 }),
      EventoModel.contar({ publico: true }),
      CategoriaModel.listar(),
    ]);
    res.render("publico/home", {
      titulo: "Início",
      eventos,
      totalEventos: total,
      categorias,
    });
  },

  //Renderiza o catálogo público de eventos com suporte a filtros
  async catalogo(req, res) {
    // Configura os filtros ativos com base nos parâmetros da query string
    const filtrosAtivos = {
      id_cat_evento: idParam(req.query.categoria),
      busca: (req.query.busca || "").trim(),
    };

    // Configura a paginação exibindo 9 itens por página
    const f = { ...filtrosAtivos, publico: true };

    const { pagina, porPagina, offset } = paginacao(req);
    
    // Executa buscas paralelas para obter eventos filtrados e paginados, contagem e categorias
    const [eventos, total, categorias] = await Promise.all([
      EventoModel.listar(f, { limite: porPagina, offset }),
      EventoModel.contar(f),
      CategoriaModel.listar(),
    ]);
    res.render("publico/catalogo", {
      titulo: "Catálogo de Eventos",
      eventos,
      categorias,
      total,
      pagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
      linkPagina: (p) =>
        montarQuery(
          { categoria: req.query.categoria, busca: req.query.busca },
          { pagina: p },
        ),
    });
  },

  //Exibe os detalhes públicos de um evento específico
  async detalheEvento(req, res) {
    const id = idParam(req.params.id);
    const evento = id && (await EventoModel.buscarPorId(id));

    // Valida se o evento existe e se o status não é 'CANCELADO'
    if (!evento || evento.status === "CANCELADO") throw naoEncontrado("Evento");

    // Lista apenas os tiers que não estão em modo rascunho
    const tiers = (await TierModel.listarPorEvento(id)).filter(
      (t) => t.status !== "RASCUNHO",
    );
    res.render("publico/evento", { titulo: evento.nome, evento, tiers });
  },
});