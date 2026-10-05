/*document.addEventListener('DOMContentLoaded', function(){
    const formulario = document.getElementById('frmFormulario');
    
    formulario.addEventListener('submit', function(e){
        e.preventDefault();

        const user = document.getElementById('txtUser').value.trim();
        const pass = document.getElementById('txtPass').value.trim();

        if(user==="tito" && pass==="123"){
            window.location.href="home.php";

        }else{
            alert("datos incorrectos");
        }
    });

    
});*/

document.addEventListener('DOMContentLoaded',function(){
    const check = document.getElementById('chkMostrar');
    const pass = document.getElementById('txtPass');

    if(check && pass){
        check.addEventListener('change',function(){
            pass.type = this.checked ? 'text' : 'password';
        });
    }
});

/* Script de registro*/
/* boton Cancelat*/
/*
document.addEventListener('DOMContentLoaded',function(){
    const frmRegeistro = document.getElementById('frmRegistro');
    

    frmRegeistro.addEventListener('reset',function(e){
        e.preventDefault();

        const btnReset = document.getElementById('btnCancelar');        
        const txtNom = document.getElementById('txtNombre');

        alert("quier limpipar");

    });
});*/


