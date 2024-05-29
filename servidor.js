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

    // socket.on('receberEvento', evento, elemento, (id, jogadores) => {
    //     if (evento == 'darcartas'){
    //         updateImg('darcartas', elemento, id)
    //     }
    // })

});

// ____________________________ Logar/adicionar/remover jogadores conectados da lista ____________________________

function jogadoresConectados(acao, nome){
    console.clear();
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
            posicaoJogadoresUI()
            gameStart()
        }
    }, 1000);
}

function posicaoJogadoresUI(){
    const jogadoresnostimes = [
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
        [jogadoresnostimes[2], jogadoresnostimes[1], jogadoresnostimes[3]], // Time1Pos1
        [jogadoresnostimes[3], jogadoresnostimes[0], jogadoresnostimes[2]], // Time1Pos2
        [jogadoresnostimes[0], jogadoresnostimes[3], jogadoresnostimes[1]], // Time2Pos1
        [jogadoresnostimes[1], jogadoresnostimes[2], jogadoresnostimes[0]]  // Time2Pos2
    ];
    for(let i = 0; i < 4; i++){
        io.to(jogadoresID[i]).emit('carregarpessoas', posicaojogadores[i]); // Carrega o nome das pessoas dentro do html nas devidas posições
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
}

// Executa ações para todos os jogadores (Pode usar para um time só)
// for(let i = 1; i < 3; i++){
//     let time = `Time${i}`
//     for(let j = 1; j < 3; j++){
//         let posicao = `${j}`
//         io.sockets.emit('alterarvisibilidade', 'timesbox');
//         io.sockets.emit('alterarvisibilidade', 'assetsjogo');
//     }
// }











// ____________________________ TUDO ABAIXO É PARTE DA LÓGICA DO JOGO ____________________________
// ____________________________ TUDO ABAIXO É PARTE DA LÓGICA DO JOGO ____________________________
// ____________________________ TUDO ABAIXO É PARTE DA LÓGICA DO JOGO ____________________________
// ____________________________ TUDO ABAIXO É PARTE DA LÓGICA DO JOGO ____________________________
// ____________________________ TUDO ABAIXO É PARTE DA LÓGICA DO JOGO ____________________________



let nomejogadores = []

//Colocar ID, time e nome

// ____________________________FUNÇÕES MAIN DO JOGO____________________________

let pontosmao = {Time1: 0, Time2: 0};
let pontosrodada = {Time1: 0, Time2: 0};
let vira;
function gameStart(){
    io.sockets.emit('alterarvisibilidade', 'timesbox');
    io.sockets.emit('alterarvisibilidade', 'assetsjogo');
    //Definir posição jogadores -> WebSocket

    // mao(0)
}
function mao(pontospartida){ // Uma mão é basicamente o ponto final do jogo, aquele que fizer 12 pontos ganha uma mão, pode valer 1,3,6,9,12
    if (pontosrodada.time1 == 2) {
        darpontos("time1", pontospartida) // passa os pontos da mao para o time1
        zerarpontos(0) //zera os pontos da rodada
    }
    else if (pontosrodada.time2 == 2){
        darpontos("time2", pontospartida)
        zerarpontos(0)
    }
    else if (pontosrodada.time1 == 2 && pontosrodada.time2 == 2){
        // timevendedor = desempatechecker()
        darpontos(timevencedor, pontospartida)
        zerarpontos(0)
    }
    else{
        let baralho = gerarBaralhoRandom()

        // Mandar cartas
        enviarCartas(baralho)

        // Colocar a primeira carta na mesa
        vira = baralho.pop()
        cartaparaImagem(vira, "vira")

        let cartasrodada = []
        rodada(cartasrodada)
    }
}

function rodada(cartasrodada){ // Uma rodada é 1/3 da mão, onde os jogadores precisam de 2 pontos para vencer
    let jogadoresrodada = jogadores
    cartasrodada = [turno(jogadoresturno),turno(jogadoresturno),turno(jogadoresturno),turno(jogadoresturno)]
    // Checar qual é a carta mais forte
    checkmaiorCarta(cartasrodada, vira)
    return timeponto
}
function turno(jogadoresturno){ // Um turno é 1/4 da rodada, onde um jogador joga a carta
    // animacao de quando tá com o mouse em cima da carta ( fazer em um js de design )
    let jogadoratual = jogadoresturno.shift()
    //aparecer botão de truco para o jogador (fazer em um js de design) que se clicar roda a funcao de truco
    //aparecer barra de tempo para jogador (fazer em um js de design)
    //aparecer barra de tempo para todos os jogadores menos o jogador atual (fazer em um js de design)
    //funcao para quando clicar na carta mandar para a funcao de clicar na carta
    return cartajogada
}

//     Roda a lista para a próxima pessoa
function endGame(){

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
// ____________________________DAR PONTOS AOS JOGADORES____________________________
function darpontos(time, pontos){
    if (time == "time1"){
        pontosmao.time1 = pontosmao.time1 + pontos
    }
    else if (time == "time2"){
        pontosmao.time2 = pontosmao.time2 + pontos
    }
}
// ____________________________GERAR O BARALHO____________________________
function gerarBaralhoRandom(){
    let naipes = ["C", "O", "P", "E"]
    let valores = ["4", "5", "6", "7", "D", "J", "K", "A", "2", "3"]
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
    // tipos: 0- pontosrodada 1- pontosmao 2- zerar todos os pontos do jogo
    if (tipodeponto == 0){
        pontosrodada[0] = 0
        pontosrodada[1] = 0
    }
    else if (tipodeponto == 1){
        pontosmao[0] = 0
        pontosmao[1] = 0
    }
    else if (tipodeponto == 2){
        // zerar todos os pontos do jogo
    }
}
// ____________________________ENVIAR CARTAS PARA JOGADORES____________________________
function enviarCartas(baralho){
    // Enviar para player 1

    let cartasplayer1 = [baralho.pop(), baralho.pop(), baralho.pop()]
    // Colocar cartas no HTML -> Enviar via WebSocket para player

    let cartasplayer2 = [baralho.pop(), baralho.pop(), baralho.pop()]
    // Colocar cartas no HTML -> Enviar via WebSocket para players

    let cartasplayer3 = [baralho.pop(), baralho.pop(), baralho.pop()]
    // Colocar cartas no HTML -> Enviar via WebSocket para players

    let cartasplayer4 = [baralho.pop(), baralho.pop(), baralho.pop()]
    // Colocar cartas no HTML -> Enviar via WebSocket para players

    mostrarCartas(cartasplayer1, cartasplayer2, cartasplayer3, cartasplayer4)
}

// ____________________________PASSA UMA CARTA QUE ESTÁ EM VARIÁVEL DE LISTA PARA IMG ESPECÍFICA NO HTML____________________________

function cartaparaImagem(carta, imagem){
    document.getElementById(imagem).src = `${carta[0]}_${carta[1]}.png`
    document.getElementById(imagem).style.visibility = "visible";
}

// ____________________________CHECA QUAL A CARTA MAIS FORTE DO TURNO____________________________
function checkmaiorCarta(cartascheck, manilhacheck){
    let cartasForca = {"4": 0, "5": 1, "6": 2, "7": 3, "D": 4, "J": 5, "K": 6, "A": 7, "2":8, "3": 9};
    let nipeForca = {"O": 0, "E": 1, "C": 2, "P": 3};
    let manilhas = []
    let time1 = [cartascheck[0], cartascheck[2]]
    let time2 = [cartascheck[1], cartascheck[3]]
    cartasForca[manilhacheck] = 10
    // INALTERÁVEL ACIMA ^^^^^^^^

    let maiornipe = -1;
    let maiorvalor = -1;
    let maiorcarta;
    let maiorcartaposicao;
    let timevencedor;

    // Checar o mais valor da carta
    for (let i = 0; i < 4; i++) {
        if (parseInt(cartasForca[cartascheck[i][1]]) >= maiorvalor){
            maiorvalor = parseInt(cartasForca[cartascheck[i][1]]);
            maiorcartaposicao = i;
            maiorcarta = cartascheck[i];
            // Lógica para definir o ganhador do round
            if (maiorcarta in time1){
                timevencedor = 1;
            }
            else{
                timevencedor = 2;
            }
            if (cartascheck[i][1] == manilhacheck){
                manilhachecks.push(cartascheck[i])
            }
        }
    }

    // Tira o maior valor para checar se ele é repetido
    cartascheck.splice(maiorcartaposicao, 1);

    timevencedor = 1;
    // Checa se o maior valor da carta mais forte é repetido
    for (let i = 0; i < 3; i++) {
        if (parseInt(cartasForca[cartascheck[i][1]]) == parseInt(cartasForca[maiorcarta[1]])){ // Testes funcionam até aqui, o resto é VARZEA
            timevencedor = 3; // Representa que ambos os times ganham pontos
        }
    }
    // Checa se tem uma manilha e qual é a manilha mais forte
    if (manilhachecks.length >= 2){
        for (let i = 0; i < manilhachecks.length; i++) {
            if (parseInt(nipeForca[manilhachecks[i][0]]) > maiornipe){
                maiornipe = parseInt(nipeForca[manilhachecks[i][0]])
                maiorcarta = manilhachecks[i]
                if (maiorcarta in time1){
                    timevencedor = 1;
                }
                else{
                    timevencedor = 2;
                }
            }
        }
    }
    return [maiorcarta, timevencedor]
}