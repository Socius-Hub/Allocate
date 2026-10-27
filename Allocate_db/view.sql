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