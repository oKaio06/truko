const socket = io();

//Colocar ID, time e nome

// ____________________________FUNÇÕES MAIN DO JOGO____________________________

pontospartida = {time1: 0, time2: 0}
pontosmao = {time1: 0, time2: 0}
function gameStart(){
    let jogadores = [] //criar id dos jogadores e pedir nomes via socket
    let time1 = [jogadores[0], jogadores[2]]
    let time2 = [jogadores[1], jogadores[3]]

    let jogadorRandom = randomizar(jogadores).pop()
    //Mandar os jogadores para a visão do site pelo WebSocket
    //Definir posição jogadores -> WebSocket

}
function mao(){
    if (pontosmao.time1 == 2) {
        darpontos("time1", pontospartida)
    }
    else if (pontosmao.time2 == 2){
        darpontos("time2", pontospartida)
    }
    else{
        let baralho = gerarBaralhoRandom()

        // Mandar cartas pros maninho
        enviarCartas(baralho)

        // Colocar a primeira carta na mesa
        let cartamesa = baralho.pop()
        document.getElementById("vira").src = "tonao"
        // Colocar carta no HTML -> Enviar via WebSocket para players

    }
}

function rodada(){
    for (let i = 0; i < 4; i++){
        jogarcarta()
    }
    return timeponto
}

function endGame(){

}
//____________________________ GERAR NOME E ID JOGADOR____________________________
jogadorescarregados = []
window.addEventListener('load', function jogador() {

    let nome = window.prompt("Insira o seu nome: ") //WebSocket get ID ou sla oq
    jogadorescarregados.push(nome) // Adicionar ID via Websocket
})
function jogador(ID){
    let nome = window.prompt("Insira o seu nome: ") //WebSocket get ID ou sla oq
    return [ID, nome]
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
        pontospartida.time1 = pontospartida.time1 + pontos
    }
else if (time == "time2"){
        pontospartida.time2 = pontospartida.time2 + pontos
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
// ____________________________MOSTRAR CARTAS E ELEMENTOS PARA JOGADORES____________________________
function mostrarCartas(cp1, cp2, cp3, cp4){

}
// ____________________________FUNÇÃO PARA PROJETAR A AÇÃO DE JOGAR CARTA____________________________
function jogarcarta(){

}
// ____________________________MOSTRAR COISAS ESPECIFICAS PARA JOGADORES____________________________

function mostrarEspecifico(jogador, mudar){
    document.getElementById("1pessoa1carta")
    document.getElementById("1pessoa2carta")
    document.getElementById("1pessoa3carta")

    document.getElementById("2pessoa1carta")
    document.getElementById("2pessoa2carta")
    document.getElementById("2pessoa3carta")

}

// function vencedorrodada
//
//
// Funções __main___
// function GameStart
//
// Resetar todas as variáveis
//
// WebSocket -> Players -> Jogo.html
// Definir PlayersID
// Definir posição jogadores -> WebSocket
// Definir equipes
//
// function mao
//
// mao = 0 (termina quando uma equipe fizer 2
// Dar pontos para o jogador
// Virar carta -> WebSocket -> Players
// Randomizar cartas
// WebSocket -> Enviar cartas -> Players
// Definir anilha
// Decidir quem começa rodada -> PlayerID -> WebSocket
//
//
//
// function jogada(jogadorid)
//
// Jogada++
//
// Se jogada = 4,
//     Mandar para checar que time fez o ponto
// se não,
//
//     jogadaaction()
//
//
//
// function jogadaaction()
//
// Adicionar botão para chamar truco
//
// Guardar time que chamou truco
//
// Botão para time oposto pode pedir x+ pontos
//
// Checar posição do mouse se está em cima das cartas, se estiver em cima das cartas faz animação da carta dar uma levantadinha
//
// Ao clicar joga a carta selecionada
//
// Guardar carta jogada na lista do mao
//
//     Roda a lista para a próxima pessoa


// MISC
