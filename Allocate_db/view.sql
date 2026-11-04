# VIEWS
-- -----------------------------------------------------------------------------------------------

# VIEWS DE USUARIO

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

select * from vw_usuarios_detalhes;


# VIEW DE DETALHES COMPLETOS DOSZ EVENTOS

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

select * from vw_eventos_detalhes;


# VIEW DAS INSCRIÇÕES COMPLETAS

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

select * from vw_inscricoes_completas;


# VIEWS PARA RELATÓRIOS E CONSULTAS

-- View consolidada para a tela de Orçamento por Departamento (calcula disponível, % e status de alerta)
CREATE OR REPLACE VIEW vw_orcamento_departamentos AS
SELECT 
    od.idOrcamentoDepto,
    c.nome AS ciclo,
    d.nomeDepto AS departamento,
    u.nomeCompleto AS lider,
    od.limite,
    od.utilizado,
    (od.limite - od.utilizado) AS disponivel,
    ROUND((od.utilizado / od.limite) * 100, 2) AS percentual_utilizado,
    CASE 
        WHEN (od.utilizado / od.limite) >= 0.90 THEN 'CRÍTICO'
        WHEN (od.utilizado / od.limite) >= 0.75 THEN 'ATENÇÃO'
        ELSE 'NORMAL'
    END AS status_alerta
FROM orcamento_departamento od
JOIN departamento d ON od.idDepto = d.idDepto
JOIN ciclo_orcamento c ON od.idCiclo = c.idCiclo
LEFT JOIN usuario u ON od.idUsuario = u.idUsuario;

select * from vw_orcamento_departamentos;

