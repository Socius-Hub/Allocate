import { EventoModel } from '../models/EventoModel.js';
import { InscricaoModel } from '../models/InscricaoModel.js';
import { CicloModel, OrcamentoModel } from '../models/OrcamentoModel.js';
import { controller } from '../utils/http.js';

export const DashboardController = controller({
  async index(req, res) {
    const usuario = req.session.usuario;
    const ciclo = await CicloModel.ativo();

    const [resumo, statusInscricoes, proximos, minhasInscricoes, contagemEventos] = await Promise.all([
      ciclo ? OrcamentoModel.resumo(ciclo.id_ciclo) : { limite: 0, utilizado: 0, disponivel: 0 },
      InscricaoModel.contarPorStatus(),
      EventoModel.proximos(5),
      InscricaoModel.listar({ id_usuario: usuario.id_usuario }, { limite: 5 }),
      EventoModel.contarPorStatus(),
    ]);

    res.render('dashboard', {
      titulo: 'Painel de Controle',
      pagina: 'dashboard',
      ciclo,
      resumo,
      pendentes: statusInscricoes.SOLICITADO,
      proximos,
      minhasInscricoes,
      contagemEventos,
    });
  },
});
