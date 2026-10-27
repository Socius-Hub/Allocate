DROP DATABASE IF EXISTS allocate_db;
CREATE DATABASE allocate_db;

USE allocate_db;

# Tabelas auxiliares
CREATE TABLE perfil_acesso(
	idPerfil INT PRIMARY KEY AUTO_INCREMENT,
    tipo VARCHAR(250) NOT NULL
);

CREATE TABLE departamento(
	idDepto INT PRIMARY KEY AUTO_INCREMENT,
    nomeDepto varchar(250) NOT NULL
);

CREATE TABLE categoria_evento(
	idCatEvento INT PRIMARY KEY AUTO_INCREMENT,
    categoria VARCHAR(250) NOT NULL,
    descricao VARCHAR(250)
);

# Tabelas pricipais
CREATE TABLE usuario(
	idUsuario INT PRIMARY KEY AUTO_INCREMENT,
    nomeCompleto VARCHAR(250) NOT NULL,
    CRM_matricula VARCHAR(250) NOT NULL,
    telefone VARCHAR(250) NOT NULL,
    idPerfil INT NOT NULL,
    idDepto INT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'ATIVO',
    CONSTRAINT fk_perfil foreign key (idPerfil) REFERENCES perfil_acesso(idPerfil),
    CONSTRAINT fk_depto foreign key (idDepto) REFERENCES departamento(idDepto),
    CONSTRAINT chk_usuario_status CHECK (status IN ('ATIVO', 'INATIVO'))
);

CREATE TABLE evento(
	idEvento INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(250) NOT NULL,
    data_inicio DATETIME NOT NULL,
    data_termino DATETIME NOT NULL,
    local VARCHAR(250) NOT NULL,
    idCatEvento INT NOT NULL,
    capacidade INT NOT NULL,
    descricao VARCHAR(250),
    custo_estimado decimal(10,2) NOT NULL,
	CONSTRAINT fk_catEvento foreign key (idCatEvento) REFERENCES categoria_evento(idCatEvento),
    CONSTRAINT chk_evento_datas CHECK (data_termino >= data_inicio),
    CONSTRAINT chk_evento_capacidade CHECK (capacidade > 0)
);

CREATE TABLE historico_evento(
	idHistEvento INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(250) NOT NULL,
    data_evento DATETIME NOT NULL,
    idCatEvento INT,
    CONSTRAINT fk_catEvento1 foreign key (idCatEvento) REFERENCES categoria_evento(idCatEvento)
);

CREATE TABLE tier_inscricao(
	idTier INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(250) NOT NULL,
    preco decimal(10,2) NOT NULL,
    capacidade INT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'RASCUNHO',
    CONSTRAINT chk_tier_status CHECK (status IN ('ATIVO', 'RASCUNHO', 'ENCERRADO')),
    CONSTRAINT chk_tier_capacidade CHECK (capacidade > 0)
);

CREATE TABLE inscricao(
	idInscricao INT PRIMARY KEY AUTO_INCREMENT,
    idEvento INT NOT NULL, # tem que estar com o status ativo
    idUsuario INT NOT NULL,
    idTier INT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'SOLICITADO',
    data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_inscEvento foreign key (idEvento) REFERENCES evento(idEvento),
    CONSTRAINT fk_inscUser foreign key (idUsuario) REFERENCES usuario(idUsuario),
    CONSTRAINT fk_inscTier foreign key (idTier) REFERENCES tier_inscricao(idTier),
    CONSTRAINT chk_inscricao_status CHECK (status IN ('SOLICITADO', 'APROVADO', 'PAGO', 'REJEITADO'))
);
