// Aqui deve ficar o código de conexão com o banco de dados.
// TO DO: Implementar a conexão com o banco de dados e exportar as funções necessárias para interagir com ele.

const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',     // host for connection
    port: 3000,            // default port for mysql is 3306
    database: 'allocate_db',      // database from which we want to connect our node application
    user: 'root',          // username of the mysql connection
    password: 'password'       // password of the mysql connection
});

connection.connect(function(err) {
    if (err) {
        console.log("Erro ao conectar com o banco de dados:", err);
    } else {
        console.log("Conexão com mysql criada com sucesso.");
    }
});

module.exports = connection;