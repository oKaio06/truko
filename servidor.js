const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const colors = require("colors")
app.use(express.static("./public"));
http.listen(80);
console.log("The Dark Night Returns".black);

// ____________________________ Parte do registro de conexões do jogador :D ____________________________
const jogadores = {};
const jogadoresPorId = {};
const jogadoresPorNumero = {}; // FUTURO: Alocar isso à lógica do truko, seria para controlar as pessoas de cada time
const jogadoresconectados = [];
const times = {Time1: {"1": null, "2": null}, Time2: {"1": null, "2": null}};
const nomestime = [];
let playerjogoucarta = false;
let cartajogada;
let valorpontosrodada = 1;
let gerenciadorTruko;
let timetrukado;
let socketjogadoratual;

io.on('connection', (socket) => {

    socket.on('registrarnomes', nome => {
        const id = socket.id;
        jogadores[nome] = id;
        jogadoresPorId[id] = nome;
        jogadoresConectados("adicionar", nome);
    });

    socket.on('disconnect', () => {
        const nome = jogadoresPorId[socket.id];
        if (nome) {
            jogadoresConectados("remover", nome);
            delete jogadores[nome];
            delete jogadoresPorId[socket.id];
        }
    });

    // Checa se o nome inserido na página do index está dentro da lista de usuários
    socket.on('checarnomes', nome => {
        if (nome in jogadores){
            socket.emit('receberverificacaonomes', true); // Envia a resposta do checker true pq tem o nome na lista
        }
        else{
            socket.emit('receberverificacaonomes', false); // Envia a resposta do checker false pq n tem o nome na lista
        }
    });

    // Adicionar pessoa no time
    socket.on('entrartime', time => {
        let id = socket.id;
        let timenum = time[time.length - 1];
        let nome = jogadoresPorId[id];
        let checkjogador = checarJogadorInclusoTimes(nome);
        if(checkjogador){
            socket.emit('mensagemerro', 'Você já está em um time!');
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
            }
        }
        if(nomestime.length == 4){
            rodarTimerComecar();
        }
    });

    // Recebe a carta jogada e faz o processamento da carta (todas as ações e o que fazer com ela)
    socket.on('recebercartajogada', (id, carta) => {
        if(socket.id == socketjogadoratual){ // Checa se o jogador é o jogador do turno mesmo ou se é outro jogador
            cartajogada = [carta[0], carta[2]]; // Formata a carta jogada em [naipe, carta]
            cartaSelecionada = cartajogada;
            if (cartajogada.length >= 2) { // Checar se é uma carta válida
                playerjogoucarta = true;
                console.log(`Carta jogada pelo jogador com ID: ${socket.id}, carta:`, cartaSelecionada);
            }
        }
        else{
            console.log(`O jogador `, `${jogadoresPorId[socket.id]}`.blue, `,com id `, `${socket.id}`.blue, `tentou jogar uma carta mesmo não sendo o turno dele :(...`);
        }
    });
    socket.on('botaotruko', () => {
        console.log(`Botao de truko pressionado por: ${socket.id}, jogador: ${jogadoresPorId[socket.id]}`);
        for(let i = 0; i < 4; i++){
            if(nomejogadorestime[i] == jogadoresPorId[socket.id]){
                // 0, 2 == time1
                // 1, 3 == time2
                timetrukado = i % 2 == 0? "Time1" : "Time2";
            }
        }
        io.to(socketjogadoratual).emit('alterarvisibilidade', 'botaotruko');
        io.to(jogadores[times[timetrukado]["1"]]).emit('alterarvisibilidade', 'positionbotoes');
        io.to(jogadores[times[timetrukado]["2"]]).emit('alterarvisibilidade', 'positionbotoes');
    });
    socket.on('trukohandler', (action) => {
        // Controla as ações que os botões de truko fazem
        if(action == '+'){
            trukoHandler('soma')
        }
        else if(action == 'aceitar'){
            trukoHandler('aceitar')
        }
        else if(action == 'correr') {
            trukoHandler('aceitar')
        }
    })
});

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
            gameStart()
        }
    }, 1000);
}

function posicaoJogadoresUI() {
    // Esconde a div de times com todos os elementos + faz aparecer os assets do jogo
    io.sockets.emit('alterarvisibilidade', 'timesbox');
    io.sockets.emit('alterarvisibilidade', 'assetsjogo');
    const nomejogadorestime = [
        times['Time1']['1'],
        times['Time1']['2'],
        times['Time2']['1'],
        times['Time2']['2']
    ]
    const jogadoresID = [
        jogadores[times['Time1']['1']],
        jogadores[times['Time1']['2']],
        jogadores[times['Time2']['1']],
        jogadores[times['Time2']['2']]
    ]
    const posicaojogadores = [
        [nomejogadorestime[2], nomejogadorestime[1], nomejogadorestime[3]], // Time1Pos1
        [nomejogadorestime[3], nomejogadorestime[0], nomejogadorestime[2]], // Time1Pos2
        [nomejogadorestime[0], nomejogadorestime[3], nomejogadorestime[1]], // Time2Pos1
        [nomejogadorestime[1], nomejogadorestime[2], nomejogadorestime[0]]  // Time2Pos2
    ];
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
let nomejogadorestime;

let cartaSelecionada = undefined;
let cartaspessoa1;
let cartaspessoa2;
let cartaspessoa3;
let cartaspessoa4;
let pontospartida;
let listajogadoresturno;
let cartasrodada = [];
let vira;
let pontoparatimequejogoucarta = [];
let rodadanum;

function gameStart() {

    pontosmao = {Time1: 0, Time2: 0};
    pontosrodada = {Time1: 0, Time2: 0};

    nomejogadorestime = [
        times['Time1']['1'],
        times['Time1']['2'],
        times['Time2']['1'],
        times['Time2']['2']
    ];

    posicaoJogadoresUI() //  Deixa a parte dos times invisível, coloca os assets do jogo visível
    // e ajusta a posição de todos os jogadores com as respectivas perspectivas

    return mao()
}

function mao(){
    // Função que controla os pontos da mão e as ações da mão, não pode ser loop pq os pontos não são constantes
    // Uma mão é basicamente o ponto final do jogo,
    // aquele que fizer 12 pontos ganha uma mão, pode valer 1,3,6,9,12

    if(pontosmao["Time1"] >= 12){
        return timeVencedor("Time1")
    }
    else if(pontosmao["Time2"] >= 12){
        return timeVencedor("Time2")
    }

    let baralho = gerarBaralhoRandom();

    // Pega as cartas do baralho, dá as cartas para os jogadores e mostra no HTML
    enviarCartasUI(baralho);

    // Colocar a primeira carta na mesa
    vira = baralho.pop();

    // Mostra img do vira na mesa
    carregarUmaImagemParaTodos("vira", "vira", vira);
    console.log('passando pela função da mão'.green)
    return rodada()
}

async function rodada() {
    // Uma rodada é 1/12 da mão, onde os jogadores precisam de 2 pontos para vencer
    console.log('passando pela função da rodada'.magenta)
    let timevencedor;
    rodadanum++;
    try {
        const carta1 = await turno();
        cartasrodada.push(carta1);

        const carta2 = await turno();
        cartasrodada.push(carta2);

        const carta3 = await turno();
        cartasrodada.push(carta3);

        const carta4 = await turno();
        cartasrodada.push(carta4);

        console.log(`aqui está o cartasrodada :) ${cartasrodada}`.yellow);
        timevencedor = checkmaiorCarta(cartasrodada, vira); // Checar qual é a carta mais forte

        console.log("o time vencedor é:",timevencedor)

        atualizarPontosRodada(timevencedor);

        console.log("pontos da mão:", pontosmao);
        pontoparatimequejogoucarta = [];
        zerarpontos('rodada'); // zera os pontos da rodada porque é tipo 'rodada'
    }
    catch (error) {
        console.error("Ocorreu um erro durante a rodada:", error);
    }

    cartasrodada = [];

    if(rodadanum == 3){
        return mao();
    }
    else{
        return rodada();
    }
}

function turno() {
    let carregartempo = true;
    let jogadoratual = gerenciadorDeJogadoresNosTurnos(); // Retorna o primeiro jogador na lista aleatória de quem começa,
    // depois joga o primeiro jogador para a última fileira e o próximo será o segundo
    socketjogadoratual = jogadores[jogadoratual];
    let numpessoa;
    for(let i = 0; i < 4; i++){ // Acha o número da pessoa nos times para fazer algo nas cartas dela
        if (jogadoratual == nomejogadorestime[i]){
            numpessoa = i + 1;
            break;
        }
    }
    io.to(socketjogadoratual).emit('alterarvisibilidade', 'botaotruko');
    if(carregartempo){
        io.sockets.emit('carregarbarradetempo', jogadoratual);
        // noinspection JSUnusedAssignment
        carregartempo = false;
    }
    cartaSelecionada = undefined;
    playerjogoucarta = false;
    let tempoesgotado = false;
    return new Promise((promessa) => {
        const intervaloVerificacao = setInterval(() => { // Verifica a cada 100 ms se o jogador jogou uma carta,
            // se ele jogou uma carta o checker acaba e o timeout de jogada automatica para também e ele retorna o .then do Promise,
            // que retorna a carta que jogador jogou.
            if (playerjogoucarta) {
                clearInterval(intervaloVerificacao);
                clearTimeout(temporestante);
                promessa(cartajogada);
            }
        }, 100);

        const temporestante = setTimeout(() => {
            if (!playerjogoucarta) {
                clearInterval(intervaloVerificacao);
                console.log(`O jogador ${jogadoratual} não fez sua jogada! A primeira carta do baralho dele será jogada.`);
                const primeiraCarta = jogarPrimeiraCarta(jogadoratual, numpessoa);
                tempoesgotado = true;
                promessa([primeiraCarta]);
            }
        }, 10000);
    }
    ).then((cartaSelecionada) => {
        if(!tempoesgotado){
            removerCarta(jogadoratual, cartaSelecionada, numpessoa);
        }
        io.sockets.emit('carregarbarradetempo', 'parartimer');
        return cartaSelecionada;
    });
}


// FUNÇÕES DE AUXÍLIO PARA A LÓGICA PRINCIPAL DO JOGO

function jogarPrimeiraCarta(jogador, pessoa){ // Joga a primeira carta do jogador atual porque ele não jogou uma carta
    let jogadorcarta = eval(`cartaspessoa${pessoa}`); // Retorna a lista de cartas do jogador
    let primeiracarta = jogadorcarta[0];
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

// ____________________________ZERAR PONTOS TIMES____________________________
function zerarpontos(tipodeponto){
    // tipos:
    // 0- pontosrodada
    // 1- pontosmao
    // 2- zerar todos os pontos do jogo
    if (tipodeponto == 'rodada') {
        pontosrodada["Time1"] = 0
        pontosrodada["Time2"] = 0
    }
    else if (tipodeponto == 'mao'){
        pontosmao["Time1"] = 0
        pontosmao["Time2"] = 0
    }
    else if (tipodeponto == 'todos'){
        pontosmao["Time1"] = 0
        pontosrodada["Time1"] = 0
        pontosrodada["Time2"] = 0
        pontosmao["Time2"] = 0
        // zerar todos os pontos do jogo
    }
}

// ____________________________REMOVE A CARTA DE UM JOGADOR____________________________
function removerCarta(jogador, cartaremover, pessoa){
    let jogadorcarta = eval(`cartaspessoa${pessoa}`); // Retorna a lista de cartas do jogador
    let numerodacarta;
    for(let i = 0; i < 3; i++){
        if(jogadorcarta[i][0] == cartaremover[0] && jogadorcarta[i][1] == cartaremover[1]){
            jogadorcarta.splice(i, 1); // Remove a carta que vai jogar da lista de cartas do jogador
            numerodacarta = i;
            break;
        }
    }
    io.to(jogadores[jogador]).emit('alterarvisibilidade', `c1pessoa${numerodacarta+1}carta`); // c1pessoa${numerodacarta+1}carta é o id no html da carta que o jogador selecionou
    io.to(socketjogadoratual).emit('alterarvisibilidade', 'botaotruko');
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

    // Checar o maior valor da carta
    for (let i = 0; i < 4; i++) {
        let carta = cartascheck[i];
        let valorCarta = cartasForca[carta[1]];

        if (valorCarta > maiorvalor || (valorCarta === maiorvalor && nipeForca[carta[0]] > nipeForca[maiorcarta[0]])) {
            maiorvalor = valorCarta;
            maiorcarta = carta;
        }

        if (carta[1] === manilhaValor) {
            manilhachecks.push(carta);
        }
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


function atualizarPontosRodada(timevencedor){
    timevencedor = timevencedor % 2 == 0? "Time2" : "Time1";
    let timeperdedor = timevencedor == "Time1"? "Time2" : "Time1"

    if(timevencedor == 'Time1'){ // Checa o time que fez o ponto da rodada e atribui o ponto ao time
        pontosrodada.Time1 += 1;
    }
    else if(timevencedor == 'Time2'){
        pontosrodada.Time2 += 1;
    }

    // Checa se um dos times já fez 2 pontos na rodada
    if (pontosrodada.Time1 == 2) {
        pontosmao["Time1"] += pontospartida;
        console.log("O time 1 fez 2 pontos na rodada".red);
    } else if (pontosrodada.Time2 == 2) {
        pontosmao["Time2"] += pontospartida;
        console.log("O time 2 fez 2 pontos na rodada".red);
    } else if (pontosrodada.Time1 == 2 && pontosrodada.Time2 == 2) {
        timevencedor = desempatechecker(); // Faz o desempate se os dois times tem 2 pontos
        pontosmao[timevencedor] += pontospartida;
    }

    console.log(pontosrodada)

    // Atualiza o scoreboardzinho dos círculos no html
    io.to(jogadores[times[timevencedor]["1"]]).emit('carregarimagem', `seutime${rodadanum}`, `images/circuloverde.png`);
    io.to(jogadores[times[timevencedor]["2"]]).emit('carregarimagem', `seutime${rodadanum}`, `images/circuloverde.png`);
    io.to(jogadores[times[timeperdedor]["1"]]).emit('carregarimagem', `outrotime${rodadanum}`, `images/circulovermelho.png`);
    io.to(jogadores[times[timeperdedor]["2"]]).emit('carregarimagem', `outrotime${rodadanum}`, `images/circulovermelho.png`);

    // Atualiza os pontos do lado dos círculos no html
    io.to(jogadores[times[timevencedor]["1"]]).emit('atualizartexto', `seutimepontos`, `${pontosmao["Time1"]}`);
    io.to(jogadores[times[timevencedor]["2"]]).emit('atualizartexto', `seutimepontos`, `${pontosmao["Time1"]}`);
    io.to(jogadores[times[timeperdedor]["1"]]).emit('atualizartexto', `outrotimepontos`, `${pontosmao["Time2"]}`);
    io.to(jogadores[times[timeperdedor]["2"]]).emit('atualizartexto', `outrotimepontos`, `${pontosmao["Time2"]}`);
}

// ____________________________GERENCIA AS AÇÕES DAS PESSOAS QUE RECEBERAM TRUKO____________________________
function trukoHandler(action){
    let jogadorescorrendo = 0;
    let timequepediutruko = timetrukado == "Time1" ? "Time2" : "Time1"

    if(action == 'soma'){
        valorpontosrodada+= 3;
        io.to(jogadores[times[timetrukado]["1"]]).emit('alterarvisibilidade', 'positionbotoes');
        io.to(jogadores[times[timetrukado]["2"]]).emit('alterarvisibilidade', 'positionbotoes');
        // mostrar que pediu mais e mostrar o número que vai ficar
    }
    else if(action == 'aceitar'){
        // mostrar que aceitou o truko
        // remover o hud de +/aceitar/correr
        io.to(jogadores[times[timetrukado]["1"]]).emit('alterarvisibilidade', 'positionbotoes');
        io.to(jogadores[times[timetrukado]["2"]]).emit('alterarvisibilidade', 'positionbotoes');
    }
    else if(action == 'correr'){
        jogadorescorrendo++;
        if(jogadorescorrendo == 2){
            pontosmao[timequepediutruko] += pontosrodada
            io.to(jogadores[times[timetrukado]["1"]]).emit('alterarvisibilidade', 'positionbotoes');
            io.to(jogadores[times[timetrukado]["2"]]).emit('alterarvisibilidade', 'positionbotoes');
        }
        // mostrar que correu do truko
    }
}

// ____________________________FAZ AS AÇÕES DE QUEM VENCEU O JOGO____________________________
function timeVencedor(time){

}