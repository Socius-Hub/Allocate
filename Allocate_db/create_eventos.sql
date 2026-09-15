-- Tabela de Eventos (ex: Congresso Nacional .....)

CREATE TABLE eventos (
    idEventos INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Tiers de Inscrição de um Evento
CREATE TABLE evento_tiers (
    idTiers INT AUTO_INCREMENT PRIMARY KEY,
    idEventos INT NOT NULL,
    nome VARCHAR(50) NOT NULL, -- Básico, Completo, VIP
    descricao TEXT,
    valor DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (idEventos) REFERENCES eventos(idEventos) ON DELETE CASCADE
);

-- Tabela de Inscrições
CREATE TABLE inscricoes (
    idInscricoes INT AUTO_INCREMENT PRIMARY KEY,
    codigo_inscricao VARCHAR(30) UNIQUE NOT NULL, -- Ex: INS-2024-0891
    idUser INT NOT NULL,
    idEventos INT NOT NULL,
    idTiers INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status ENUM('SOLICITADA', 'APROVADA', 'PAGA', 'REJEITADA') DEFAULT 'SOLICITADA',
    data_inscricao DATE NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idUser) REFERENCES usuarios(idUser),
    FOREIGN KEY (idEventos) REFERENCES eventos(idEventos),
    FOREIGN KEY (idTiers) REFERENCES evento_tiers(idTiers)
);