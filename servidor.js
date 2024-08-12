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
let valorpontosrodada = 1;
let timetrukado;
let socketjogadoratual;
let nomejogadorestime;
let jogadoresID;
let jogadoresQueResponderamAoTruko = [];
let trukoaceito = false;
let eventStatusHandler = "selecionarTimes";
let trukopressionado

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
        console.log(`Carta jogada pelo jogador com ID: ${socket.id}, carta:`, cartaSelecionada);
    });

    // Gerenciar o click no botão de TRUKO
    socket.on('botaotruko', () => {
        // Autorizador de eventos, se for negado o pedido nada acontecerá.
        if ( !autorizarEvento(socket.id, 'truko') ){return;}

        let jogador = jogadoresPorId[socket.id]
        timetrukado = (times["Time1"]["1"] === jogador || times["Time1"]["2"] === jogador) ? "Time2" : "Time1";
        console.log(`Botao de truko pressionado por: ${socket.id}, jogador: ${jogador}`);
        console.log(`time trukado: ${timetrukado}, membros do time trukado: ${times[timetrukado]["1"]}, ${times[timetrukado]["2"]}`);

        io.to(socketjogadoratual).emit('alterarvisibilidade', 'botaotruko'); // Remove o botão truko do ui
        // Mostra as opções para truko e carrega a barra de tempo para o truko
        io.sockets.emit('alterarvisibilidade', 'repostatruko');
        io.sockets.emit('pedirtruko', 'truko', jogador);
        // Carregar botões de aceitar correr +6 pros trukados
        io.to(jogadores[times[timetrukado]["1"]]).emit('alterarvisibilidade', 'positionbotoes');
        io.to(jogadores[times[timetrukado]["2"]]).emit('alterarvisibilidade', 'positionbotoes');

        jogadoresQueResponderamAoTruko = [] // Reseta essa variável para os próximos trukos
        trukopressionado = true

    });

    // Gerencia as ações do Truko do time trukado
    socket.on('trukohandler', (action) => { // Controla as ações que os botões de truko fazem

        // Autorizador de eventos, se for negado o pedido nada acontecerá.
        if ( !autorizarEvento(socket.id, 'trukoOpcoes', ['Executando a ação:'.blue, `${action}`.green] )){return;}

        let nomeJogador = jogadoresPorId[socket.id];
        console.log(!(jogadoresQueResponderamAoTruko.includes(nomeJogador)))
        if(!(jogadoresQueResponderamAoTruko.includes(nomeJogador))) { // Checa se o mesmo jogador que clicou já deu uma resposta

            jogadoresQueResponderamAoTruko.push(nomeJogador);
            io.to(socket.id).emit('alterarvisibilidade', 'positionbotoes');

            action = action == "+" ? "soma" : action;
            let posicao = times['Time1']['1'] == nomeJogador ? '1' : '2';
            io.sockets.emit('alterarvisibilidade', `respostajogador${posicao}`);
            io.sockets.emit('atualizartexto', `respostajogador${posicao}`, `${jogadoresPorId[socket.id]} ${action == "soma" ? "Somou!" : (action == "aceitar" ? "Aceitou!" : (action == "correr" ? "Correu!" : "ERRO"))}`);

            console.log(`jogador que clicou na acao do truko: ${nomeJogador} ${socket.id}, ação: ${action}`)

            return trukoActionHandler(action);
        }
    })
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
                'Tentativa de CartaInjection detectada e bloqueada!'.red.bold, `Evento:`.blue, `jogarcarta`.green, `Jogador:`.blue, `${jogadoresPorId[id]}\n`.green,
                'Carta que ele tentou jogar: '.blue, `${cartajogada}\n`.green,
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
                print("Jogo finalizado")
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
let primeiroturno = true

let cartaSelecionada = undefined;
let cartaspessoa1;
let cartaspessoa2;
let cartaspessoa3;
let cartaspessoa4;
let listajogadoresturno;
let cartasrodada = [];
let vira;
let pontoparatimequejogoucarta = [];
let rodadanum = 0;
let cartassalvaspessoas;
let jogadorescorrendo = 0

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

    return mao()
}

function mao(){
    // Função que controla os pontos da mão e as ações da mão, não pode ser loop pq os pontos não são constantes
    // Uma mão é basicamente o ponto final do jogo,
    // aquele que fizer 12 pontos ganha uma mão, pode valer 1,3,6,9,12

    console.log('COMEÇO DA MÃO'.bgWhite.black)

    zerarpontos('rodada'); // zera os pontos da rodada porque é tipo 'rodada'

    if(pontosmao["Time1"] >= 12){
        return timeVencedor("Time1")
    }
    else if(pontosmao["Time2"] >= 12){
        return timeVencedor("Time2")
    }

    let baralho = gerarBaralhoRandom();

    // Pega as cartas do baralho, dá as cartas para os jogadores e mostra no HTML
    enviarCartasUI(baralho);

    // Colocar a primeira carta na mesa e carrega a imagem no html
    vira = baralho.pop();
    carregarUmaImagemParaTodos("vira", "vira", vira);

    resetarEAtualizarScoreboard()

    // reset básico do valor da vitória de três rodada
    valorpontosrodada = 1;
    return rodada().then(() => {
        return mao();
    });
}

async function rodada() {
    // Uma rodada é 1/12 da mão, onde os jogadores precisam de 2 pontos para vencer
    console.log('passando pela função da rodada'.magenta)
    let timevencedor;
    rodadanum++;

    const carta1 = await turno();
    const carta2 = await turno();
    const carta3 = await turno();
    const carta4 = await turno();
    cartasrodada.push(
        carta1, carta2, carta3, carta4);

    console.log(`aqui está o cartasrodada: ${cartasrodada}`.yellow);

    timevencedor = checkmaiorCarta(cartasrodada, vira); // Checar qual é a carta mais forte

    console.log("o time vencedor é:",timevencedor)

    // -==-=-=-=-=-=-=-==-=-=-=-=-=-=-==-=-=-=-=-=-=-==-=-=-=-=-=-=-==-=-=-=-=-=-=-==-=-=-=-=-=-=-==-=-=-=-=-=-=-==-=-=-=-=-=-=-==-=-=-=-=-=-=-
    // Reseta as variáveis que são usadas na rodada
    pontoparatimequejogoucarta = [];
    cartasrodada = [];

    // Tira as cartas jogadas da mesa
    for(let i = 1; i < 5; i++) { io.sockets.emit('alterarvisibilidade', `cartajogadapessoa${i}`); }

    // Checa o time que fez o ponto da rodada e atribui o ponto ao time
    timevencedor = timevencedor % 2 == 0? "Time2" : "Time1";
    let timeperdedor = timevencedor == "Time1"? "Time2" : "Time1"
    pontosrodada[timevencedor] += 1;

    let timevencedormao = pontosrodada["Time1"] > pontosrodada["Time2"] && pontosrodada["Time1"] >= 2? "Time1" : "Time2";

    // Checa se um dos times já fez 2 pontos na rodada
    if ((pontosrodada.Time1 == 2 || pontosrodada.Time2 == 2) && pontosrodada.Time1 != pontosrodada.Time2) {
        console.log(`Eh o fim, o time vencedor dos pontos da mão é o ${timevencedormao}`)
        pontosmao[timevencedormao] += valorpontosrodada;
        console.log(`Time vencedor da rodada: ${timevencedor} pontosganhos: ${valorpontosrodada}`)
        let idstirarhidden = [
            'c1pessoa1carta','c1pessoa2carta','c1pessoa3carta',
            'c2pessoa1carta','c2pessoa2carta','c2pessoa3carta',
            'c3pessoa1carta','c3pessoa2carta','c3pessoa3carta',
            'c4pessoa1carta','c4pessoa2carta','c4pessoa3carta'
        ]
        for(let i= 0; i < idstirarhidden.length; i++){ io.sockets.emit('removerhidden', idstirarhidden[i])}
        return Promise.resolve();
    }
    atualizarScoreboardPontos(timevencedor,timeperdedor); // Atualiza HUD do jogo
    return rodada();
}

async function turno() {

    let jogadoratual = gerenciadorDeJogadoresNosTurnos(); // Retorna o primeiro jogador na lista aleatória de quem começa,
    // depois joga o primeiro jogador para a última fileira e o próximo será o segundo
    socketjogadoratual = jogadores[jogadoratual];
    let numpessoa = acharNumPessoa(jogadoratual)
    cartaSelecionada = undefined;
    playerjogoucarta = false;
    trukopressionado = false;
    eventStatusHandler = 'jogarcarta'

    let carta = await obterCarta(jogadoratual,numpessoa);
    console.log(carta)

    if (!(carta == 'Truko')) {
        return carta
    }
    // TODO PROBLEMA AQUI!!!
    let respostaTruko = trukoAcoes()

    console.log(respostaTruko)
    if (respostaTruko == 'obtercarta'){
        return await obterCarta(jogadoratual,numpessoa);
    }
    else if (respostaTruko == 'mao'){
        mao()
    }

}

// Handler da carta jogada ou não jogada resumindo
function obterCarta(jogadoratual,numpessoa){

    io.to(socketjogadoratual).emit('alterarvisibilidade', 'botaotruko');
    io.sockets.emit('carregarbarradetempo', jogadoratual);
    let tempoesgotado = false;

    return new Promise((promessa) => {
        // Verifica a cada 100 ms se o jogador jogou uma carta, se ele jogou uma carta o checker acaba e o timeout de jogada automatica para também e ele retorna o .then do Promise, que retorna a carta que jogador jogou.
        intervaloVerificacao = setInterval(() => {
            if (playerjogoucarta) {
                clearInterval(intervaloVerificacao);
                clearTimeout(temporestante);
                removerCarta(jogadoratual, cartajogada, numpessoa);
                promessa(cartajogada);
            }
            else if (trukopressionado){
                // trukopressionado = false; // Se não colocar false roda um loop infinito nas verificações
                clearInterval(intervaloVerificacao);
                clearTimeout(temporestante);
                promessa("Truko");
            }
        }, 100);

        temporestante = setTimeout(() => {
            console.log(`O jogador ${jogadoratual} não fez sua jogada! A primeira carta do baralho dele será jogada.`);
            if (!playerjogoucarta) {
                clearInterval(intervaloVerificacao);
                cartaSelecionada = jogarPrimeiraCarta(jogadoratual, numpessoa);
                tempoesgotado = true;
                promessa([cartaSelecionada]);
            }
        }, 10000);
    }).then((cartaSelecionada) => {
        io.sockets.emit('carregarbarradetempo', 'parartimer');
        return cartaSelecionada;
    });

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
    let numerodacarta;
    for(let i = 0; i < 3; i++){
        if(cartassalvaspessoas[pessoa-1][i][0] == cartaremover[0] && cartassalvaspessoas[pessoa-1][i][1] == cartaremover[1]){
            let cartaremovida = cartasjogador.splice(i, 1); // Remove a carta que vai jogar da lista de cartas do jogador e salva em variável
            cartassalvaspessoas[pessoa-1][i] = "Removido"; // Preenche o espaço da carta removida com removido para não bugar pela posição
            numerodacarta = i;
            console.log(`Removendo carta do jogador ${jogador}, ${cartaremovida}`.bgGreen);
            console.log(`Cartas do jogador: ${cartassalvaspessoas[pessoa-1]}`.bgGreen);
            break;
        }
    }
    updateCartasUI(jogador, numerodacarta, cartassalvaspessoas[pessoa-1])
    pontoparatimequejogoucarta.push(jogador);
}

// ____________________________GIRA O TURNO DOS JOGADORES____________________________
function gerenciadorDeJogadoresNosTurnos(){ // Gerencia o jogador atual no turno, seta a sequência de quem começa, roda a lista do turno
    let possibilidadesprimeirojogador;
    if (primeiroturno){
        possibilidadesprimeirojogador = [
            [times['Time1']['1'], times['Time2']['1'], times['Time1']['2'], times['Time2']['2']],
            [times['Time2']['1'], times['Time1']['1'], times['Time2']['2'], times['Time1']['2']],
            [times['Time1']['2'], times['Time2']['2'], times['Time1']['1'], times['Time2']['1']],
            [times['Time2']['2'], times['Time1']['2'], times['Time2']['1'], times['Time1']['1']]
        ];
        primeiroturno = false
        listajogadoresturno = randomizar(possibilidadesprimeirojogador); // Randomiza as possibilidades para escolher quem começa o jogo
    }
    let jogador = listajogadoresturno[0]
    let jogador1 = jogador[0] // Faz com que o primeiro jogador da lista seja salvo
    jogador.shift() // Remove o primeiro jogador da lista
    jogador.push(jogador1) // Coloca  primeiro jogador no fundo da lista
    return jogador1
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
    let maiorcarta;
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
        console.log("Empate entre cartas não manilhas:", empateCartas);
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

    console.log("A maior carta da rodada é:", maiorcarta, "o time vencedor é:", timevencedor);
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


//____________________________GERENCIA AÇÕES AO APERTAR TRUKO____________________________ TODO PROBLEMA AQUI
function trukoAcoes() {

   eventStatusHandler = 'trukoOpcoes';

   trukoaceito = trukoWaiter()

   jogadorescorrendo = 0
   io.sockets.emit('atualizartexto', 'valorpontosrodada', valorpontosrodada);
   io.to(socketjogadoratual).emit('alterarvisibilidade', 'repostatruko');
   // Checa se o truko foi aceito ou não, se foi aceito ele retorna para o meliante selecionar a carta
   if (trukoaceito) {
       return 'obtercarta'
   } else {
       return 'mao'
   }

}


// Aguarda os jogadores selecionarem aceitar ou correr ou somar // TODO TALVEZ ESTEJA COM PROBLEMA?
function trukoWaiter(){
    let tempoesgotado = false;
    return new Promise((promessa) => {

        intervaloVerificacao = setInterval(() => { // Checa o botão que o jogador enviou de truko, se não enviar = correu
            if (jogadoresQueResponderamAoTruko.length == 2 || trukoaceito == true) {
                clearInterval(intervaloVerificacao);
                clearTimeout(temporestante);
                promessa(trukoaceito);
            }
        }, 100);

        temporestante = setTimeout(() => {
            if (jogadoresQueResponderamAoTruko.length == 2 || trukoaceito == true) {
                clearInterval(intervaloVerificacao);
                console.log(`Truko não foi aceito porque os jogadores demoraram de mais para aceitar/correr/+6`);
                tempoesgotado = true;
                promessa(trukoaceito);
            }
        }, 15000);
    }).then( () => {
        io.sockets.emit('pedirtruko', 'parartimer', null);
        return trukoaceito;
    });
}

// ____________________________GERENCIA AS AÇÕES DAS PESSOAS QUE RECEBERAM TRUKO____________________________
function trukoActionHandler(action){
    let timequepediutruko = timetrukado == "Time1" ? "Time2" : "Time1"

    console.log(`acao no trukohandler: ${action}`)
    if(action == 'soma'){
        valorpontosrodada = valorpontosrodada == 1 ? 6 : valorpontosrodada + 3;
        trukoaceito = true;
    }
    else if(action == 'aceitar'){
        valorpontosrodada = valorpontosrodada == 1 ? 3 : valorpontosrodada;
        trukoaceito = true;
    }
    else if(action == 'correr'){
        jogadorescorrendo++;
        if(jogadorescorrendo == 2){
            pontosmao[timequepediutruko] += pontosrodada
            trukoaceito = true;
        }
        // mostrar que correu do truko
    }
    console.log("jogadores correndo:",jogadorescorrendo, 'timequepdiutruko:',timequepediutruko, 'trukoaceito:',trukoaceito, 'acaoenviada',action)
}

// TODO - CONCERTAR PERSPECTIVA DE VISÃO DO JOGADOR 2, JOGADOR 1111 E 3333 ESTÃO INVERTIDOS
// Atualiza as cartas dos jogadores na visão de cada um e a posição da carta na frente do jogador
function updateCartasUI(jogadoratual, numcarta, cartasjogador){

    // Remove a carta na visão de 1º pessoa
    io.to(jogadores[jogadoratual]).emit('alterarvisibilidade', `c1pessoa${numcarta+1}carta`); // c1pessoa${numerodacarta+1}carta é o id no html da carta que o jogador selecionou
    io.to(socketjogadoratual).emit('alterarvisibilidade', 'botaotruko');

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
    console.log("Pontos mão abaixo:".bgWhite.black)
    console.log(pontosmao["Time1"])
    console.log(pontosmao["Time2"])
    console.log("-=-=-=-=-=-=-=-=-=-".bgWhite.black)
    io.to(jogadores[times["Time1"]["1"]]).emit('atualizartexto', `seutimepontos`, `${pontosmao["Time1"]}`);
    io.to(jogadores[times["Time1"]["2"]]).emit('atualizartexto', `seutimepontos`, `${pontosmao["Time1"]}`);
    io.to(jogadores[times["Time1"]["1"]]).emit('atualizartexto', `outrotimepontos`, `${pontosmao["Time2"]}`);
    io.to(jogadores[times["Time1"]["2"]]).emit('atualizartexto', `outrotimepontos`, `${pontosmao["Time2"]}`);

    io.to(jogadores[times["Time2"]["1"]]).emit('atualizartexto', `seutimepontos`, `${pontosmao["Time2"]}`);
    io.to(jogadores[times["Time2"]["2"]]).emit('atualizartexto', `seutimepontos`, `${pontosmao["Time2"]}`);
    io.to(jogadores[times["Time2"]["1"]]).emit('atualizartexto', `outrotimepontos`, `${pontosmao["Time1"]}`);
    io.to(jogadores[times["Time2"]["2"]]).emit('atualizartexto', `outrotimepontos`, `${pontosmao["Time1"]}`);
}

// ____________________________FAZ AS AÇÕES DE QUEM VENCEU O JOGO____________________________
function timeVencedor(time){
    // fazer a lógica de o que acontece quando algum time vence o jogo
    console.log(`|----------------------------| \n
                 |         FIM DO JOGO        | \n
                 |----------------------------|`)
}
