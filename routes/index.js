const express = require('express');
const router = express.Router();
const app = express();
const path = require('path');

//app.use() diz ao Express para usar um middleware em todas as rotas.
//extended: true permite dados mais complexos nos formulários.
app.use(express.urlencoded({ extended: true }))

// Página de Login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login.html'));
});

// Página de dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

// Página de Configurações
app.get('/configuracoes', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/configuracoes.html'));
});

// Página de aprovacoes
app.get('/aprovacoes', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/aprovacoes.html'));
});

// Página de aprovacao-detalhe
app.get('/aprovacao-detalhe', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/aprovacao-detalhe.html'));
});

// Página de simulador-orcamento
app.get('/simulador-orcamento', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/simulador-orcamento.html'));
});

// Página de orcamento-departamento
app.get('/orcamento-departamento', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/orcamento-departamento.html'));
});

// Funcionarios
app.get('/funcionarios', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/funcionarios.html'));
});

app.get('/funcionario-perfil', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/funcionario-perfil.html'));
});

// Usuario
app.get('/usuario-novo', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/usuario-novo.html'));
});

// Inscrição
app.get('/inscricao-nova', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/inscricao-nova.html'));
});

app.get('/inscricoes-lista', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/inscricoes-lista.html'));
});

// Eventos
app.get('/eventos', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/eventos.html'));
});

app.get('/evento-detalhes', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/evento-detalhes.html'));
});

app.get('/evento-novo', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/evento-novo.html'));
});

app.get('/evento-tiers', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/evento-tiers.html'));
});

// Middleware para tratamento de Rota Não Encontrada (Erro 404)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../views/404.html'));
});

module.exports = router; // Exporta o roteador para ser usado no app.js
module.exports = app;