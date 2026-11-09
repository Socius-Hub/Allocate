/*

	Allocate schema - PostgreSQL (usado no Render)
    
    Proj. de Extensão III - 4° Bimestre TADs - 2026

    OBS: Executado automaticamente na 1ª inicialização do app (ou com: npm run db:reset)

*/


DROP VIEW IF EXISTS vw_orcamento_departamentos, vw_inscricoes_completas, vw_eventos_detalhes, vw_usuarios_detalhes CASCADE;
DROP TABLE IF EXISTS item_cenario_orcamento, cenario_orcamento, orcamento_departamento, ciclo_orcamento,
  inscricao, tier_inscricao, evento, categoria_evento, usuario, login, departamento, perfil_acesso CASCADE;
DROP FUNCTION IF EXISTS fn_valida_capacidade_inscricao() CASCADE;

-- criação da database???


-- USUÁRIOS E LOGIN
-- ---------------------------------------------------------------------
CREATE TABLE perfil_acesso (
  id_perfil SERIAL PRIMARY KEY,
  tipo      VARCHAR(250) NOT NULL UNIQUE
);

CREATE TABLE departamento (
  id_depto   SERIAL PRIMARY KEY,
  nome_depto VARCHAR(250) NOT NULL UNIQUE,
  descricao  VARCHAR(250)
);

CREATE TABLE login (
  id_login     SERIAL PRIMARY KEY,
  email        VARCHAR(250) NOT NULL UNIQUE,
  senha_hash   VARCHAR(250) NOT NULL,
  status       VARCHAR(10)  NOT NULL DEFAULT 'ATIVO',
  criado_em    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_login TIMESTAMP    NULL,
  CONSTRAINT chk_login_status CHECK (status IN ('ATIVO', 'INATIVO', 'BLOQUEADO')),
  CONSTRAINT chk_email_valido CHECK (email LIKE '%@%.%')
);

CREATE TABLE usuario (
  id_usuario    SERIAL PRIMARY KEY,
  nome_completo VARCHAR(250) NOT NULL,
  crm_matricula VARCHAR(250) NOT NULL,
  telefone      VARCHAR(50)  NOT NULL,
  cargo         VARCHAR(250),
  id_perfil     INT NOT NULL REFERENCES perfil_acesso(id_perfil),
  id_depto      INT NOT NULL REFERENCES departamento(id_depto),
  id_login      INT NOT NULL UNIQUE REFERENCES login(id_login) ON DELETE CASCADE,
  status        VARCHAR(10) NOT NULL DEFAULT 'ATIVO',
  CONSTRAINT chk_usuario_status CHECK (status IN ('ATIVO', 'INATIVO'))
);


-- EVENTOS
-- ---------------------------------------------------------------------
CREATE TABLE categoria_evento (
  id_cat_evento SERIAL PRIMARY KEY,
  categoria     VARCHAR(250) NOT NULL UNIQUE,
  descricao     VARCHAR(250)
);

CREATE TABLE evento (
  id_evento      SERIAL PRIMARY KEY,
  nome           VARCHAR(250)  NOT NULL,
  data_inicio    TIMESTAMP     NOT NULL,
  data_termino   TIMESTAMP     NOT NULL,
  localizacao    VARCHAR(250)  NOT NULL,
  id_cat_evento  INT           NOT NULL REFERENCES categoria_evento(id_cat_evento),
  id_depto       INT           NULL REFERENCES departamento(id_depto) ON DELETE SET NULL, -- centro de custo
  capacidade     INT           NOT NULL,
  descricao      TEXT,
  custo_estimado DECIMAL(12,2) NOT NULL DEFAULT 0,
  status         VARCHAR(15)   NOT NULL DEFAULT 'PLANEJAMENTO',
  CONSTRAINT chk_evento_datas      CHECK (data_termino >= data_inicio),
  CONSTRAINT chk_evento_capacidade CHECK (capacidade > 0),
  CONSTRAINT chk_evento_custo      CHECK (custo_estimado >= 0),
  CONSTRAINT chk_evento_status     CHECK (status IN ('PLANEJAMENTO', 'ATIVO', 'CONCLUIDO', 'CANCELADO'))
);


-- INSCRIÇÕES
-- ---------------------------------------------------------------------
CREATE TABLE tier_inscricao (
  id_tier    SERIAL PRIMARY KEY,
  id_evento  INT           NOT NULL REFERENCES evento(id_evento) ON DELETE CASCADE,
  nome       VARCHAR(250)  NOT NULL,
  descricao  VARCHAR(250),
  preco      DECIMAL(10,2) NOT NULL,
  capacidade INT           NOT NULL,
  prazo      DATE          NULL,
  status     VARCHAR(10)   NOT NULL DEFAULT 'RASCUNHO',
  CONSTRAINT chk_tier_status     CHECK (status IN ('ATIVO', 'RASCUNHO', 'ENCERRADO')),
  CONSTRAINT chk_tier_capacidade CHECK (capacidade > 0),
  CONSTRAINT chk_tier_preco      CHECK (preco >= 0)
);

CREATE TABLE inscricao (
  id_inscricao       SERIAL PRIMARY KEY,
  id_evento          INT           NOT NULL REFERENCES evento(id_evento) ON DELETE CASCADE,
  id_usuario         INT           NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  id_tier            INT           NOT NULL REFERENCES tier_inscricao(id_tier) ON DELETE CASCADE,
  valor              DECIMAL(10,2) NOT NULL DEFAULT 0,   -- preço do tier no momento da inscrição
  status             VARCHAR(10)   NOT NULL DEFAULT 'SOLICITADO',
  justificativa      VARCHAR(500),
  comentario_revisao VARCHAR(500),
  data_inscricao     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_inscricao_status CHECK (status IN ('SOLICITADO', 'APROVADO', 'PAGO', 'REJEITADO')),
  CONSTRAINT uk_inscricao_evento_usuario UNIQUE (id_evento, id_usuario)
);


-- ORÇAMENTO
-- ---------------------------------------------------------------------
CREATE TABLE ciclo_orcamento (
  id_ciclo     SERIAL PRIMARY KEY,
  nome         VARCHAR(250)  NOT NULL UNIQUE,
  limite_total DECIMAL(15,2) NOT NULL,
  status       VARCHAR(15)   NOT NULL DEFAULT 'ATIVO',
  CONSTRAINT chk_ciclo_status CHECK (status IN ('PLANEJAMENTO', 'ATIVO', 'FECHADO')),
  CONSTRAINT chk_limite_total_positivo CHECK (limite_total >= 0)
);

CREATE TABLE orcamento_departamento (
  id_orcamento_depto SERIAL PRIMARY KEY,
  id_depto   INT           NOT NULL REFERENCES departamento(id_depto) ON DELETE CASCADE,
  id_ciclo   INT           NOT NULL REFERENCES ciclo_orcamento(id_ciclo) ON DELETE CASCADE,
  id_usuario INT           NULL REFERENCES usuario(id_usuario) ON DELETE SET NULL, -- líder
  limite     DECIMAL(12,2) NOT NULL,
  utilizado  DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT chk_orc_limite    CHECK (limite >= 0),
  CONSTRAINT chk_orc_utilizado CHECK (utilizado >= 0),
  CONSTRAINT uk_depto_ciclo UNIQUE (id_depto, id_ciclo)
);

CREATE TABLE cenario_orcamento (
  id_cenario    SERIAL PRIMARY KEY,
  nome_cenario  VARCHAR(250)  NOT NULL,
  id_ciclo      INT           NOT NULL REFERENCES ciclo_orcamento(id_ciclo) ON DELETE CASCADE,
  custo_base    DECIMAL(12,2) NOT NULL DEFAULT 0,
  status        VARCHAR(10)   NOT NULL DEFAULT 'RASCUNHO',
  criado_em     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_cenario_status CHECK (status IN ('RASCUNHO', 'APROVADO', 'REJEITADO'))
);

CREATE TABLE item_cenario_orcamento (
  id_item_cenario  SERIAL PRIMARY KEY,
  id_cenario       INT           NOT NULL REFERENCES cenario_orcamento(id_cenario) ON DELETE CASCADE,
  funcao           VARCHAR(250)  NOT NULL,
  tier_nivel       VARCHAR(50)   NOT NULL,
  quantidade       INT           NOT NULL,
  custo_mensal_est DECIMAL(10,2) NOT NULL,   -- custo mensal unitário
  inicio_previsto  VARCHAR(7)    NULL,       -- 'AAAA-MM'
  CONSTRAINT chk_item_qtd   CHECK (quantidade > 0),
  CONSTRAINT chk_item_custo CHECK (custo_mensal_est >= 0)
);


-- ÍNDICES DE DESEMPENHO
-- ---------------------------------------------------------------------
CREATE INDEX idx_evento_datas        ON evento(data_inicio, data_termino);
CREATE INDEX idx_inscricao_status    ON inscricao(status);
CREATE INDEX idx_cenario_status      ON cenario_orcamento(status, id_ciclo);
CREATE INDEX idx_item_cenario_funcao ON item_cenario_orcamento(funcao);



-- TRIGGERS
-- ---------------------------------------------------------------------


-- valida capacidade do evento e do tier ao inscrever
CREATE FUNCTION fn_valida_capacidade_inscricao() RETURNS TRIGGER AS $$
DECLARE
  v_cap_evento INT;
  v_total_evento INT;
  v_cap_tier INT;
  v_total_tier INT;
BEGIN
  SELECT capacidade INTO v_cap_evento FROM evento WHERE id_evento = NEW.id_evento;
  SELECT COUNT(*) INTO v_total_evento FROM inscricao WHERE id_evento = NEW.id_evento AND status <> 'REJEITADO';
  IF v_total_evento >= v_cap_evento THEN
    RAISE EXCEPTION 'A capacidade máxima deste evento foi esgotada.';
  END IF;

  SELECT capacidade INTO v_cap_tier FROM tier_inscricao WHERE id_tier = NEW.id_tier;
  SELECT COUNT(*) INTO v_total_tier FROM inscricao WHERE id_tier = NEW.id_tier AND status <> 'REJEITADO';
  IF v_total_tier >= v_cap_tier THEN
    RAISE EXCEPTION 'As vagas deste tier de inscrição estão esgotadas.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valida_capacidade_inscricao
BEFORE INSERT ON inscricao
FOR EACH ROW EXECUTE FUNCTION fn_valida_capacidade_inscricao();


-- VIEWS
-- ---------------------------------------------------------------------

CREATE VIEW vw_usuarios_detalhes AS
SELECT u.id_usuario, u.nome_completo, u.crm_matricula, u.telefone, u.cargo, u.status,
       l.email, p.tipo AS perfil, d.nome_depto AS departamento
FROM usuario u
JOIN login l         ON l.id_login  = u.id_login
JOIN perfil_acesso p ON p.id_perfil = u.id_perfil
JOIN departamento d  ON d.id_depto  = u.id_depto;

CREATE VIEW vw_eventos_detalhes AS
SELECT e.id_evento, e.nome AS nome_evento, e.data_inicio, e.data_termino, e.localizacao,
       c.categoria AS categoria_evento, e.capacidade, e.custo_estimado, e.status
FROM evento e
JOIN categoria_evento c ON c.id_cat_evento = e.id_cat_evento;

CREATE VIEW vw_inscricoes_completas AS
SELECT i.id_inscricao, i.data_inscricao, i.status AS status_inscricao,
       u.nome_completo AS usuario, u.crm_matricula, e.nome AS evento,
       e.data_inicio AS data_evento, t.nome AS tier_inscricao, i.valor
FROM inscricao i
JOIN usuario u        ON u.id_usuario = i.id_usuario
JOIN evento e         ON e.id_evento  = i.id_evento
JOIN tier_inscricao t ON t.id_tier    = i.id_tier;

CREATE VIEW vw_orcamento_departamentos AS
SELECT od.id_orcamento_depto, c.id_ciclo, c.nome AS ciclo, d.id_depto, d.nome_depto AS departamento,
       u.nome_completo AS lider, od.limite, od.utilizado,
       (od.limite - od.utilizado) AS disponivel,
       CASE WHEN od.limite = 0 THEN 0 ELSE ROUND((od.utilizado / od.limite) * 100, 2) END AS percentual_utilizado,
       CASE
         WHEN od.limite > 0 AND (od.utilizado / od.limite) >= 0.90 THEN 'CRITICO'
         WHEN od.limite > 0 AND (od.utilizado / od.limite) >= 0.75 THEN 'ATENCAO'
         ELSE 'NORMAL'
       END AS status_alerta
FROM orcamento_departamento od
JOIN departamento d    ON d.id_depto = od.id_depto
JOIN ciclo_orcamento c ON c.id_ciclo = od.id_ciclo
LEFT JOIN usuario u    ON u.id_usuario = od.id_usuario;

-- execução das views