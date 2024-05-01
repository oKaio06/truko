// function randomizar(randomizarlista){
//     let currentIndex = randomizarlista.length;
//
//     while (currentIndex !== 0) {
//         let randomIndex = Math.floor(Math.random() * randomizarlista.length);
//         currentIndex -= 1;
//
//         let temp = randomizarlista[currentIndex];
//         randomizarlista[currentIndex] = randomizarlista[randomIndex];
//         randomizarlista[randomIndex] = temp;
//     }
//     return randomizarlista
// }
// function gerarBaralhoRandom(){
//     let naipes = ["C", "O", "P", "E"]
//     let valores = ["4", "5", "6", "7", "D", "J", "K", "A", "2", "3"]
//     let baralhoinicial = []
//     for (let naipe of naipes){
//         for (let valor of valores){
//             baralhoinicial.push([naipe, valor])
//         }
//     }
//     return randomizar(baralhoinicial)
// }
// baralho = gerarBaralhoRandom()
//
// cartamesa = baralho.pop()
// console.log(cartamesa)
// console.log(cartamesa[0])
// console.log(cartamesa[1])
// console.log(`${cartamesa[0]}_${cartamesa[1]}`)
// const socket = io();
//
// function registrarJogadores(){
//     jogadores = [346235252, "kaio", "time1"]
// }
// registrarJogadores()
// console.log(jogadores)
// export {registrarJogadores}

// let cartasrodada = []
// let jogadores = ["kaio","yas","gb","webstrm"]
// function rodada(cartasrodada){ // Uma rodada é 1/3 da mão, onde os jogadores precisam de 2 pontos para vencer
//     jogadoresrodada = jogadores
//     cartasrodada = [turno(jogadoresrodada)]
//     // console.log(jogadoresrodada)
//     return "fim"
// }
// function turno(jogadoresturno){ // Um turno é 1/4 da rodada, onde um jogador joga a carta
//     // animacao de quando tá com o mouse em cima da carta ( fazer em um js de design )
//     console.log(`${jogadoresturno}`)
//     let jogadoratual = jogadoresturno.shift()
//     console.log(`${jogadoratual}`)
//     // console.log(jogadoratual)
//     //aparecer botão de truco para o jogador (fazer em um js de design) que se clicar roda a funcao de truco
//     //aparecer barra de tempo para jogador (fazer em um js de design)
//     //aparecer barra de tempo para todos os jogadores menos o jogador atual (fazer em um js de design)
//     //funcao para quando clicar na carta mandar para a funcao de clicar na carta
// }
//
// console.log(rodada(cartasrodada))

// let cartasForca = {"4": 0, "5": 1, "6": 2, "7": 3, "D": 4, "J": 5, "K": 6, "A": 7, "2":8, "3": 9}
// console.log(cartasForca["4"])


//     function checkmaiorCarta(cartas, manilha)
let cartasForca = {"4": 0, "5": 1, "6": 2, "7": 3, "D": 4, "J": 5, "K": 6, "A": 7, "2":8, "3": 9};
let nipeForca = {"O": 0, "E": 1, "C": 2, "P": 3};
let cartas = [["O", "4"], ["C", "4"], ["P", "4"], ["E", "A"], ]
let manilha = "4"
let manilhas = []
let time1 = [cartas[0], cartas[2]]
let time2 = [cartas[1], cartas[3]]
cartasForca[manilha] = 10
// INALTERÁVEL ACIMA ^^^^^^^^

let maiornipe = -1;
let maiorvalor = -1;
let maiorcarta;
let maiorcartaposicao;
let timevencedor;
// noinspection JSUnusedAssignment

// Checar o mais valor da carta
for (let i = 0; i < 4; i++) {
    if (parseInt(cartasForca[cartas[i][1]]) >= maiorvalor){
        maiorvalor = parseInt(cartasForca[cartas[i][1]]);
        maiorcartaposicao = i;
        maiorcarta = cartas[i];
        // Lógica para definir o ganhador do round
        if (maiorcarta in time1){
            timevencedor = 1;
        }
        else{
            timevencedor = 2;
        }
        if (cartas[i][1] == manilha){
            manilhas.push(cartas[i])
        }
    }
}

// Tira o maior valor para checar se ele é repetido
cartas.splice(maiorcartaposicao, 1);

timevencedor = 1;
// Checa se o maior valor da carta mais forte é repetido
for (let i = 0; i < 3; i++) {
    if (parseInt(cartasForca[cartas[i][1]]) == parseInt(cartasForca[maiorcarta[1]])){ // Testes funcionam até aqui, o resto é VARZEA
        timevencedor = 3; // Representa que ambos os times ganham pontos
    }
}
// Checa se tem uma manilha e qual é a manilha mais forte
if (manilhas.length >= 2){
    for (let i = 0; i < manilhas.length; i++) {
        if (parseInt(nipeForca[manilhas[i][0]]) > maiornipe){
            maiornipe = parseInt(nipeForca[manilhas[i][0]])
            maiorcarta = manilhas[i]
            if (maiorcarta in time1){
                timevencedor = 1;
            }
            else{
                timevencedor = 2;
            }
        }
    }
}

console.log(`Naipe:${maiorcarta[0]} Carta:${maiorcarta[1]} Time vencedor da rodada:${timevencedor}`)