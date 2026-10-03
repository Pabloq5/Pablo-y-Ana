// URL de tu servidor backend local
const API_URL = 'https://backend-boda-dghi.onrender.com/api';

console.log("1. El archivo invitacion.js cargó correctamente");

// Extraer el "token" de la URL
const parametrosURL = new URLSearchParams(window.location.search);
const token = parametrosURL.get('token');

console.log("2. El token leído de la URL es:", token);

// Referencias a los elementos del HTML
const tituloNombre = document.getElementById('guest-name');
const btnAsistire = document.getElementById('btn-yes');
const btnNoAsistire = document.getElementById('btn-no');
const mensajeEstado = document.getElementById('mensaje-estado');

// Función para cargar los datos del invitado
async function cargarInvitacion() {
    if (!token) {
        console.log("3. Modo vista previa (sin token en la URL).");
        if (tituloNombre) tituloNombre.textContent = "Familia & Amigos";
        return;
    }

    try {
        console.log("3. Consultando a la base de datos...");
        const respuesta = await fetch(`${API_URL}/invitacion/${token}`);
        const invitado = await respuesta.json();

        console.log("4. Datos recibidos del servidor:", invitado);

        if (respuesta.ok) {
            tituloNombre.textContent = invitado.nombres;

            // Validamos si ya pasó el tiempo límite de modificación
            const ahora = new Date();
            const fechaLimite = new Date(invitado.limiteModificacion);

            console.log("Fecha actual:", ahora);
            console.log("Fecha límite:", fechaLimite);

            if (ahora > fechaLimite) {
                if (mensajeEstado) mensajeEstado.textContent = "El tiempo para confirmar asistencia ha finalizado.";
            } else {
                // Habilitamos los botones si aún hay tiempo
                if (btnAsistire) btnAsistire.disabled = false;
                if (btnNoAsistire) btnNoAsistire.disabled = false;

                if (invitado.estadoAsistencia !== 'Pendiente') {
                    if (mensajeEstado) mensajeEstado.textContent = `Tu respuesta actual: ${invitado.estadoAsistencia}`;
                }
            }
        } else {
            if (tituloNombre) tituloNombre.textContent = "Invitación no encontrada";
        }
    } catch (error) {
        console.error("Error de conexión:", error);
    }
}

// Función para enviar la respuesta de asistencia
async function enviarRespuesta(estado) {
    if (!token) {
        if (mensajeEstado) mensajeEstado.textContent = `¡Gracias! Respuesta de prueba registrada: ${estado}`;
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/invitacion/${token}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estadoAsistencia: estado })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            if (mensajeEstado) mensajeEstado.textContent = `¡Gracias! Has confirmado que: ${estado}`;
            alert("Tu respuesta ha sido guardada.");
        } else {
            alert(datos.error); 
        }
    } catch (error) {
        alert("Hubo un error al enviar tu respuesta.");
    }
}

// Asignar los eventos de clic a los botones (solo si existen en el HTML)
if (btnAsistire) btnAsistire.addEventListener('click', () => enviarRespuesta('Asistirá'));
if (btnNoAsistire) btnNoAsistire.addEventListener('click', () => enviarRespuesta('No asistirá'));

// 👇 ESTA ES LA LÍNEA MÁS IMPORTANTE QUE HACE QUE TODO ARRANQUE 👇
cargarInvitacion();

// --- LÓGICA DEL CONTADOR DE TIEMPO ---
const fechaBoda = new Date(2026, 11, 18, 15, 0, 0).getTime();
const elementoDias = document.getElementById('dias');
const elementoHoras = document.getElementById('horas');
const elementoMinutos = document.getElementById('minutos');
const elementoSegundos = document.getElementById('segundos');

if (elementoDias && elementoHoras && elementoMinutos && elementoSegundos) {
    const intervaloReloj = setInterval(() => {
        const ahora = new Date().getTime();
        const distancia = fechaBoda - ahora;

        const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
        const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((distancia % (1000 * 60)) / 1000);

        elementoDias.textContent = dias < 10 ? "0" + dias : dias;
        elementoHoras.textContent = horas < 10 ? "0" + horas : horas;
        elementoMinutos.textContent = minutos < 10 ? "0" + minutos : minutos;
        elementoSegundos.textContent = segundos < 10 ? "0" + segundos : segundos;

        if (distancia < 0) {
            clearInterval(intervaloReloj);
            elementoDias.textContent = "00";
            elementoHoras.textContent = "00";
            elementoMinutos.textContent = "00";
            elementoSegundos.textContent = "00";
        }
    }, 1000);
}

// ----------------------------------------------------
// LÓGICA DE LA MÚSICA DE FONDO (AUTOPLAY)
// ----------------------------------------------------
const reproductorMusica = document.getElementById('musica-fondo');
const btnMusica = document.getElementById('btn-musica');

let musicaReproduciendo = false;

if (reproductorMusica) {
    reproductorMusica.volume = 0.2; // Ajustamos el volumen al 20%
}

// Función para encender la música y cambiar el botón
function encenderMusica() {
    if (!musicaReproduciendo && reproductorMusica) {
        reproductorMusica.play().then(() => {
            if (btnMusica) btnMusica.textContent = '🔊 Pausar Música';
            musicaReproduciendo = true;
        }).catch((error) => {
            console.log("Esperando interacción del usuario para reproducir audio.");
        });
    }
}

// 1. Intentamos reproducir apenas cargue la página
window.addEventListener('load', () => {
    encenderMusica();
});

// 2. Si el navegador lo bloqueó, lo activamos al primer clic en cualquier parte
document.body.addEventListener('click', () => {
    if (!musicaReproduciendo) {
        encenderMusica();
    }
}, { once: true }); // El {once: true} asegura que este evento global solo se ejecute una vez

// 3. El botón sigue funcionando para que el invitado decida pausarla
if (btnMusica && reproductorMusica) {
    btnMusica.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que este clic active el evento global de arriba
        if (musicaReproduciendo) {
            reproductorMusica.pause();
            btnMusica.textContent = '🔇 Reproducir Música';
            musicaReproduciendo = false;
        } else {
            encenderMusica();
        }
    });
}
