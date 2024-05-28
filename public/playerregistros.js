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
        socket.emit('checarnomes', nome);
        socket.on('receberverificacaonomes', resposta => {
            if (resposta){
                return criarnome("Nome já utilizado! Digite seu nome: ");
            }
        })
        return nome;
    }


    const nome = criarnome("Digite seu nome:")
    socket.emit('registrarnomes', nome);

    socket.on('enviarnome', (nome) => {
        const idpessoa = nome.idpessoa;
        document.getElementById("boasvindas").innerHTML = `Bem-vindo de volta, ${idpessoa}!`
    });

    socket.on('message', (message) => {
        console.log(message)
        document.getElementById('testeserv').innerHTML = `${message}`
    })

});