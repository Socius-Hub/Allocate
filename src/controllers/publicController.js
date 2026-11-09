import { EventoModel, TierModel } from '../models/EventoModel.js';
//import { CategoriaModel } from '../models/CadastrosModel.js';
import { controller, idParam, naoEncontrado, paginacao, montarQuery } from '../utils/http.js';

/** Páginas acessíveis sem login. */
export const PublicController = controller({
  async home(req, res) {
    const [eventos, total, categorias] = await Promise.all([
      EventoModel.listar({ publico: true }, { limite: 3 }),
      EventoModel.contar({ publico: true }),
      CategoriaModel.listar(),
    ]);
    res.render('publico/home', { titulo: 'Início', eventos, totalEventos: total, categorias });
  },

  async catalogo(req, res) {
    const filtrosAtivos = {
      id_cat_evento: idParam(req.query.categoria),
      busca: (req.query.busca || '').trim(),
    };
    const { pagina, porPagina, offset } = paginacao(req, 9);
    const f = { ...filtrosAtivos, publico: true };
    const [eventos, total, categorias] = await Promise.all([
      EventoModel.listar(f, { limite: porPagina, offset }),
      EventoModel.contar(f),
      CategoriaModel.listar(),
    ]);
    res.render('publico/catalogo', {
      titulo: 'Catálogo de Eventos',
      eventos,
      categorias,
      total,
      pagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
      linkPagina: (p) => montarQuery({ categoria: req.query.categoria, busca: req.query.busca }, { pagina: p }),
    });
  },

  async detalheEvento(req, res) {
    const id = idParam(req.params.id);
    const evento = id && (await EventoModel.buscarPorId(id));
    if (!evento || evento.status === 'CANCELADO') throw naoEncontrado('Evento');
    const tiers = (await TierModel.listarPorEvento(id)).filter((t) => t.status !== 'RASCUNHO');
    res.render('publico/evento', { titulo: evento.nome, evento, tiers });
  },
});