-- Tabela de cenários Salvos / Rascunhos
/* CREATE TABLE cenarios_simulacao (
    idCenario_Simu INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL, -- Ex: 'Crescimento Agressivo Q4 2024'
    ciclo VARCHAR(20) NOT NULL,
    custo_base_mensal DECIMAL(15, 2) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Itens adicionados ao cenário
CREATE TABLE itens_simulacao (
    idItens_Simu INT AUTO_INCREMENT PRIMARY KEY,
    idCenario INT NOT NULL,
    funcao VARCHAR(100) NOT NULL, -- Ex: 'Médico Especialista', 'Técnico de TI'
    tier VARCHAR(50) NOT NULL,    -- Ex: 'Tier 1 (Júnior)', 'Tier 3 (Sênior)'
    quantidade INT NOT NULL DEFAULT 1,
    inicio_previsto VARCHAR(7) NOT NULL, -- Formato YYYY-MM
    custo_mensal_estimado DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (idCenario) REFERENCES cenarios_simulacao(idCenario) ON DELETE CASCADE
); */