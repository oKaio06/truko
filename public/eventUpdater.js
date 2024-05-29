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
            let nome = nomes[i][0]
            let time = nomes[i][1]
            let posicao = nomes[i][2]
            let id = `time${time}pessoa${posicao}`
            document.getElementById(id).innerHTML = `${nome}`
        }
    })
    // Mostra mensagem de erro para usuário
    socket.on('mensagemerro', mensagem => {
        errorText(mensagem)
    })

    // Mostra o contador para todos os usuários
    socket.on('timerinicio', temporestante => {
        atualizarTimer(temporestante)
    })

    // Altera a visibilidade dos elementos dentro do HTML
    socket.on('alterarvisibilidade', id => {
        alterarVisibilidade(id)
    })

    // Carrega os nomes das pessoas no momento
    socket.on('carregarpessoas', posicoes => {
        carregarPessoas(posicoes)
        console.log('jogadores carregados')
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
    timer.innerHTML = `O jogo irá iniciar em ${temporestante} segundos...`
}

function alterarVisibilidade(id){
    let elemento = document.getElementById(id);
    elemento.hidden = !elemento.hidden;
    // Se estiver hidden fica não hidden, se estiver não hidden fica hidden
}

function carregarPessoas(pos) {
    for (let i = 0; i < 3; i++) {
        console.log(i+2, pos[i])
        document.getElementById(`nome${i + 2}`).innerHTML = pos[i]
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
