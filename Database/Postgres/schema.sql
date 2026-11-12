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


# CRIAÇÃO DE TIPOS ENUM
-- -----------------------------------------------------------------------------------------------

CREATE TYPE status_login_enum AS ENUM ('ativo', 'inativo', 'bloqueado');
CREATE TYPE status_ciclo_enum AS ENUM ('PLANEJAMENTO', 'ATIVO', 'FECHADO');
CREATE TYPE status_cenario_enum AS ENUM ('RASCUNHO', 'APROVADO', 'REJEITADO');


# USUÁRIOS E LOGIN
-- -----------------------------------------------------------------------------------------------

CREATE TABLE perfil_acesso (
    idPerfil SERIAL PRIMARY KEY,
    tipo VARCHAR(250) NOT NULL
);

CREATE TABLE departamento (
    idDepto SERIAL PRIMARY KEY,
    nomeDepto VARCHAR(250) NOT NULL
);

CREATE TABLE login (
    idLogin SERIAL PRIMARY KEY,
    email VARCHAR(250) NOT NULL UNIQUE,
    senha_hash VARCHAR(250) NOT NULL, 
    status status_login_enum DEFAULT 'ativo' NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP NULL,
    CONSTRAINT chk_email_valido CHECK (email LIKE '%@%.%')
);

CREATE TABLE usuario (
    idUsuario SERIAL PRIMARY KEY,
    nomeCompleto VARCHAR(250) NOT NULL,
    CRM_matricula VARCHAR(250) NOT NULL,
    telefone VARCHAR(250) NOT NULL,
    idPerfil INT NOT NULL,
    idDepto INT NOT NULL,
    idLogin INT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'ATIVO',
    CONSTRAINT fk_login FOREIGN KEY (idLogin) REFERENCES login(idLogin),
    CONSTRAINT fk_perfil FOREIGN KEY (idPerfil) REFERENCES perfil_acesso(idPerfil),
    CONSTRAINT fk_depto FOREIGN KEY (idDepto) REFERENCES departamento(idDepto),
    CONSTRAINT chk_usuario_status CHECK (status IN ('ATIVO', 'INATIVO'))
);


# EVENTOS
-- -----------------------------------------------------------------------------------------------

CREATE TABLE categoria_evento (
    idCatEvento SERIAL PRIMARY KEY,
    categoria VARCHAR(250) NOT NULL,
    descricao VARCHAR(250)
);

CREATE TABLE evento (
    idEvento SERIAL PRIMARY KEY,
    nome VARCHAR(250) NOT NULL,
    data_inicio TIMESTAMP NOT NULL,
    data_termino TIMESTAMP NOT NULL,
    local VARCHAR(250) NOT NULL,
    idCatEvento INT NOT NULL,
    capacidade INT NOT NULL,
    descricao VARCHAR(250),
    custo_estimado DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANEJAMENTO',
    CONSTRAINT fk_catEvento FOREIGN KEY (idCatEvento) REFERENCES categoria_evento(idCatEvento),
    CONSTRAINT chk_evento_datas CHECK (data_termino >= data_inicio),
    CONSTRAINT chk_evento_capacidade CHECK (capacidade > 0)
);

CREATE TABLE historico_evento (
    idHistEvento SERIAL PRIMARY KEY,
    nome VARCHAR(250) NOT NULL,
    data_evento TIMESTAMP NOT NULL,
    idCatEvento INT,
    CONSTRAINT fk_catEvento1 FOREIGN KEY (idCatEvento) REFERENCES categoria_evento(idCatEvento)
);


# INSCRIÇÃO
-- -----------------------------------------------------------------------------------------------

CREATE TABLE tier_inscricao (
    idTier SERIAL PRIMARY KEY,
    nome VARCHAR(250) NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    capacidade INT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'RASCUNHO',
    CONSTRAINT chk_tier_status CHECK (status IN ('ATIVO', 'RASCUNHO', 'ENCERRADO')),
    CONSTRAINT chk_tier_capacidade CHECK (capacidade > 0)
);

CREATE TABLE inscricao (
    idInscricao SERIAL PRIMARY KEY,
    idEvento INT NOT NULL, -- tem que estar com o status ativo
    idUsuario INT NOT NULL,
    idTier INT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'SOLICITADO',
    data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inscEvento FOREIGN KEY (idEvento) REFERENCES evento(idEvento),
    CONSTRAINT fk_inscUser FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario),
    CONSTRAINT fk_inscTier FOREIGN KEY (idTier) REFERENCES tier_inscricao(idTier),
    CONSTRAINT chk_inscricao_status CHECK (status IN ('SOLICITADO', 'APROVADO', 'PAGO', 'REJEITADO'))
);


# ORÇAMENTO
-- -----------------------------------------------------------------------------------------------

-- Ciclos/Trimestres orçamentários (ex: Q3 2024, Q4 2024)
CREATE TABLE ciclo_orcamento (
    idCiclo SERIAL PRIMARY KEY,
    nome VARCHAR(250) NOT NULL UNIQUE, 
    limite_total DECIMAL(15,2) NOT NULL,
    status status_ciclo_enum DEFAULT 'ATIVO' NOT NULL,
    CONSTRAINT chk_limite_total_positivo CHECK (limite_total >= 0)
);

CREATE TABLE orcamento_departamento (
    idOrcamentoDepto SERIAL PRIMARY KEY,
    idDepto INT NOT NULL,
    idCiclo INT NOT NULL,
    idUsuario INT NULL, 
    limite DECIMAL(12,2) NOT NULL,
    utilizado DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
    CONSTRAINT fk_orc_depto FOREIGN KEY (idDepto) REFERENCES departamento(idDepto),
    CONSTRAINT fk_orc_ciclo FOREIGN KEY (idCiclo) REFERENCES ciclo_orcamento(idCiclo),
    CONSTRAINT fk_orc_lider FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario),
    CONSTRAINT chk_orc_limite CHECK (limite >= 0),
    CONSTRAINT chk_orc_utilizado CHECK (utilizado >= 0),
    CONSTRAINT uk_depto_ciclo UNIQUE (idDepto, idCiclo)
);

-- Cenários de simulação financeira 
CREATE TABLE cenario_orcamento (
    idCenario SERIAL PRIMARY KEY,
    nome_cenario VARCHAR(250) NOT NULL,
    idCiclo INT NOT NULL,
    custo_base DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    novo_custo_projetado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status status_cenario_enum DEFAULT 'RASCUNHO' NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cenario_ciclo FOREIGN KEY (idCiclo) REFERENCES ciclo_orcamento(idCiclo)
);

-- Itens detalhados adicionados no simulador de orçamento
CREATE TABLE item_cenario_orcamento (
    idItemCenario SERIAL PRIMARY KEY,
    idCenario INT NOT NULL,
    funcao VARCHAR(250) NOT NULL,       -- Ex: 'Médico Especialista', 'Enfermeiro Chefe'
    tier_nivel VARCHAR(50) NOT NULL,    -- Ex: 'Tier 1', 'Tier 2', 'Tier 3'
    quantidade INT NOT NULL,
    custo_mensal_est DECIMAL(10,2) NOT NULL,
    inicio_previsto VARCHAR(7) NULL,    -- Formato 'AAAA-MM'
    CONSTRAINT fk_item_cenario FOREIGN KEY (idCenario) REFERENCES cenario_orcamento(idCenario) ON DELETE CASCADE,
    CONSTRAINT chk_item_qtd CHECK (quantidade > 0),
    CONSTRAINT chk_item_custo CHECK (custo_mensal_est >= 0)
);


# ÍNDICES DE DESEMPENHO
-- -----------------------------------------------------------------------------------------------

CREATE INDEX idx_evento_datas ON evento(data_inicio, data_termino);
CREATE INDEX idx_inscricao_status ON inscricao(status);
CREATE INDEX idx_orcamento_depto_ciclo ON orcamento_departamento(idDepto, idCiclo);
CREATE INDEX idx_cenario_status_ciclo ON cenario_orcamento(status, idCiclo);
CREATE INDEX idx_item_cenario_funcao ON item_cenario_orcamento(funcao);


# VIEWS
-- -----------------------------------------------------------------------------------------------

DROP VIEW IF EXISTS vw_orcamento_departamentos, vw_inscricoes_completas, vw_eventos_detalhes, vw_usuarios_detalhes CASCADE;

-- VIEW DE USUARIO
CREATE VIEW vw_usuarios_detalhes AS
SELECT 
    u.idUsuario,
    u.nomeCompleto,
    u.CRM_matricula,
    u.telefone,
    u.status,
    p.tipo AS perfil,
    d.nomeDepto AS departamento
FROM usuario u
INNER JOIN perfil_acesso p ON u.idPerfil = p.idPerfil
INNER JOIN departamento d ON u.idDepto = d.idDepto;

-- SELECT * FROM vw_usuarios_detalhes;


-- VIEW DE DETALHES COMPLETOS DOS EVENTOS
CREATE VIEW vw_eventos_detalhes AS
SELECT 
    e.idEvento,
    e.nome AS nome_evento,
    e.data_inicio,
    e.data_termino,
    e.local,
    c.categoria AS categoria_evento,
    e.capacidade,
    e.custo_estimado
FROM evento e
INNER JOIN categoria_evento c ON e.idCatEvento = c.idCatEvento;

-- SELECT * FROM vw_eventos_detalhes;


-- VIEW DAS INSCRIÇÕES COMPLETAS
CREATE VIEW vw_inscricoes_completas AS
SELECT 
    i.idInscricao,
    i.data_inscricao,
    i.status AS status_inscricao,
    u.nomeCompleto AS usuario,
    u.CRM_matricula,
    e.nome AS evento,
    e.data_inicio AS data_evento,
    t.nome AS tier_inscricao,
    t.preco AS valor_pago
FROM inscricao i
INNER JOIN usuario u ON i.idUsuario = u.idUsuario
INNER JOIN evento e ON i.idEvento = e.idEvento
LEFT JOIN tier_inscricao t ON i.idTier = t.idTier;

-- SELECT * FROM vw_inscricoes_completas;


-- VIEWS PARA RELATÓRIOS E CONSULTAS
CREATE VIEW vw_orcamento_departamentos AS
SELECT 
    od.idOrcamentoDepto,
    c.nome AS ciclo,
    d.nomeDepto AS departamento,
    u.nomeCompleto AS lider,
    od.limite,
    od.utilizado,
    (od.limite - od.utilizado) AS disponivel,
    ROUND((od.utilizado / NULLIF(od.limite, 0)) * 100, 2) AS percentual_utilizado,
    CASE 
        WHEN od.limite > 0 AND (od.utilizado / od.limite) >= 0.90 THEN 'CRÍTICO'
        WHEN od.limite > 0 AND (od.utilizado / od.limite) >= 0.75 THEN 'ATENÇÃO'
        ELSE 'NORMAL'
    END AS status_alerta
FROM orcamento_departamento od
JOIN departamento d ON od.idDepto = d.idDepto
JOIN ciclo_orcamento c ON od.idCiclo = c.idCiclo
LEFT JOIN usuario u ON od.idUsuario = u.idUsuario;

-- SELECT * FROM vw_orcamento_departamentos;


# TRIGGERS
-- -----------------------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_valida_capacidade_inscricao ON inscricao;
DROP FUNCTION IF EXISTS fn_valida_capacidade_inscricao();

DROP TRIGGER IF EXISTS trg_valida_item_cenario_bi ON item_cenario_orcamento;
DROP FUNCTION IF EXISTS fn_valida_item_cenario();


-- Função e Trigger de Validação de Capacidade de Inscrição
CREATE OR REPLACE FUNCTION fn_valida_capacidade_inscricao()
RETURNS TRIGGER AS $$
DECLARE
    v_capacidade_evento INT;
    v_total_inscritos INT;
    v_capacidade_tier INT;
    v_total_inscritos_tier INT;
BEGIN
    -- Verifica capacidade total do evento
    SELECT capacidade INTO v_capacidade_evento 
    FROM evento 
    WHERE idEvento = NEW.idEvento;

    SELECT COUNT(*) INTO v_total_inscritos 
    FROM inscricao 
    WHERE idEvento = NEW.idEvento AND status != 'REJEITADO';

    IF v_total_inscritos >= v_capacidade_evento THEN
        RAISE EXCEPTION 'Erro: A capacidade máxima deste evento foi esgotada!';
    END IF;

    -- Se a inscrição possuir um Tier associado, valida a capacidade do Tier
    IF NEW.idTier IS NOT NULL THEN
        SELECT capacidade INTO v_capacidade_tier 
        FROM tier_inscricao 
        WHERE idTier = NEW.idTier;

        SELECT COUNT(*) INTO v_total_inscritos_tier 
        FROM inscricao 
        WHERE idEvento = NEW.idEvento AND idTier = NEW.idTier AND status != 'REJEITADO';

        IF v_total_inscritos_tier >= v_capacidade_tier THEN
            RAISE EXCEPTION 'Erro: A capacidade máxima esgotada para este Tier de inscrição!';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valida_capacidade_inscricao
BEFORE INSERT ON inscricao
FOR EACH ROW
EXECUTE FUNCTION fn_valida_capacidade_inscricao();


-- Função e Trigger de Validação de Itens do Cenário de Orçamento
CREATE OR REPLACE FUNCTION fn_valida_item_cenario()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantidade <= 0 THEN
        RAISE EXCEPTION 'Erro: A quantidade de recursos no simulador deve ser maior que zero.';
    END IF;
    
    IF NEW.custo_mensal_est < 0 THEN
        RAISE EXCEPTION 'Erro: O custo mensal estimado não pode ser negativo.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valida_item_cenario_bi
BEFORE INSERT ON item_cenario_orcamento
FOR EACH ROW
EXECUTE FUNCTION fn_valida_item_cenario();