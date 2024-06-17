let socket;
document.addEventListener("DOMContentLoaded", () => {
    socket = io()
    // ____________________________ Pegar nome do jogador e mandar para registrar no servidor ____________________________
    function criarnome(mensagem) {
        let nome = prompt(mensagem); // mensagem para pedir o nome do jogador pelo prompt

        // Checa se o nome enviado é vazio ou não, se for vazio ele vai mandar que é inválido
        if (nome == null || nome == "" || nome.trim() === "" || nome.length < 4) {
            return criarnome("Digite seu nome:");
        }

        // Checa se o nome que foi colocado já está sendo usado por outra pessoa
        socket.on('receberverificacaonomes', resposta => {
            if (resposta){
                return criarnome("Nome já utilizado! Digite seu nome: ");
            }
        })
        socket.emit('checarnomes', nome);
        return nome;
    }

    const nome = criarnome("Digite seu nome:")
    socket.emit('registrarnomes', nome);

    socket.on('enviarnome', (nome) => {
        const idpessoa = nome.idpessoa;
        document.getElementById("boasvindas").innerHTML = `Bem-vindo de volta, ${idpessoa}!`
    });


    //Alterar time de pessoa
    socket.on('selecionarTimetext', (nomes) => {
        for(let i = 0; i < nomes.length; i++){
            let nome = nomes[i][0];
            let time = nomes[i][1];
            let posicao = nomes[i][2];
            let id = `time${time}pessoa${posicao}`;
            document.getElementById(id).innerHTML = `${nome}`;
        }
    });
    // Mostra mensagem de erro para usuário
    socket.on('mensagemerro', mensagem => {
        return errorText(mensagem);
    });

    // Mostra o contador para todos os usuários
    socket.on('timerinicio', temporestante => {
        return atualizarTimer(temporestante);
    });

    // Altera a visibilidade dos elementos dentro do HTML
    socket.on('alterarvisibilidade', id => {
        return alterarVisibilidade(id);
    });

    // Carrega os nomes das pessoas no momento
    socket.on('carregarpessoas', posicoes => {
        return carregarPessoas(posicoes);
    });

    // Mostra as cartas das pessoas no HTML
    socket.on('carregarcartas', cartas => {
        return carregarCartas(cartas);
    });

    // Carrega imagens no HTML, cartas ou genéricas
    socket.on('carregarimagem', (id, imagemparacarregar) => {
        return carregarImagem(id, imagemparacarregar);
    });

    // Mostra a barra de tempo para o jogador1
    socket.on('carregarbarradetempo', jogadorturno => {
        return updateTimeBar(jogadorturno);
    });

    socket.on('atualizartexto', (id, texto) => {
        return updateTexto(id, texto);
    })

});


function selecionarTime(time) {
    time = `Time` + time
    socket.emit('entrartime', time);
}

function errorText(mensagem){
        const errorMessageBox = document.getElementById('errormessagebox');
        const errorMessage = document.getElementById('errormsg');
        errorMessage.innerHTML = mensagem;
        errorMessageBox.style.opacity = '1'; // Seta opacidade para 1

        setTimeout(() => {
            let opacity = 1;
            const fadeInterval = setInterval(() => {
                opacity -= 0.1; // Diminui a opacidade gradualmente
                if (opacity <= 0) {
                    clearInterval(fadeInterval);
                    opacity = 0;
                }
                errorMessageBox.style.opacity = opacity;
            }, 100); // Tick que reduz a opacidade
        }, 5000); // Quantidade de tempo que a mensagem aparece
}

function atualizarTimer(temporestante){
    let timer = document.getElementById('timer');
    timer.innerHTML = `O jogo irá iniciar em ${temporestante} segundos...`;
}

function alterarVisibilidade(id){ //
    let elemento = document.getElementById(id);
    elemento.hidden = !elemento.hidden;
    // Se estiver hidden fica não hidden, se estiver não hidden fica hidden
}

function carregarPessoas(pos) {
    for (let i = 0; i < 3; i++) {
        document.getElementById(`nome${i + 2}`).innerHTML = pos[i];
    }
}
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

function carregarCartas(cartas){
    for (let i = 0; i < 3; i++){
        document.getElementById(`c1pessoa${i + 1}carta`).src = `images/cartas/${cartas[i][0]}_${cartas[i][1]}.png`;
    }
}

function carregarImagem(id, imagem){
    console.log(`id familioa ${id}, imageom ${imagem}`)
    document.getElementById(id).src = imagem;
}

let repetido = false; // Variável global para controlar repetição

let intervalId;

function updateTimeBar(jogadoratual) {
    let repetido = false;
    let elem = document.getElementById("barrinha");
    let demo = document.getElementById("temporestantejogada");
    let jogadorturno = document.getElementById('turnojogadortempo');

    if (intervalId) {
        clearInterval(intervalId);  // Clear the existing interval
    }

    if (jogadoratual == 'parartimer') {
        let width = 100;
        let tempo = 1100;
        jogadorturno.innerHTML = `Turno de ------`;
        elem.style.width = 100 + '%';
        demo.innerHTML = '--';
        repetido = true;
    }
    else {
        let width = 100;
        let tempo = 1100;
        jogadorturno.innerHTML = `Turno de ${jogadoratual}`;
        if (jogadoratual == 'truko'){
            jogadorturno.innerHTML = `${jogadoratual} pediu Truko!`;
            tempo = 1600;
        }

        intervalId = setInterval(frame, 10);

        function frame() {
            if (tempo <= 0 || repetido) {
                clearInterval(intervalId);
            } else {
                width -= 0.1;
                tempo--;
                elem.style.width = width + '%';
                demo.innerHTML = `${parseInt(tempo / 100)}`;
            }
        }
    }
}

function selecionarCarta(carta){
    let cartaselecionada = document.getElementById(`c1pessoa${carta}carta`).src;
    // Sei que é gigante, mas isso retorna o valor da carta, tipo C_2
    let valorcarta = cartaselecionada.slice
    (cartaselecionada.length - 7,cartaselecionada.length).slice(0,3);
    socket.emit('recebercartajogada', `c1pessoa${carta}carta`, valorcarta);
}

function botaoTruko(){
    socket.emit('botaotruko');
}

function updateTexto(id, texto) {
    document.getElementById(id).innerHTML = texto;
}

function trukoHandler(action) {
    socket.emit('trukohandler', action);
}
