socket.on('enviarnome', (nome) => {
    let idpessoa = nome.idpessoa;
    idpessoa = idpessoa.toLowerCase();
    if (idpessoa == "menino trevoso"){
        document.getElementById("eastereggs").innerHTML = "O menino trevoso está participando da partida.";
    }
});
