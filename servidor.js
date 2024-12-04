const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const colors = require("colors")
const {query} = require("express");
app.use(express.static("./public"));
http.listen(80);
console.log("The Dark Night Returns".black);

// ____________________________ Parte do registro de conexões do jogador :D ____________________________
const jogadores = {};
const jogadoresPorId = {};
const jogadoresconectados = [];
const times = {Time1: {"1": null, "2": null}, Time2: {"1": null, "2": null}};
const nomestime = [];
let playerjogoucarta = false;
let cartajogada;
let valorpontosmao = 1;
let timetrukado;
let socketjogadoratual;
let nomejogadorestime;
let jogadoresID;
let jogadoresQueResponderamAoTruko = [];
let trukoaceito = false;
let eventStatusHandler = "selecionarTimes";
let trukopressionado;

io.on('connection', (socket) => {
    // Registra o nome em na variável jogadores e o socket id no jogadoresPorId e retorna para jogadoresConectados
    socket.on('registrarnomes', nome => {
        const id = socket.id;
        jogadores[nome] = id;
        jogadoresPorId[id] = nome;
        return jogadoresConectados("adicionar", nome);
    });

    // Remove o nome jogador da variável jogadores e o socket id no jogadoresPorId e retorna para jogadoresConectados
    socket.on('disconnect', () => {
        const nome = jogadoresPorId[socket.id];
        if (nome) {
            delete jogadores[nome];
            delete jogadoresPorId[socket.id];
            return jogadoresConectados("remover", nome);
        }
    });

    // Checa se o nome inserido na página do index está dentro da lista de usuários
    socket.on('checarnomes', nome => {
        if (nome in jogadores){
            socket.emit('receberverificacaonomes', true); // Envia a resposta do checker true pq tem o nome na lista
            return;
        }
        socket.emit('receberverificacaonomes', false); // Envia a resposta do checker false pq n tem o nome na lista
    });

    // Adicionar pessoa no time
    socket.on('entrartime', time => {
        // Autorizador de eventos, se for negado o pedido nada acontecerá.
        if ( !autorizarEvento(socket.id, 'selecionarTimes') ){return;}

        let id = socket.id;
        let timenum = time[time.length - 1];
        let nome = jogadoresPorId[id];
        let checkjogador = checarJogadorInclusoTimes(nome);
        if(checkjogador){
            socket.emit('mensagemerro', 'Você já está em um time!');
            return;
        }
        else{
            if (times[time]['1'] == null && times[time]['2'] == null){ // Checa em qual lugar do time vai colocar o jogador
                times[time]['1'] = nome;
                nomestime.push([nome, timenum, '1']);
                io.sockets.emit('selecionarTimetext', nomestime); // Manda para o JS atualizar no HTML os nomes dos jogadores nos times
            }
            else if(times[time]['2'] == null){ // Checa em qual lugar do time vai colocar o jogador
                times[time]['2'] = nome;
                nomestime.push([nome, timenum, '2']);
                io.sockets.emit('selecionarTimetext', nomestime);
            }
            else{
                socket.emit('mensagemerro', 'O time que você quer entrar já está cheio!');
                return;
            }
        }
        if(nomestime.length == 4){
            rodarTimerComecar();
        }
    });

    // Recebe a carta jogada e faz o processamento da carta (todas as ações e o que fazer com ela)
    socket.on('recebercartajogada', (id, carta) => {
        // Autorizador de eventos, se for negado o pedido nada acontecerá.

        cartajogada = [carta[0], carta[2]]; // Formata a carta jogada em [naipe, carta]
        if (!autorizarEvento(socket.id, 'jogarcarta')){return;}
        let numpessoa = acharNumPessoa(jogadoresPorId[socket.id])

        cartaSelecionada = cartajogada;
        playerjogoucarta = true;
    });

    // Gerenciar o click no botão de TRUKO
    socket.on('botaotruko', () => {
        // Autorizador de eventos, se for negado o pedido nada acontecerá.
        if ( !autorizarEvento(socket.id, 'truko') ){return;}

        let jogador = jogadoresPorId[socket.id]
        timetrukado = (times["Time1"]["1"] === jogador || times["Time1"]["2"] === jogador) ? "Time2" : "Time1";

        io.to(socketjogadoratual).emit('alterarvisibilidade', 'botaotruko'); // Remove o botão truko do ui
        // Mostra as opções para truko e carrega a barra de tempo para o truko
        io.sockets.emit('pedirtruko', 'truko', jogador);
        // Carregar botões de aceitar correr +6 pros trukados
        io.to(jogadores[times[timetrukado]["1"]]).emit('alterarvisibilidade', 'positionbotoes');
        io.to(jogadores[times[timetrukado]["2"]]).emit('alterarvisibilidade', 'positionbotoes');

        jogadoresQueResponderamAoTruko = [] // Reseta essa variável para os próximos trukos
        trukopressionado = true

    });

    // Gerencia as ações do Truko do time trukado
    socket.on('trukohandler', (action) => {
        if ( !autorizarEvento(socket.id, 'trukoOpcoes', ['Executando a ação:'.blue, `${action}`.green] )){return;}

        let nomeJogador = jogadoresPorId[socket.id];
        if (!jogadoresQueResponderamAoTruko.includes(nomeJogador)) {
            jogadoresQueResponderamAoTruko.push(nomeJogador);
            io.to(socket.id).emit('alterarvisibilidade', 'positionbotoes');

            action = action === "+" ? "soma" : action;
            let posicao = times[timetrukado]['1'] === nomeJogador ? '1' : '2';
            io.sockets.emit('acaoTrukoAnuncio', `respostajogador${posicao}`,
                `${jogadoresPorId[socket.id]} ${action === "soma" ? "Somou!" : (action === "aceitar" ? "Aceitou!" : "Correu!")}`);

            trukoActionHandler(action);
        }
    });

});

// Autoriza os eventos e garante que ninguém tente bancar uma de engraçadinho na partida
function autorizarEvento(id, eventoExecutado, extra= ["Sem informações extra"]){
    // Caso especial para o evento de trukoOpcoes, já que são dois jogadores que tem que ser verificados e eles não são iguais ao jogador do turno atual
    if (eventoExecutado == 'trukoOpcoes' && eventStatusHandler != 'selecionarTimes'){
        return jogadoresPorId[id] == times[timetrukado]['1'] || jogadoresPorId[id] == times[timetrukado]['2'];
    }
    else if (eventStatusHandler == 'jogarcarta' && eventoExecutado == 'truko'){
        return true
    }
    // Checa se o evento tentando ser executado é o mesmo que está ocorrendo e se o id do jogador é o mesmo do jogador da rodada atual
    else if (eventStatusHandler != eventoExecutado || id != socketjogadoratual) {
        if (eventoExecutado == "selecionarTimes"){return  true;}
        else{
            console.log(
                '-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-'.red.bold, 'TRUKO'.yellow.bold, 'SECURITY'.red.bold, '-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- \n'.red.bold,
                'Evento recebido pelo client bloqueado!'.red.bold, `Evento:`.blue, `${eventoExecutado}`.green, `Jogador:`.blue, `${jogadoresPorId[id]}\n`.green,
                'Checkers do evento recebido:'.red.bold, 'EventCheck:'.blue, `${(eventStatusHandler != eventoExecutado) ? "BLOQUEADO" : "AUTORIZADO"}`.green, 'PlayerCheck'.blue, `${(id != socketjogadoratual) ? "BLOQUEADO" : "AUTORIZADO"}\n`.green,
                'Informações extras:'.red.bold, `${extra.join(' ')} \n`,
                '-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- \n'.red.bold);
            return false;
        }
    }
    else if (eventStatusHandler == 'jogarcarta'){
        let numpessoa = acharNumPessoa(jogadoresPorId[id])
        let cartasdojogador = eval(`cartaspessoa${numpessoa}`)
        // Resumidamente checa se a carta que o jogador jogou está nas cartas dele
        if (!cartasdojogador.some(carta => JSON.stringify(carta) === JSON.stringify(cartajogada))){
            console.log(
                '-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-'.red.bold, 'TRUKO'.yellow.bold, 'SECURITY'.red.bold, '-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- \n'.red.bold,
                'Tentativa de CartaInjection detectada e bloqueada!'.red.bold, `Evento:`.blue, `${eventStatusHandler}`.green, `Jogador:`.blue, `${jogadoresPorId[id]}\n`.green,
                'Carta que ele tentou jogar: '.blue, `${cartajogada}\n`.green,
                'Cartas do jogador: '.blue, `${eval(`cartaspessoa${acharNumPessoa(jogadoresPorId[id])}`)}\n`.green,
                '-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- \n'.red.bold);
            io.sockets.emit('mensagemerro', `O jogador ${jogadoresPorId[id]} tentou trapacear... ;(`)
            return false;
        }
    }
    return true
}

// ____________________________ Logar/adicionar/remover jogadores conectados da lista ____________________________
function jogadoresConectados(acao, nome){
    if (acao == "remover"){
        console.log(`[-] ${nome} se desconectou >:(`.red);
        for (let i = jogadoresconectados.length - 1; i >= 0; i--) {
            if (jogadoresconectados[i] === nome) {
                jogadoresconectados.splice(i, 1);
            }
        }
    }
    else if (acao == "adicionar"){
        jogadoresconectados.push(nome);
        console.log(`[+] ${nome} se conectou ao TruKo!`.green);
    }
    console.log(`[INFO] Jogadores conectados: ${jogadoresconectados} \n`.blue);
}

// ____________________________ BIBLIOTECA DE FUNÇÕES DO SERVIDOR  ____________________________

// Checa se o jogador que está tentando entrar no time já está em algum time
function checarJogadorInclusoTimes(nome){
    for (let i = 0; i < 3; i++){
        if (nome == times["Time1"][`${i}`] || nome == times["Time2"][`${i}`]){
            return true;
        }
    }
    return false;
}

function rodarTimerComecar(){ // TODO: Fazer com que se um jogador sair o timer cancela
    let temporestante = 5;
    const Intervalo = setInterval(() => {
        io.sockets.emit('timerinicio', temporestante);
        temporestante--;

        if (temporestante < 0) { // Quando o tempo é menor que 0 ele para o timer e inicia a função que starta o jogo
            clearInterval(Intervalo);
            gameStart().then(r => {
                console.log("Jogo finalizado");
            })
        }
    }, 1000);
}

function posicaoJogadoresUI(posicaojogadores) {
    // Esconde a div de times com todos os elementos + faz aparecer os assets do jogo
    io.sockets.emit('alterarvisibilidade', 'timesbox');
    io.sockets.emit('alterarvisibilidade', 'assetsjogo');
    for (let i = 0; i < 4; i++) {
        io.to(jogadoresID[i]).emit('carregarpessoas', posicaojogadores[i]); // Carrega o nome das pessoas dentro do html nas devidas posições
    }
}
// ______________________ Explicação abaixo ______________________:

// Posições de visão para cada jogador dentro do jogo, pq para cada pessoa a perspectiva deve ser diferente
//     Time1Pos1
//     1 pessoa: Time1Pos1 (1)
//     2 pessoa: Time2Pos1 (3)
//     3 pessoa: Time1Pos2 (2)
//     4 pessoa: Time2Pos2 (4)
//
//     Time1Pos2
//     1 pessoa: Time1Pos2
//     2 pessoa: Time2Pos2
//     3 pessoa: Time1Pos1
//     4 pessoa: Time2Pos1
//
//     Time2Pos1
//     1 pessoa: Time2Pos1
//     2 pessoa: Time1Pos1
//     3 pessoa: Time2Pos2
//     4 pessoa: Time1Pos2
//
//     Time2Pos2
//     1 pessoa: Time2Pos2
//     2 pessoa: Time1Pos2
//     3 pessoa: Time2Pos1
//     4 pessoa: Time1Pos1

// Carega uma imagem específica para os todos os jogadores
function carregarUmaImagemParaTodos(tipo, id, imagem){
    let imagemparacarregar
    if (tipo == "vira"){
        imagemparacarregar = `images/cartas/${imagem[0]}_${imagem[1]}.png`
        io.sockets.emit('carregarimagem', id, imagemparacarregar);
    }
    else if(tipo == "generico"){
        imagemparacarregar = `images/cartas/${imagem}.png`
            io.sockets.emit('carregarimagem', id, imagemparacarregar);
    }
}

// ____________________________FUNÇÕES MAIN DO JOGO____________________________

let pontosmao;
let pontosrodada;
let primeiroturno = true;
let cartaSelecionada = undefined;
let cartaspessoa1;
let cartaspessoa2;
let cartaspessoa3;
let cartaspessoa4;
let listajogadoresturno;
let cartasrodada = [];
let vira;
let maiorcarta;
let turnonum = 0;
let maonum = 0;
let pontoparatimequejogoucarta = [];
let rodadanum = 0;
let cartassalvaspessoas;
let jogadorescorrendo = 0
let timevencedormao;
let jogadorVencedorRodada;

// Controle dos intervalos de verificação e timers
let intervaloVerificacao;
let temporestante;

function gameStart() {

    pontosmao = {Time1: 0, Time2: 0};
    pontosrodada = {Time1: 0, Time2: 0};

    nomejogadorestime = [
        times['Time1']['1'],
        times['Time1']['2'],
        times['Time2']['1'],
        times['Time2']['2']
    ];
    jogadoresID = [
        jogadores[times['Time1']['1']],
        jogadores[times['Time1']['2']],
        jogadores[times['Time2']['1']],
        jogadores[times['Time2']['2']]
    ];
    let posicaojogadores = [                                       // Visão de:
        [nomejogadorestime[2], nomejogadorestime[1], nomejogadorestime[3]], // Time1Pos1
        [nomejogadorestime[3], nomejogadorestime[0], nomejogadorestime[2]], // Time1Pos2
        [nomejogadorestime[0], nomejogadorestime[3], nomejogadorestime[1]], // Time2Pos1
        [nomejogadorestime[1], nomejogadorestime[2], nomejogadorestime[0]]  // Time2Pos2
    ];

    posicaoJogadoresUI(posicaojogadores) //  Deixa a parte dos times invisível, coloca os assets do jogo visível
    // e ajusta a posição de todos os jogadores com as respectivas perspectivas
    console.log("JOGO INICIADO COM SUCESSO!!".bgYellow);
    return mao();
}

async function mao(){
    // Função que controla os pontos da mão e as ações da mão, não pode ser loop pq os pontos não são constantes
    // Uma mão é basicamente o ponto final do jogo,
    // aquele que fizer 12 pontos ganha uma mão, pode valer 1,3,6,9,12
    while(true){
        maonum++;

        resetarEAtualizarScoreboard();

        if(pontosmao["Time1"] >= 12){
            io.sockets.emit('atualizartexto', 'turnojogadortempo', 'Time 1 Venceu!');
            io.sockets.emit('atualizartexto', 'temporestantejogada', 'FIM');
            return timeVencedor("Time1")
        }
        else if(pontosmao["Time2"] >= 12){
            io.sockets.emit('atualizartexto', 'turnojogadortempo', 'Time 1 Venceu!');
            io.sockets.emit('atualizartexto', 'temporestantejogada', 'FIM');
            return timeVencedor("Time2")
        }

        let baralho = gerarBaralhoRandom();
        zerarpontos('rodada'); // zera os pontos da rodada porque é tipo 'rodada'

        for(let i = 2; i < 5; i++){
            for(let j = 1; j < 4; j++){
                let id2 = `c${i}pessoa${j}carta`
                io.sockets.emit('removerhidden', id2);
            }
        }

        // Pega as cartas do baralho, dá as cartas para os jogadores e mostra no HTML
        enviarCartasUI(baralho);
        // Colocar a primeira carta na mesa e carrega a imagem no html
        vira = baralho.pop();
        carregarUmaImagemParaTodos("vira", "vira", vira);
        // reset básico do valor da vitória de três rodada
        valorpontosmao = 1;
        // Reseta o vencedor da rodada
        jogadorVencedorRodada = null;

        let resultadoTruko = await rodada();

        console.log(`
-=-=-=-=-=-=-=-=-=-=-=-=- Resumo da mao ${maonum} -=-=-=-=-=-=-=-=-=-=-=-=- \n
        Time Vencedor Mao: ${timevencedormao}
        Valor Mao: ${valorpontosmao}
        Vira: ${vira}
        Truko: ${(resultadoTruko == 'truko')}
        Truko Aceito: ${(resultadoTruko == 'truko') ? trukoaceito : false}
        Rodada Normal: ${(resultadoTruko == 'rodada_completa')}
        TimeTrukou: ${(resultadoTruko == 'truko') ? (timetrukado === "Time1" ? "Time1" : "Time2") : null}
        TimeTrukado: ${(resultadoTruko == 'truko') ? timetrukado : null}
        Pontos Mao Time1: ${pontosmao["Time1"]}
        Pontos Mao Time2: ${pontosmao["Time2"]}
-=-=-=-=-=-=-=-=-=-=-=-=-                   -=-=-=-=-=-=-=-=-=-=-=-=-
        `.red);
    }
}

async function rodada() {
    while(true){
        // Uma rodada é 1/12 da mão, onde os jogadores precisam de 2 pontos para vencer
        let timevencedor;
        let carta;
        rodadanum++;
        primeiroturno = true;
        let cartasdosjogadoresrodada = [
            [...cartaspessoa1],
            [...cartaspessoa2],
            [...cartaspessoa3],
            [...cartaspessoa4]
        ];


        // Faz o gerenciamento dos 4 turnos
        for(let i = 0; i < 4; i++){
            carta = await turno();
            cartasrodada.push(carta);

            if(carta == 'mao'){
                console.log(`
-=-=-=-=-=-=-=-=-=-=-=-=- Resumo da rodada ${rodadanum} -=-=-=-=-=-=-=-=-=-=-=-=- \n
        Rodada vencida por Correr Truko: true
        Pontos Rodada Time1: ${pontosrodada.Time1}
        Pontos Rodada Time2: ${pontosrodada.Time2}
        Time Vencedor: ${timetrukado == "Time1" ? "Time1" : "Time2"}
        Time Que Perdeu: ${timetrukado}
        Cartas rodada: ${cartasrodada}
        Valor Pontos Mao: ${valorpontosmao}
-=-=-=-=-=-=-=-=-=-=-=-=-                   -=-=-=-=-=-=-=-=-=-=-=-=-
        `.yellow);
                for(let i = 1; i < 5; i++) { io.sockets.emit('removerhidden', `cartajogadapessoa${i}`); }
                for(let i = 1; i < 5; i++) { io.sockets.emit('alterarvisibilidade', `cartajogadapessoa${i}`); }
                pontoparatimequejogoucarta = [];
                cartasrodada = [];
                return 'truko';
            }
        }

        timevencedor = checkmaiorCarta(cartasrodada, vira); // Checar qual é a carta mais forte

        jogadorVencedorRodada = encontrarJogadorComCarta(cartasdosjogadoresrodada, maiorcarta);

        // Tira as cartas jogadas da mesa
        for(let i = 1; i < 5; i++) { io.sockets.emit('alterarvisibilidade', `cartajogadapessoa${i}`); }

        // Checa o time que fez o ponto da rodada e atribui o ponto ao time
        timevencedor = timevencedor % 2 == 0? "Time2" : "Time1";
        let timeperdedor = timevencedor == "Time1"? "Time2" : "Time1"
        pontosrodada[timevencedor] += 1;

        timevencedormao = pontosrodada["Time1"] > pontosrodada["Time2"] && pontosrodada["Time1"] >= 2? "Time1" : "Time2";

        console.log(`
-=-=-=-=-=-=-=-=-=-=-=-=- Resumo da rodada ${rodadanum} -=-=-=-=-=-=-=-=-=-=-=-=- \n
        Rodada vencida por Correr Truko: false
        Pontos Rodada Time1: ${pontosrodada.Time1}
        Pontos Rodada Time2: ${pontosrodada.Time2}
        Time Vencedor: ${timevencedor}
        Time Que Perdeu: ${timeperdedor}
        Carta mais forte: ${maiorcarta}
        Jogador Que Ganhou: ${jogadorVencedorRodada}
        PlayerJogouCarta: ${playerjogoucarta}
        Cartas rodada: ${cartasrodada}
        Valor Pontos Mao: ${valorpontosmao}
        Time Vendedor Mao: ${timevencedormao}
-=-=-=-=-=-=-=-=-=-=-=-=-                   -=-=-=-=-=-=-=-=-=-=-=-=-
        `.yellow);

        // Reseta as variáveis que são usadas na rodada
        pontoparatimequejogoucarta = [];
        cartasrodada = [];

        // Checa se um dos times já fez 2 pontos na rodada
        if ((pontosrodada.Time1 == 2 || pontosrodada.Time2 == 2) && pontosrodada.Time1 != pontosrodada.Time2) {
            pontosmao[timevencedormao] += valorpontosmao;
            let idstirarhidden = [
                'c1pessoa1carta','c1pessoa2carta','c1pessoa3carta',
                'c2pessoa1carta','c2pessoa2carta','c2pessoa3carta',
                'c3pessoa1carta','c3pessoa2carta','c3pessoa3carta',
                'c4pessoa1carta','c4pessoa2carta','c4pessoa3carta'
            ]
            for(let i= 0; i < idstirarhidden.length; i++){ io.sockets.emit('removerhidden', idstirarhidden[i])}


            return 'rodada_completa';
        }
        atualizarScoreboardPontos(timevencedor,timeperdedor); // Atualiza HUD do jogo
    }
}

async function turno() {

    turnonum++;
    let jogadoratual = gerenciadorDeJogadoresNosTurnos(); // Retorna o primeiro jogador na lista aleatória de quem começa,
    // depois joga o primeiro jogador para a última fileira e o próximo será o segundo
    let numpessoa = acharNumPessoa(jogadoratual)
    socketjogadoratual = jogadores[jogadoratual];
    cartaSelecionada = undefined;
    playerjogoucarta = false;
    trukopressionado = false;
    eventStatusHandler = 'jogarcarta'
    primeiroturno = false;

    io.to(socketjogadoratual).emit('alterarvisibilidade', 'botaotruko');

    let carta = await obterCarta(jogadoratual,numpessoa);
    // Se for jogada uma carta normal e nao apertado truko
    if (!(carta == 'Truko')) {
        io.to(socketjogadoratual).emit('alterarvisibilidade', 'botaotruko');
        console.log(`
-=-=-=-=-=-=-=-=-=-=-=-=- Resumo do turno ${turnonum} -=-=-=-=-=-=-=-=-=-=-=-=- \n
        Jogador atual: ${jogadoratual}
        Socket atual: ${socketjogadoratual}
        Truko: false
        PlayerJogouCarta: ${playerjogoucarta}
        Carta jogada: ${carta}
        Cartas do jogador: ${cartassalvaspessoas[numpessoa-1]}
-=-=-=-=-=-=-=-=-=-=-=-=-                   -=-=-=-=-=-=-=-=-=-=-=-=-
        `.blue);
        return carta;


    }

    // Tratar tudo relacionado ao truko aceito
    let respostaTruko = await trukoAcoes();

    io.to(socketjogadoratual).emit('adicionarhidden', 'botaotruko');

    if (respostaTruko == 'aceito'){
        io.sockets.emit('atualizartexto', 'botaotrukotexto', '+3');

        let posicao = times[timetrukado]['1'] === jogadoresQueResponderamAoTruko[0] ? '2' : '1';

        io.to(jogadores[`${times[timetrukado][posicao]}`]).emit('adicionarhidden', 'positionbotoes');

        // consorle.log(timetrukado, posicao, jogadoresQueResponderamAoTruko[0],times[timetrukado][posicao], jogadores[`${times[timetrukado][posicao]}`]);

        eventStatusHandler = 'jogarcarta'
        carta = await obterCarta(jogadoratual,numpessoa);
        console.log(`
-=-=-=-=-=-=-=-=-=-=-=-=- Resumo do turno ${turnonum} -=-=-=-=-=-=-=-=-=-=-=-=- \n
        Jogador atual: ${jogadoratual}
        Socket atual: ${socketjogadoratual}
        Truko: true
        TimeTrukado: ${timetrukado}
        TimeTrukou: ${timetrukado === "Time1" ? "Time1" : "Time2"}
        Resposta Truko: ${respostaTruko}
        JogadoresQueResponderamTruko: ${jogadoresQueResponderamAoTruko}
        PlayerJogouCarta: ${playerjogoucarta}
        Carta jogada: ${carta}
        Cartas do jogador: ${cartassalvaspessoas[numpessoa-1]}
-=-=-=-=-=-=-=-=-=-=-=-=-                   -=-=-=-=-=-=-=-=-=-=-=-=-
        `.blue);
        return carta;
    }

    else if (respostaTruko == 'recusado'){
        console.log(`
-=-=-=-=-=-=-=-=-=-=-=-=- Resumo do turno ${turnonum} -=-=-=-=-=-=-=-=-=-=-=-=- \n
        Jogador atual: ${jogadoratual}
        Socket atual: ${socketjogadoratual}
        Truko: true
        TimeTrukado: ${timetrukado}
        TimeTrukou: ${timetrukado === "Time1" ? "Time1" : "Time2"}
        Resposta Truko: ${respostaTruko}
        JogadoresQueResponderamTruko: ${jogadoresQueResponderamAoTruko}
        Carta jogada: ${carta}
        Cartas do jogador: ${cartassalvaspessoas[numpessoa-1]}
-=-=-=-=-=-=-=-=-=-=-=-=-                   -=-=-=-=-=-=-=-=-=-=-=-=-
        `.blue);
        return 'mao';
    }

}

// Handler da carta jogada ou não jogada resumindo
async function obterCarta(jogadoratual, numpessoa) {

    io.sockets.emit('carregarbarradetempo', jogadoratual);
    let tempoesgotado = false;

    let cartaSelecionada1 = await new Promise((promessa) => {
        // Verifica a cada 100 ms se o jogador jogou uma carta, se ele jogou uma carta o checker acaba e o timeout de jogada automatica para também e ele retorna o .then do Promise, que retorna a carta que jogador jogou.
        intervaloVerificacao = setInterval(() => {
            if (playerjogoucarta) {
                clearInterval(intervaloVerificacao);
                clearTimeout(temporestante);
                removerCarta(jogadoratual, cartajogada, numpessoa);
                promessa(cartajogada);
            } else if (trukopressionado) {
                trukopressionado = false; // Se não colocar false roda um loop infinito nas verificações
                clearInterval(intervaloVerificacao);
                clearTimeout(temporestante);
                promessa("Truko");
            }
        }, 100);

        temporestante = setTimeout(() => {
            if (!playerjogoucarta) {
                clearInterval(intervaloVerificacao);
                cartaSelecionada = jogarPrimeiraCarta(jogadoratual, numpessoa);
                tempoesgotado = true;
                promessa(cartaSelecionada);
            }
        }, 10000);
    });
    io.sockets.emit('carregarbarradetempo', 'parartimer');
    return cartaSelecionada1;


}

// FUNÇÕES DE AUXÍLIO PARA A LÓGICA PRINCIPAL DO JOGO
function jogarPrimeiraCarta(jogador, pessoa){ // Joga a primeira carta do jogador atual porque ele não jogou uma carta
    let jogadorcarta = eval(`cartaspessoa${pessoa}`); // Retorna a lista de cartas do jogador
    let primeiracarta = jogadorcarta.find(cartas => cartas[0] !== "Removido");
    cartajogada = primeiracarta;
    removerCarta(jogador, primeiracarta, pessoa);
    return primeiracarta;
}

// Envia as cartas para os jogadores com socket e dá as cartas aos jogadores
function enviarCartasUI(baralho){

    cartaspessoa1 = [baralho.pop(), baralho.pop(), baralho.pop()];
    cartaspessoa2 = [baralho.pop(), baralho.pop(), baralho.pop()];
    cartaspessoa3 = [baralho.pop(), baralho.pop(), baralho.pop()];
    cartaspessoa4 = [baralho.pop(), baralho.pop(), baralho.pop()];

    const cartaspessoas = [cartaspessoa1, cartaspessoa2, cartaspessoa3, cartaspessoa4];

    cartassalvaspessoas = [];
    cartassalvaspessoas.push([...cartaspessoa1], [...cartaspessoa2], [...cartaspessoa3], [...cartaspessoa4]);

    for(let i = 0; i < 4; i++){ // For loop tem que mostrar para 4 jogadores e só pode mostrar 3 cartas
        io.to(jogadores[nomejogadorestime[i]]).emit('carregarcartas', cartaspessoas[i]);
    }
}

// __________________________RANDOMIZAR COISAS____________________________
function randomizar(randomizarlista){
    let currentIndex = randomizarlista.length;

    while (currentIndex !== 0) {
        let randomIndex = Math.floor(Math.random() * randomizarlista.length);
        currentIndex -= 1;

        let temp = randomizarlista[currentIndex];
        randomizarlista[currentIndex] = randomizarlista[randomIndex];
        randomizarlista[randomIndex] = temp;
    }
    return randomizarlista
}

// ____________________________GERAR O BARALHO____________________________
function gerarBaralhoRandom(){
    let naipes = ["C", "O", "P", "E"] // pepe breathing copium :skullface:
    let valores = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"]
    let baralhoinicial = []
    for (let naipe of naipes){
        for (let valor of valores){
            baralhoinicial.push([naipe, valor])
        }
    }
    return randomizar(baralhoinicial)
}

// Acha o número da pessoa para passar usar para verificar a variável de cartas
function acharNumPessoa(jogadoratual){
    return nomejogadorestime.indexOf(jogadoratual) + 1
}

// ____________________________ZERAR PONTOS TIMES____________________________
function zerarpontos(tipodeponto){
    // tipos:
    // 0- pontosrodada
    // 1- pontosmao
    // 2- zerar todos os pontos do jogo
    if (tipodeponto == 'rodada') {
        pontosrodada["Time1"] = 0;
        pontosrodada["Time2"] = 0;
        rodadanum = 0;
    }
    else if (tipodeponto == 'mao'){
        pontosmao["Time1"] = 0;
        pontosmao["Time2"] = 0;
    }
    else if (tipodeponto == 'todos'){
        pontosmao["Time1"] = 0;
        pontosrodada["Time1"] = 0;
        pontosrodada["Time2"] = 0;
        pontosmao["Time2"] = 0;
        // zerar todos os pontos do jogo
    }
}

// ____________________________REMOVE A CARTA DE UM JOGADOR____________________________
function removerCarta(jogador, cartaremover, pessoa){
    let cartasjogador = eval(`cartaspessoa${pessoa}`); // Retorna a lista de cartas do jogador
    let numerodacarta = -1;

    for(let i = 0; i < 3; i++){
        if(cartassalvaspessoas[pessoa-1][i][0] === cartaremover[0] && cartassalvaspessoas[pessoa-1][i][1] === cartaremover[1]){
            // Marca a carta como "Removido" em ambas as listas
            cartassalvaspessoas[pessoa-1][i] = "Removido";
            numerodacarta = i;
            break; // Sai do loop após encontrar a carta
        }
    }

    if(numerodacarta !== -1){
        updateCartasUI(jogador, numerodacarta, cartassalvaspessoas[pessoa-1]);
        pontoparatimequejogoucarta.push(jogador);
    } else {
        console.error(`Carta ${cartaremover} não encontrada para o jogador ${jogador}`);
    }
}

// ____________________________GIRA O TURNO DOS JOGADORES____________________________
function gerenciadorDeJogadoresNosTurnos(){ // Gerencia o jogador atual no turno, seta a sequência de quem começa, roda a lista do turno
    let possibilidadesprimeirojogador;
    if (primeiroturno){
        // se na rodada anterior teve um vencedor esse vencedor torna a carta
        if(jogadorVencedorRodada){
            let indexVencedor = listajogadoresturno.indexOf(jogadorVencedorRodada);

            // Pega o index do nome do vencedor, coloca no começo e concatena com o resto dos nomes
            let rotacionado = listajogadoresturno.slice(indexVencedor).concat(listajogadoresturno.slice(0, indexVencedor));
            let jogador1 = rotacionado[0];
            rotacionado.shift();
            rotacionado.push(jogador1);

            listajogadoresturno = rotacionado;
            return jogadorVencedorRodada;
        }

        possibilidadesprimeirojogador = [
            [times['Time1']['1'], times['Time2']['1'], times['Time1']['2'], times['Time2']['2']],
            [times['Time2']['1'], times['Time1']['1'], times['Time2']['2'], times['Time1']['2']],
            [times['Time1']['2'], times['Time2']['2'], times['Time1']['1'], times['Time2']['1']],
            [times['Time2']['2'], times['Time1']['2'], times['Time2']['1'], times['Time1']['1']]
        ];
        primeiroturno = false
        listajogadoresturno = randomizar(possibilidadesprimeirojogador)[0]; // Randomiza as possibilidades para escolher quem começa o jogo
    }
    let jogador1 = listajogadoresturno[0]; // Faz com que o primeiro jogador da lista seja salvo
    listajogadoresturno.shift(); // Remove o primeiro jogador da lista
    listajogadoresturno.push(jogador1); // Coloca  primeiro jogador no fundo da lista
    return jogador1;
}

// ____________________________ CHECA QUAL A CARTA MAIS FORTE DO TURNO ____________________________
function checkmaiorCarta(cartascheck, manilhacheck) {
    let cartasForca = {"4": 0, "5": 1, "6": 2, "7": 3, "Q": 4, "J": 5, "K": 6, "A": 7, "2": 8, "3": 9};
    let nipeForca = {"O": 0, "E": 1, "C": 2, "P": 3};
    let manilhachecks = [];

    // Identifica a manilha baseada na carta "vira"
    let viraValor = manilhacheck[1];
    let viraPos = cartasForca[viraValor];
    let manilhaValor = Object.keys(cartasForca).find(key => cartasForca[key] === (viraPos + 1) % 10);

    cartasForca[manilhaValor] = 10;

    let maiorvalor = -1;
    maiorcarta = null;
    let timevencedor;
    let empateCartas = []; // Lista para armazenar cartas empatadas

    // Checar o maior valor da carta
    for (let i = 0; i < 4; i++) {
        let carta = cartascheck[i];
        let valorCarta = cartasForca[carta[1]];

        if (valorCarta > maiorvalor) {
            maiorvalor = valorCarta;
            maiorcarta = carta;
            empateCartas = [carta]; // Resetar lista de empates
        } else if (valorCarta === maiorvalor) {
            empateCartas.push(carta); // Adicionar à lista de empates
        }

        if (carta[1] === manilhaValor) {
            manilhachecks.push(carta);
        }
    }

    // Resolver empate de cartas não manilhas
    if (empateCartas.length > 1 && maiorvalor < 10) { // Maiorvalor < 10 significa que não é manilha
        return "empate"; // Retornar estado de empate
    }

    // Checa se tem uma manilha e qual é a manilha mais forte
    if (manilhachecks.length >= 1) {
        let maiorManilha = manilhachecks[0];
        for (let i = 1; i < manilhachecks.length; i++) {
            if (nipeForca[manilhachecks[i][0]] > nipeForca[maiorManilha[0]]) {
                maiorManilha = manilhachecks[i];
            }
        }
        maiorcarta = maiorManilha;
    }

    // Determina o time vencedor com base na maior carta
    for (let i = 0; i < cartascheck.length; i++) {
        if (cartascheck[i] === maiorcarta) {
            if (times['Time1']['1'] === pontoparatimequejogoucarta[i] || times['Time1']['2'] === pontoparatimequejogoucarta[i]) {
                    timevencedor = '1';
            } else {
                timevencedor = '2';
            }
            break;
        }
    }

    return timevencedor;
}

function atualizarScoreboardPontos(timevencedor, timeperdedor){
    // Atualiza o scoreboardzinho dos círculos no html
    io.to(jogadores[times[timevencedor]["1"]]).emit('carregarimagem', `seutime${rodadanum}`, `images/circuloverde.png`);
    io.to(jogadores[times[timevencedor]["2"]]).emit('carregarimagem', `seutime${rodadanum}`, `images/circuloverde.png`);
    io.to(jogadores[times[timevencedor]["1"]]).emit('carregarimagem', `outrotime${rodadanum}`, `images/circulovermelho.png`);
    io.to(jogadores[times[timevencedor]["2"]]).emit('carregarimagem', `outrotime${rodadanum}`, `images/circulovermelho.png`);

    io.to(jogadores[times[timeperdedor]["1"]]).emit('carregarimagem', `seutime${rodadanum}`, `images/circulovermelho.png`);
    io.to(jogadores[times[timeperdedor]["2"]]).emit('carregarimagem', `seutime${rodadanum}`, `images/circulovermelho.png`);
    io.to(jogadores[times[timeperdedor]["1"]]).emit('carregarimagem', `outrotime${rodadanum}`, `images/circuloverde.png`);
    io.to(jogadores[times[timeperdedor]["2"]]).emit('carregarimagem', `outrotime${rodadanum}`, `images/circuloverde.png`);

}

//____________________________GERENCIA AÇÕES AO APERTAR TRUKO____________________________
async function trukoAcoes() {
    eventStatusHandler = 'trukoOpcoes';
    trukoaceito = await trukoWaiter(); // Aguardar a resposta de trukoWaiter

    io.sockets.emit('pedirtruko', 'parartimer', null);
    jogadorescorrendo = 0;
    io.sockets.emit('atualizartexto', 'valorpontosmao', valorpontosmao);

    io.to(socketjogadoratual).emit('alterarvisibilidade', 'botaotruko');

    if (trukoaceito) {
        return 'aceito';
    }
    else {
        return 'recusado';
    }
}

function encontrarJogadorComCarta(cartas, cartabuscada) {
    let jogadoresNomes = [times['Time1']['1'], times['Time1']['2'], times['Time2']['1'], times['Time2']['2']];

    // Itera sobre os jogadores de 1 a 4
    for (let i = 0; i < cartas.length; i++) {
        const jogadorNumero = i;
        const cartasDoJogador = cartas[i];

        for (let j = 0; j < cartasDoJogador.length; j++) {
            const carta = cartasDoJogador[j];
            // Verifica se a carta atual corresponde à carta buscada
            if (carta[0] === cartabuscada[0] && carta[1] === cartabuscada[1]) {
                return jogadoresNomes[jogadorNumero]; // Retorna o número do jogador
            }
        }
    }
    return null; // Retorna null se a carta não for encontrada
}

// Aguarda os jogadores selecionarem aceitar ou correr ou somar
function trukoWaiter() {
    let tempoesgotado = false;

    trukoaceito = false; // resetar o truko aceito para não aceitar o truko direto na segunda tentativa de truko

    io.sockets.emit('pedirtruko', 'truko', jogadoresPorId[socketjogadoratual]);
    return new Promise(async (promessa) => {
        intervaloVerificacao = setInterval(() => {
            if (jogadoresQueResponderamAoTruko.length === 2 || trukoaceito === true) {
                clearInterval(intervaloVerificacao);
                clearTimeout(temporestante);
                promessa(trukoaceito); // Resolver Promise conforme o valor de `trukoaceito`
            }
        }, 100);

        temporestante = setTimeout(() => {
            if (!trukoaceito) {
                clearInterval(intervaloVerificacao);
                console.log("Truko não foi aceito porque os jogadores demoraram demais para aceitar/correr/+6");
                promessa(false); // Promise resolvida com `false` caso o tempo esgote
            }
        }, 15000);
    });
}

// ____________________________GERENCIA AS AÇÕES DAS PESSOAS QUE RECEBERAM TRUKO____________________________
function trukoActionHandler(action) {
    let timequepediutruko = timetrukado === "Time1" ? "Time2" : "Time1";

    if (action === 'soma') {
        valorpontosmao = (valorpontosmao === 1 ? 6 : valorpontosmao + 6);
        trukoaceito = true;
    } else if (action === 'aceitar') {
        valorpontosmao = (valorpontosmao === 1 ? 3 : valorpontosmao + 3);
        trukoaceito = true;
    } else if (action === 'correr') {
        jogadorescorrendo++;
        if (jogadorescorrendo === 2) {
            pontosmao[timequepediutruko] += valorpontosmao;
            trukoaceito = false;
        }
    }
}

// Atualiza as cartas dos jogadores na visão de cada um e a posição da carta na frente do jogador
function updateCartasUI(jogadoratual, numcarta, cartasjogador){

    // Remove a carta na visão de 1º pessoa
    io.to(jogadores[jogadoratual]).emit('alterarvisibilidade', `c1pessoa${numcarta+1}carta`); // c1pessoa${numerodacarta+1}carta é o id no html da carta que o jogador selecionou

    let posjogadoratual = nomejogadorestime.indexOf(jogadoratual)
    const poscartadeletar = cartasjogador.filter(element => element === "Removido").length;
    // Para quando a pessoa 1 clicar
    if(nomejogadorestime[0] == jogadoratual){
        // Mostrar a carta para cada pessoa de uma perspectiva diferente:
        // Pessoa 1:
        io.to(jogadores[jogadoratual]).emit('alterarvisibilidade', `cartajogadapessoa1`);
        io.to(jogadores[jogadoratual]).emit('carregarimagem', `cartajogadapessoa1`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        // Pessoa 2:
        io.to(jogadores[nomejogadorestime[1]]).emit('alterarvisibilidade', `cartajogadapessoa3`);
        io.to(jogadores[nomejogadorestime[1]]).emit('carregarimagem', `cartajogadapessoa3`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        io.to(jogadores[nomejogadorestime[1]]).emit('alterarvisibilidade', `c3pessoa${poscartadeletar}carta`);
        // Pessoa 3:
        io.to(jogadores[nomejogadorestime[2]]).emit('alterarvisibilidade', `cartajogadapessoa2`);
        io.to(jogadores[nomejogadorestime[2]]).emit('carregarimagem', `cartajogadapessoa2`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        io.to(jogadores[nomejogadorestime[2]]).emit('alterarvisibilidade', `c2pessoa${poscartadeletar}carta`);
        // Pessoa 4:
        io.to(jogadores[nomejogadorestime[3]]).emit('alterarvisibilidade', `cartajogadapessoa4`);
        io.to(jogadores[nomejogadorestime[3]]).emit('carregarimagem', `cartajogadapessoa4`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        io.to(jogadores[nomejogadorestime[3]]).emit('alterarvisibilidade', `c4pessoa${poscartadeletar}carta`);
    }
    // Para quando a pessoa 2 clicar
    else if(nomejogadorestime[1] == jogadoratual){
        // Pessoa 1:
        io.to(jogadores[nomejogadorestime[0]]).emit('alterarvisibilidade', `cartajogadapessoa3`);
        io.to(jogadores[nomejogadorestime[0]]).emit('carregarimagem', `cartajogadapessoa3`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        io.to(jogadores[nomejogadorestime[0]]).emit('alterarvisibilidade', `c3pessoa${poscartadeletar}carta`);
        // Pessoa 2:
        io.to(jogadores[jogadoratual]).emit('alterarvisibilidade', `cartajogadapessoa1`);
        io.to(jogadores[jogadoratual]).emit('carregarimagem', `cartajogadapessoa1`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        // Pessoa 3:
        io.to(jogadores[nomejogadorestime[2]]).emit('alterarvisibilidade', `cartajogadapessoa4`);
        io.to(jogadores[nomejogadorestime[2]]).emit('carregarimagem', `cartajogadapessoa4`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        io.to(jogadores[nomejogadorestime[2]]).emit('alterarvisibilidade', `c4pessoa${poscartadeletar}carta`);
        // Pessoa 4:
        io.to(jogadores[nomejogadorestime[3]]).emit('alterarvisibilidade', `cartajogadapessoa2`);
        io.to(jogadores[nomejogadorestime[3]]).emit('carregarimagem', `cartajogadapessoa2`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        io.to(jogadores[nomejogadorestime[3]]).emit('alterarvisibilidade', `c2pessoa${poscartadeletar}carta`);
    }
    // Para quando a pessoa 3 clicar
    else if(nomejogadorestime[2] == jogadoratual){
        //Pessoa 1
        io.to(jogadores[nomejogadorestime[0]]).emit('alterarvisibilidade', `cartajogadapessoa2`);
        io.to(jogadores[nomejogadorestime[0]]).emit('carregarimagem', `cartajogadapessoa2`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        io.to(jogadores[nomejogadorestime[0]]).emit('alterarvisibilidade', `c2pessoa${poscartadeletar}carta`);
        // Pessoa 2:
        io.to(jogadores[nomejogadorestime[1]]).emit('alterarvisibilidade', `cartajogadapessoa4`);
        io.to(jogadores[nomejogadorestime[1]]).emit('carregarimagem', `cartajogadapessoa4`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        io.to(jogadores[nomejogadorestime[1]]).emit('alterarvisibilidade', `c4pessoa${poscartadeletar}carta`);
        // Pessoa 3:
        io.to(jogadores[jogadoratual]).emit('alterarvisibilidade', `cartajogadapessoa1`);
        io.to(jogadores[jogadoratual]).emit('carregarimagem', `cartajogadapessoa1`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        // Pessoa 4:
        io.to(jogadores[nomejogadorestime[3]]).emit('alterarvisibilidade', `cartajogadapessoa3`);
        io.to(jogadores[nomejogadorestime[3]]).emit('carregarimagem', `cartajogadapessoa3`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        io.to(jogadores[nomejogadorestime[3]]).emit('alterarvisibilidade', `c3pessoa${poscartadeletar}carta`);
    }
    // Para quando a pessoa 4 clicar
    else if(nomejogadorestime[3] == jogadoratual){
        io.to(jogadores[nomejogadorestime[0]]).emit('alterarvisibilidade', `cartajogadapessoa4`);
        io.to(jogadores[nomejogadorestime[0]]).emit('carregarimagem', `cartajogadapessoa4`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        io.to(jogadores[nomejogadorestime[0]]).emit('alterarvisibilidade', `c4pessoa${poscartadeletar}carta`);
        // Pessoa 2:
        io.to(jogadores[nomejogadorestime[1]]).emit('alterarvisibilidade', `cartajogadapessoa2`);
        io.to(jogadores[nomejogadorestime[1]]).emit('carregarimagem', `cartajogadapessoa2`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        io.to(jogadores[nomejogadorestime[1]]).emit('alterarvisibilidade', `c2pessoa${poscartadeletar}carta`);
        // Pessoa 3:
        io.to(jogadores[nomejogadorestime[2]]).emit('alterarvisibilidade', `cartajogadapessoa3`);
        io.to(jogadores[nomejogadorestime[2]]).emit('carregarimagem', `cartajogadapessoa3`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
        io.to(jogadores[nomejogadorestime[2]]).emit('alterarvisibilidade', `c3pessoa${poscartadeletar}carta`);
        // Pessoa 4:
        io.to(jogadores[jogadoratual]).emit('alterarvisibilidade', `cartajogadapessoa1`);
        io.to(jogadores[jogadoratual]).emit('carregarimagem', `cartajogadapessoa1`, `images/cartas/${cartajogada[0]}_${cartajogada[1]}.png`);
    }
    else{
        console.log('ERRO NENHUM JOGADOR ENCONTRADO PARA ATUALIZAR O UI, function: updateUI')
    }
}

// Reseta os círculos na scoreboard e atualiza os pontos da mão
function resetarEAtualizarScoreboard() {
    // Reseta scoreboard das rodadas
    io.sockets.emit('carregarimagem', `seutime1`, `images/circulo.png`);
    io.sockets.emit('carregarimagem', `seutime2`, `images/circulo.png`);
    io.sockets.emit('carregarimagem', `seutime3`, `images/circulo.png`);

    io.sockets.emit('carregarimagem', `outrotime1`, `images/circulo.png`);
    io.sockets.emit('carregarimagem', `outrotime2`, `images/circulo.png`);
    io.sockets.emit('carregarimagem', `outrotime3`, `images/circulo.png`);

    // Atualiza os pontos do lado dos círculos no html

    io.to(jogadores[times["Time1"]["1"]]).emit('atualizartexto', `seutimepontos`, `${pontosmao["Time1"]}`);
    io.to(jogadores[times["Time1"]["2"]]).emit('atualizartexto', `seutimepontos`, `${pontosmao["Time1"]}`);
    io.to(jogadores[times["Time1"]["1"]]).emit('atualizartexto', `outrotimepontos`, `${pontosmao["Time2"]}`);
    io.to(jogadores[times["Time1"]["2"]]).emit('atualizartexto', `outrotimepontos`, `${pontosmao["Time2"]}`);

    io.to(jogadores[times["Time2"]["1"]]).emit('atualizartexto', `seutimepontos`, `${pontosmao["Time2"]}`);
    io.to(jogadores[times["Time2"]["2"]]).emit('atualizartexto', `seutimepontos`, `${pontosmao["Time2"]}`);
    io.to(jogadores[times["Time2"]["1"]]).emit('atualizartexto', `outrotimepontos`, `${pontosmao["Time1"]}`);
    io.to(jogadores[times["Time2"]["2"]]).emit('atualizartexto', `outrotimepontos`, `${pontosmao["Time1"]}`);

    io.sockets.emit('atualizartexto', 'valorpontosmao', 1);
    io.sockets.emit('atualizartexto', 'botaotrukotexto', 'TRUKO');

}

// ____________________________FAZ AS AÇÕES DE QUEM VENCEU O JOGO____________________________
function timeVencedor(time){
    // fazer a lógica de o que acontece quando algum time vence o jogo
    let tempopausa = setTimeout(() => {}, 2000);

    console.log(`|----------------------------| \n
                 |         FIM DO JOGO        | \n
                 |----------------------------|`)
}
