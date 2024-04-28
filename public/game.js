const socket = io();


document.addEventListener("click", printMousePos);
//Colocar ID, time e nome

// ____________________________IMPORTAÇÕES DA PARTE QUE FAZ O REGISTRO DO JOGADOR____________________________


// ____________________________FUNÇÕES MAIN DO JOGO____________________________

pontosmao = {time1: 0, time2: 0}
pontosrodada = {time1: 0, time2: 0}
function gameStart(){
    jogadores = [] //criar id dos jogadores e pedir nomes via socket
    let time1 = [jogadores[0], jogadores[2]]
    let time2 = [jogadores[1], jogadores[3]]

    //Mandar os jogadores para a visão do site pelo WebSocket
    //Definir posição jogadores -> WebSocket

    mao(0)
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
        let vira = baralho.pop()
        cartaparaImagem(vira, "vira")

        let cartasrodada = []
        rodada(cartasrodada)
    }
}

function rodada(cartasrodada){ // Uma rodada é 1/3 da mão, onde os jogadores precisam de 2 pontos para vencer
    cartasrodada = [turno(),turno(),turno(),turno()]
    jogadoresrodada = jogadores
    turno(jogadoresrodada)
    return timeponto
}
function turno(jogadoresturno){ // Um turno é 1/4 da rodada, onde um jogador joga a carta
    // animacao de quando tá com o mouse em cima da carta ( fazer em um js de design )
    let jogadoratual = jogadoresturno.pop(0)
    //aparecer botão de truco para o jogador (fazer em um js de design) que se clicar roda a funcao de truco
    //aparecer barra de tempo para jogador (fazer em um js de design)
    //aparecer barra de tempo para todos os jogadores menos o jogador atual (fazer em um js de design)
    //funcao para quando clicar na carta mandar para a funcao de clicar na carta

    return cartajogada
}
//
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
