const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const colors = require("colors")
app.use(express.static("./public"));
http.listen(3003);
console.log("The Dark Night Returns".black)

// ____________________________ Parte do registro de conexões do jogador :D ____________________________
const jogadores = {};
const jogadoresconectados = []
let id2;
io.on('connection', (socket) => {

    socket.on('registrarnomes', nome => {
        const id = socket.id;
        jogadores[id] = nome
        id2 = id
        socket.emit('enviarnome', {idpessoa: nome});
        console.log(`[+] ${nome} se conectou ao TruKo!`)
        jogadoresConectados("adicionar", nome)
    });

    socket.on('disconnect', () => {
        const id = socket.id;
        if (jogadores[id] != undefined){
            console.log(`[-] ${jogadores[id]} se desconectou >:(`)
            jogadoresConectados("remover", jogadores[id])
            delete jogadores[id];
        }
    });

});

// ____________________________ Envio das ações de js em html ____________________________


// ____________________________ Logar/adicionar/remover jogadores conectados da lista ____________________________

function jogadoresConectados(acao, nome){
    if (acao == "remover"){
        for (let i = jogadoresconectados.length - 1; i >= 0; i--) {
            if (jogadoresconectados[i] === nome) {
                jogadoresconectados.splice(i, 1);
            }
        }
    }
    else if (acao == "adicionar"){
        jogadoresconectados.push(nome);
    }
    console.log(`[INFO] Jogadores conectados: ${jogadoresconectados} `);
}