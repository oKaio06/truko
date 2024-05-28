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
    socket.on('mensagemerro', mensagem => {
        errorText(mensagem)
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