// ____________________________ Gerar conexão socket ____________________________
const socket = io()
// ____________________________ Pegar nome do jogador e mandar para registrar no servidor ____________________________
function criarnome(){
    let nome = prompt("Digite seu nome: ");
    if (nome == null || nome == "" || nome.trim() === "" || nome.length < 4){
        return criarnome()
    }
    else{
        return nome
    }
}
const nome = criarnome()
socket.emit('registrarnomes', nome);

socket.on('enviarnome', (nome) => {
    const idpessoa = nome.idpessoa;
    document.getElementById("boasvindas").innerHTML = `Bem-vindo de volta, ${idpessoa}!`
});

