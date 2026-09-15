-- Tabela de Orçamentos por Departamento e Ciclo

CREATE TABLE orcamentos_departamento (
    idOrcamento_depto INT AUTO_INCREMENT PRIMARY KEY not null,
    idDepto INT NOT NULL,
    ciclo VARCHAR(20) NOT NULL, -- Ex: 'Q3 2024', 'Q4 2024'
    limite DECIMAL(15, 2) NOT NULL,
    utilizado DECIMAL(15, 2) DEFAULT 0.00,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (idDepto) REFERENCES departamentos(idDepto)
);