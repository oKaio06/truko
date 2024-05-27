// Mensagem de quando usuário sai da tela do truko
let docTitle = document.title;
window.addEventListener("blur", () =>{
    document.title = "Volte para o jogo!";
});
window.addEventListener("focus", () =>{
    document.title = docTitle;
});




