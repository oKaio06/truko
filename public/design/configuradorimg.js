//
let tras = document.getElementById("tras");
tras.style.width = '120px';
tras.style.height = '179px';
tras.style.border = 'gray 2px solid';
tras.style.borderRadius = '10px';
for (p = 1; 5; p++){
    for (c = 1; 4; c++){
        let alterar = document.getElementById(`${p}pessoa${c}carta`)
        console.log(alterar)
        alterar.style.width = '120px';
        alterar.style.height = '179px';
        alterar.style.border = 'gray 2px solid';
        alterar.style.borderRadius = '10px';
    }
}
