DELIMITER //

CREATE TRIGGER trg_valida_capacidade_inscricao
BEFORE INSERT ON inscricao
FOR EACH ROW
BEGIN
    DECLARE v_capacidade_evento INT;
    DECLARE v_total_inscritos INT;
    DECLARE v_capacidade_tier INT;
    DECLARE v_total_inscritos_tier INT;

    -- 1. Verifica capacidade total do evento
    SELECT capacidade INTO v_capacidade_evento 
    FROM evento 
    WHERE idEvento = NEW.idEvento;

    SELECT COUNT(*) INTO v_total_inscritos 
    FROM inscricao 
    WHERE idEvento = NEW.idEvento AND status != 'REJEITADO';

    IF v_total_inscritos >= v_capacidade_evento THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Erro: A capacidade máxima deste evento foi esgotada!';
    END IF;

    -- 2. Se a inscrição possuir um Tier associado, valida a capacidade do Tier
    IF NEW.idTier IS NOT NULL THEN
        SELECT capacidade INTO v_capacidade_tier 
        FROM tier_inscricao 
        WHERE idTier = NEW.idTier;

        SELECT COUNT(*) INTO v_total_inscritos_tier 
        FROM inscricao 
        WHERE idEvento = NEW.idEvento AND idTier = NEW.idTier AND status != 'REJEITADO';

        IF v_total_inscritos_tier >= v_capacidade_tier THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Erro: A capacidade máxima esgotada para este Tier de inscrição!';
        END IF;
    END IF;
END//

DELIMITER ;