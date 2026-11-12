/*
    Allocate schema - PostgreSQL
    
    Proj. de Extensão III - 4° Bimestre TADs - 2026

    OBS: Este script cria a estrutura de banco de dados para o sistema Allocate, incluindo tabelas, índices, views e triggers.
*/

-- Nota: No PostgreSQL, comandos como DROP/CREATE DATABASE e conexão (\c) 
-- costumam ser executados fora do script ou via ferramenta de gerenciamento.

DROP DATABASE IF EXISTS allocate_db;
CREATE DATABASE allocate_db;

-- \c allocate_db; -- Comando psql para conectar ao banco recém-criado (se estiver rodando via terminal)


-- Allocate schema - PostgreSQL

CREATE TABLE IF NOT EXISTS perfil_acesso (
    idPerfil SERIAL PRIMARY KEY,
    tipo VARCHAR(250) NOT NULL
);

CREATE TABLE IF NOT EXISTS departamento (
    idDepto SERIAL PRIMARY KEY,
    nomeDepto VARCHAR(250) NOT NULL
);

CREATE TABLE IF NOT EXISTS login (
    idLogin SERIAL PRIMARY KEY,
    email VARCHAR(250) NOT NULL UNIQUE,
    senha_hash VARCHAR(250) NOT NULL,
    status VARCHAR(20) DEFAULT 'ativo' NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS usuario (
    idUsuario SERIAL PRIMARY KEY,
    nomeCompleto VARCHAR(250) NOT NULL,
    CRM_matricula VARCHAR(250) NOT NULL,
    telefone VARCHAR(250) NOT NULL,
    idPerfil INT NOT NULL REFERENCES perfil_acesso(idPerfil),
    idDepto INT NOT NULL REFERENCES departamento(idDepto),
    idLogin INT NOT NULL REFERENCES login(idLogin) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL DEFAULT 'ATIVO'
);

CREATE TABLE IF NOT EXISTS categoria_evento (
    idCatEvento SERIAL PRIMARY KEY,
    categoria VARCHAR(250) NOT NULL,
    descricao VARCHAR(250)
);

CREATE TABLE IF NOT EXISTS evento (
    idEvento SERIAL PRIMARY KEY,
    nome VARCHAR(250) NOT NULL,
    data_inicio TIMESTAMP NOT NULL,
    data_termino TIMESTAMP NOT NULL,
    local VARCHAR(250) NOT NULL,
    idCatEvento INT NOT NULL REFERENCES categoria_evento(idCatEvento),
    capacidade INT NOT NULL,
    descricao VARCHAR(250),
    custo_estimado DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANEJAMENTO'
);

CREATE TABLE IF NOT EXISTS tier_inscricao (
    idTier SERIAL PRIMARY KEY,
    idEvento INT NOT NULL REFERENCES evento(idEvento) ON DELETE CASCADE,
    nome VARCHAR(250) NOT NULL,
    descricao VARCHAR(250) NULL,
    preco DECIMAL(10,2) NOT NULL,
    capacidade INT NOT NULL,
    prazo DATE NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'RASCUNHO'
);

CREATE TABLE IF NOT EXISTS inscricao (
    idInscricao SERIAL PRIMARY KEY,
    idEvento INT NOT NULL REFERENCES evento(idEvento),
    idUsuario INT NOT NULL REFERENCES usuario(idUsuario),
    idTier INT NOT NULL REFERENCES tier_inscricao(idTier),
    status VARCHAR(10) NOT NULL DEFAULT 'SOLICITADO',
    data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ciclo_orcamento (
    idCiclo SERIAL PRIMARY KEY,
    nome VARCHAR(250) NOT NULL UNIQUE,
    limite_total DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'ATIVO' NOT NULL
);

CREATE TABLE IF NOT EXISTS orcamento_departamento (
    idOrcamentoDepto SERIAL PRIMARY KEY,
    idDepto INT NOT NULL REFERENCES departamento(idDepto),
    idCiclo INT NOT NULL REFERENCES ciclo_orcamento(idCiclo),
    idUsuario INT NULL REFERENCES usuario(idUsuario),
    limite DECIMAL(12,2) NOT NULL,
    utilizado DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
    CONSTRAINT uk_depto_ciclo UNIQUE (idDepto, idCiclo)
);

CREATE TABLE IF NOT EXISTS cenario_orcamento (
    idCenario SERIAL PRIMARY KEY,
    nome_cenario VARCHAR(250) NOT NULL,
    idCiclo INT NOT NULL REFERENCES ciclo_orcamento(idCiclo),
    custo_base DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    novo_custo_projetado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'RASCUNHO' NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS item_cenario_orcamento (
    idItemCenario SERIAL PRIMARY KEY,
    idCenario INT NOT NULL REFERENCES cenario_orcamento(idCenario) ON DELETE CASCADE,
    funcao VARCHAR(250) NOT NULL,
    tier_nivel VARCHAR(50) NOT NULL,
    quantidade INT NOT NULL,
    custo_mensal_est DECIMAL(10,2) NOT NULL,
    inicio_previsto VARCHAR(7) NULL
);