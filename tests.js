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
baralho = gerarBaralhoRandom()

let cartasplayer1 = [baralho.pop(), baralho.pop(), baralho.pop()]
// Colocar cartas no HTML -> Enviar via WebSocket para player

let cartasplayer2 = [baralho.pop(), baralho.pop(), baralho.pop()]
// Colocar cartas no HTML -> Enviar via WebSocket para players

let cartasplayer3 = [baralho.pop(), baralho.pop(), baralho.pop()]
// Colocar cartas no HTML -> Enviar via WebSocket para players

let cartasplayer4 = [baralho.pop(), baralho.pop(), baralho.pop()]
// Colocar cartas no HTML -> Enviar via WebSocket para players

// Colocar cartas no HTML e mostrar img de trás das cartas para os jogadores -> Enviar via WebSocket para players
let list = [cartasplayer1, cartasplayer2, cartasplayer3, cartasplayer4]


console.log(list)
console.log(list[0][0][0])