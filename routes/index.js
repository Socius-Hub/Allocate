const express = require('express');
const router = express.Router();

// rota, view (.ejs), item ativo no menu, título e placeholder da busca
const paginas = [
  { rota: '/dashboard',              view: 'dashboard',              menu: 'dashboard',     titulo: 'Painel de Controle',         busca: 'Buscar eventos, funcionários...' },
  { rota: '/configuracoes',          view: 'configuracoes',          menu: 'configuracoes', titulo: 'Configurações do Sistema',   busca: 'Buscar configurações...' },
  { rota: '/aprovacoes',             view: 'aprovacoes',             menu: 'aprovacoes',    titulo: 'Fila de Aprovações',         busca: 'Buscar solicitações...' },
  { rota: '/aprovacao-detalhe',      view: 'aprovacao-detalhe',      menu: 'aprovacoes',    titulo: 'Detalhe da Solicitação',     busca: 'Buscar solicitações...' },
  { rota: '/simulador-orcamento',    view: 'simulador-orcamento',    menu: 'simulador',     titulo: 'Simulador de Orçamento',     busca: 'Buscar cenários...' },
  { rota: '/orcamento-departamento', view: 'orcamento-departamento', menu: 'orcamento',     titulo: 'Orçamento por Departamento', busca: 'Buscar departamentos, eventos...' },
  { rota: '/funcionarios',           view: 'funcionarios',           menu: 'funcionarios',  titulo: 'Perfis de Equipe',           busca: 'Buscar equipe, departamentos...' },
  { rota: '/funcionario-perfil',     view: 'funcionario-perfil',     menu: 'funcionarios',  titulo: 'Perfil do Funcionário',      busca: 'Buscar perfis, eventos...' },
  { rota: '/usuario-novo',           view: 'usuario-novo',           menu: 'funcionarios',  titulo: 'Novo Usuário',               busca: 'Buscar...' },
  { rota: '/inscricoes-lista',       view: 'inscricoes-lista',       menu: 'inscricoes',    titulo: 'Inscrições',                 busca: 'Buscar inscrições...' },
  { rota: '/inscricao-nova',         view: 'inscricao-nova',         menu: 'inscricoes',    titulo: 'Nova Inscrição',             busca: 'Buscar...' },
  { rota: '/eventos',                view: 'eventos',                menu: 'eventos',       titulo: 'Eventos',                    busca: 'Buscar eventos, categorias...' },
  { rota: '/evento-detalhes',        view: 'evento-detalhes',        menu: 'eventos',       titulo: 'Detalhes do Evento',         busca: 'Buscar...' },
  { rota: '/evento-novo',            view: 'evento-novo',            menu: 'eventos',       titulo: 'Criar Novo Evento',          busca: 'Buscar...' },
  { rota: '/evento-tiers',           view: 'evento-tiers',           menu: 'eventos',       titulo: 'Gerenciar Tiers',            busca: 'Buscar eventos, tiers...' }
];

// Login (sem sidebar/header)
router.get('/', (req, res) => {
  res.render('login', { titulo: 'Login' });
});

paginas.forEach((p) => {
  router.get(p.rota, (req, res) => {
    res.render(p.view, {
      pagina: p.menu,
      titulo: p.titulo,
      placeholderBusca: p.busca
    });
  });
});

// 404
router.use((req, res) => {
  res.status(404).render('404', { titulo: 'Página não encontrada', pagina: '' });
});

module.exports = router;
