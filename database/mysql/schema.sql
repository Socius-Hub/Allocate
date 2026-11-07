-- =====================================================================
-- ALLOCATE - Schema MySQL (testes offline)
-- Mesma estrutura do schema PostgreSQL usado no Render.
--
-- Pode ser executado pelo app (npm run db:reset com DB_CLIENT=mysql)
-- ou direto no MySQL Workbench (rode antes: CREATE DATABASE allocate_db; USE allocate_db;)
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP VIEW IF EXISTS vw_orcamento_departamentos, vw_inscricoes_completas, vw_eventos_detalhes, vw_usuarios_detalhes;
DROP TABLE IF EXISTS item_cenario_orcamento, cenario_orcamento, orcamento_departamento, ciclo_orcamento,
  inscricao, tier_inscricao, evento, categoria_evento, usuario, login, departamento, perfil_acesso;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- USUÁRIOS E LOGIN
-- ---------------------------------------------------------------------
CREATE TABLE perfil_acesso (
  id_perfil INT AUTO_INCREMENT PRIMARY KEY,
  tipo      VARCHAR(250) NOT NULL UNIQUE
);

CREATE TABLE departamento (
  id_depto   INT AUTO_INCREMENT PRIMARY KEY,
  nome_depto VARCHAR(250) NOT NULL UNIQUE,
  descricao  VARCHAR(250)
);

CREATE TABLE login (
  id_login     INT AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(250) NOT NULL UNIQUE,
  senha_hash   VARCHAR(250) NOT NULL,
  status       VARCHAR(10)  NOT NULL DEFAULT 'ATIVO',
  criado_em    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_login DATETIME     NULL,
  CONSTRAINT chk_login_status CHECK (status IN ('ATIVO', 'INATIVO', 'BLOQUEADO')),
  CONSTRAINT chk_email_valido CHECK (email LIKE '%@%.%')
);

CREATE TABLE usuario (
  id_usuario    INT AUTO_INCREMENT PRIMARY KEY,
  nome_completo VARCHAR(250) NOT NULL,
  crm_matricula VARCHAR(250) NOT NULL,
  telefone      VARCHAR(50)  NOT NULL,
  cargo         VARCHAR(250),
  id_perfil     INT NOT NULL,
  id_depto      INT NOT NULL,
  id_login      INT NOT NULL UNIQUE,
  status        VARCHAR(10) NOT NULL DEFAULT 'ATIVO',
  CONSTRAINT fk_usuario_perfil FOREIGN KEY (id_perfil) REFERENCES perfil_acesso(id_perfil),
  CONSTRAINT fk_usuario_depto  FOREIGN KEY (id_depto)  REFERENCES departamento(id_depto),
  CONSTRAINT fk_usuario_login  FOREIGN KEY (id_login)  REFERENCES login(id_login) ON DELETE CASCADE,
  CONSTRAINT chk_usuario_status CHECK (status IN ('ATIVO', 'INATIVO'))
);

-- ---------------------------------------------------------------------
-- EVENTOS
-- ---------------------------------------------------------------------
CREATE TABLE categoria_evento (
  id_cat_evento INT AUTO_INCREMENT PRIMARY KEY,
  categoria     VARCHAR(250) NOT NULL UNIQUE,
  descricao     VARCHAR(250)
);

CREATE TABLE evento (
  id_evento      INT AUTO_INCREMENT PRIMARY KEY,
  nome           VARCHAR(250)  NOT NULL,
  data_inicio    DATETIME      NOT NULL,
  data_termino   DATETIME      NOT NULL,
  localizacao    VARCHAR(250)  NOT NULL,
  id_cat_evento  INT           NOT NULL,
  id_depto       INT           NULL,
  capacidade     INT           NOT NULL,
  descricao      TEXT,
  custo_estimado DECIMAL(12,2) NOT NULL DEFAULT 0,
  status         VARCHAR(15)   NOT NULL DEFAULT 'PLANEJAMENTO',
  CONSTRAINT fk_evento_categoria FOREIGN KEY (id_cat_evento) REFERENCES categoria_evento(id_cat_evento),
  CONSTRAINT fk_evento_depto     FOREIGN KEY (id_depto) REFERENCES departamento(id_depto) ON DELETE SET NULL,
  CONSTRAINT chk_evento_datas      CHECK (data_termino >= data_inicio),
  CONSTRAINT chk_evento_capacidade CHECK (capacidade > 0),
  CONSTRAINT chk_evento_custo      CHECK (custo_estimado >= 0),
  CONSTRAINT chk_evento_status     CHECK (status IN ('PLANEJAMENTO', 'ATIVO', 'CONCLUIDO', 'CANCELADO'))
);

-- ---------------------------------------------------------------------
-- INSCRIÇÕES
-- ---------------------------------------------------------------------
CREATE TABLE tier_inscricao (
  id_tier    INT AUTO_INCREMENT PRIMARY KEY,
  id_evento  INT           NOT NULL,
  nome       VARCHAR(250)  NOT NULL,
  descricao  VARCHAR(250),
  preco      DECIMAL(10,2) NOT NULL,
  capacidade INT           NOT NULL,
  prazo      DATE          NULL,
  status     VARCHAR(10)   NOT NULL DEFAULT 'RASCUNHO',
  CONSTRAINT fk_tier_evento FOREIGN KEY (id_evento) REFERENCES evento(id_evento) ON DELETE CASCADE,
  CONSTRAINT chk_tier_status     CHECK (status IN ('ATIVO', 'RASCUNHO', 'ENCERRADO')),
  CONSTRAINT chk_tier_capacidade CHECK (capacidade > 0),
  CONSTRAINT chk_tier_preco      CHECK (preco >= 0)
);

CREATE TABLE inscricao (
  id_inscricao       INT AUTO_INCREMENT PRIMARY KEY,
  id_evento          INT           NOT NULL,
  id_usuario         INT           NOT NULL,
  id_tier            INT           NOT NULL,
  valor              DECIMAL(10,2) NOT NULL DEFAULT 0,
  status             VARCHAR(10)   NOT NULL DEFAULT 'SOLICITADO',
  justificativa      VARCHAR(500),
  comentario_revisao VARCHAR(500),
  data_inscricao     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_insc_evento  FOREIGN KEY (id_evento)  REFERENCES evento(id_evento) ON DELETE CASCADE,
  CONSTRAINT fk_insc_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_insc_tier    FOREIGN KEY (id_tier)    REFERENCES tier_inscricao(id_tier) ON DELETE CASCADE,
  CONSTRAINT chk_inscricao_status CHECK (status IN ('SOLICITADO', 'APROVADO', 'PAGO', 'REJEITADO')),
  CONSTRAINT uk_inscricao_evento_usuario UNIQUE (id_evento, id_usuario)
);

-- ---------------------------------------------------------------------
-- ORÇAMENTO
-- ---------------------------------------------------------------------
CREATE TABLE ciclo_orcamento (
  id_ciclo     INT AUTO_INCREMENT PRIMARY KEY,
  nome         VARCHAR(250)  NOT NULL UNIQUE,
  limite_total DECIMAL(15,2) NOT NULL,
  status       VARCHAR(15)   NOT NULL DEFAULT 'ATIVO',
  CONSTRAINT chk_ciclo_status CHECK (status IN ('PLANEJAMENTO', 'ATIVO', 'FECHADO')),
  CONSTRAINT chk_limite_total_positivo CHECK (limite_total >= 0)
);

CREATE TABLE orcamento_departamento (
  id_orcamento_depto INT AUTO_INCREMENT PRIMARY KEY,
  id_depto   INT           NOT NULL,
  id_ciclo   INT           NOT NULL,
  id_usuario INT           NULL,
  limite     DECIMAL(12,2) NOT NULL,
  utilizado  DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_orc_depto FOREIGN KEY (id_depto)   REFERENCES departamento(id_depto) ON DELETE CASCADE,
  CONSTRAINT fk_orc_ciclo FOREIGN KEY (id_ciclo)   REFERENCES ciclo_orcamento(id_ciclo) ON DELETE CASCADE,
  CONSTRAINT fk_orc_lider FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL,
  CONSTRAINT chk_orc_limite    CHECK (limite >= 0),
  CONSTRAINT chk_orc_utilizado CHECK (utilizado >= 0),
  CONSTRAINT uk_depto_ciclo UNIQUE (id_depto, id_ciclo)
);

CREATE TABLE cenario_orcamento (
  id_cenario    INT AUTO_INCREMENT PRIMARY KEY,
  nome_cenario  VARCHAR(250)  NOT NULL,
  id_ciclo      INT           NOT NULL,
  custo_base    DECIMAL(12,2) NOT NULL DEFAULT 0,
  status        VARCHAR(10)   NOT NULL DEFAULT 'RASCUNHO',
  criado_em     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cenario_ciclo FOREIGN KEY (id_ciclo) REFERENCES ciclo_orcamento(id_ciclo) ON DELETE CASCADE,
  CONSTRAINT chk_cenario_status CHECK (status IN ('RASCUNHO', 'APROVADO', 'REJEITADO'))
);

CREATE TABLE item_cenario_orcamento (
  id_item_cenario  INT AUTO_INCREMENT PRIMARY KEY,
  id_cenario       INT           NOT NULL,
  funcao           VARCHAR(250)  NOT NULL,
  tier_nivel       VARCHAR(50)   NOT NULL,
  quantidade       INT           NOT NULL,
  custo_mensal_est DECIMAL(10,2) NOT NULL,
  inicio_previsto  VARCHAR(7)    NULL,
  CONSTRAINT fk_item_cenario FOREIGN KEY (id_cenario) REFERENCES cenario_orcamento(id_cenario) ON DELETE CASCADE,
  CONSTRAINT chk_item_qtd   CHECK (quantidade > 0),
  CONSTRAINT chk_item_custo CHECK (custo_mensal_est >= 0)
);

-- ---------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------
CREATE INDEX idx_evento_datas        ON evento(data_inicio, data_termino);
CREATE INDEX idx_inscricao_status    ON inscricao(status);
CREATE INDEX idx_cenario_status      ON cenario_orcamento(status, id_ciclo);
CREATE INDEX idx_item_cenario_funcao ON item_cenario_orcamento(funcao);

-- ---------------------------------------------------------------------
-- TRIGGER: valida capacidade do evento e do tier ao inscrever
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_valida_capacidade_inscricao;

DELIMITER //
CREATE TRIGGER trg_valida_capacidade_inscricao
BEFORE INSERT ON inscricao
FOR EACH ROW
BEGIN
  DECLARE v_cap_evento INT;
  DECLARE v_total_evento INT;
  DECLARE v_cap_tier INT;
  DECLARE v_total_tier INT;

  SELECT capacidade INTO v_cap_evento FROM evento WHERE id_evento = NEW.id_evento;
  SELECT COUNT(*) INTO v_total_evento FROM inscricao WHERE id_evento = NEW.id_evento AND status <> 'REJEITADO';
  IF v_total_evento >= v_cap_evento THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A capacidade máxima deste evento foi esgotada.';
  END IF;

  SELECT capacidade INTO v_cap_tier FROM tier_inscricao WHERE id_tier = NEW.id_tier;
  SELECT COUNT(*) INTO v_total_tier FROM inscricao WHERE id_tier = NEW.id_tier AND status <> 'REJEITADO';
  IF v_total_tier >= v_cap_tier THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'As vagas deste tier de inscrição estão esgotadas.';
  END IF;
END//
DELIMITER ;

-- ---------------------------------------------------------------------
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
