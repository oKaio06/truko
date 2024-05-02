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
const idlist = []
let id2;
io.on('connection', (socket) => {

    socket.on('registrarnomes', nome => {
        const id = socket.id;
        jogadores[id] = nome
        idlist.push(id)
        id2 = id
        socket.emit('enviarnome', {idpessoa: nome});
        console.log(`${nome} se conectou ao TruKo!`)
        console.log(jogadores[idlist[0]])
        for (let i = -1; i < jogadores.length; i++){
            console.log(jogadores[idlist[i]])
        }
    });



    socket.on('disconnect', () => {
        const id = socket.id;
        if (jogadores[id] != undefined){
            console.log(`${jogadores[id]} se desconectou >:(`)
            delete jogadores[id];
            console.log((jogadores))
        }
    });

    // socket.emit('logarnomes', nomes => {
    //     console.log(`${nomes} estão conectados no TruKo!`);
    // });
});

// ____________________________ Envio das ações de js em html ____________________________
