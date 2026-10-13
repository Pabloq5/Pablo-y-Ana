const API_URL = 'https://backend-boda-dghi.onrender.com/api';

console.log("1. El archivo invitacion.js cargó correctamente");

const parametrosURL = new URLSearchParams(window.location.search);
let identificador = parametrosURL.get('invitado') || parametrosURL.get('para') || parametrosURL.get('token');

if (!identificador && window.location.search.length > 1) {
    const rawQuery = window.location.search.substring(1).split('&')[0];
    if (rawQuery && !rawQuery.includes('=')) {
        identificador = decodeURIComponent(rawQuery);
    }
}

console.log("2. Identificador leído de la URL:", identificador);

// Referencias a los elementos del HTML
const tituloNombre = document.getElementById('guest-name');
const btnAsistire = document.getElementById('btn-yes');
const btnNoAsistire = document.getElementById('btn-no');
const mensajeEstado = document.getElementById('mensaje-estado');

// Variable global para guardar el token real del invitado en base de datos
let tokenActivo = null;

// Función para normalizar texto (ignorar tildes, mayúsculas y guiones)
function normalizarTexto(txt) {
    if (!txt) return '';
    return txt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

// Función para cargar los datos del invitado
async function cargarInvitacion() {
    if (!identificador) {
        console.log("3. Modo vista previa (sin invitado en la URL).");
        if (tituloNombre) tituloNombre.textContent = "Familia & Amigos";
        return;
    }

    try {
        console.log("3. Consultando información del invitado...");
        let invitado = null;

        // Intento de búsqueda directa por token o slug
        try {
            const respuestaDirecta = await fetch(`${API_URL}/invitacion/${encodeURIComponent(identificador)}`);
            if (respuestaDirecta.ok) {
                invitado = await respuestaDirecta.json();
            }
        } catch (e) {
            console.log("No encontrado directamente, buscando por nombre...");
        }

        if (!invitado) {
            const respuestaLista = await fetch(`${API_URL}/invitados`);
            if (respuestaLista.ok) {
                const listaInvitados = await respuestaLista.json();
                const normalizadoBuscado = normalizarTexto(identificador);
                invitado = listaInvitados.find(inv => {
                    return inv.token === identificador ||
                           normalizarTexto(inv.nombres) === normalizadoBuscado;
                });
            }
        }

        console.log("4. Invitado encontrado:", invitado);

        if (invitado) {
            tokenActivo = invitado.token;
            tituloNombre.textContent = invitado.nombres;
            const ahora = new Date();
            const fechaLimite = new Date('2026-10-30T23:59:59');

            if (ahora > fechaLimite) {
                if (mensajeEstado) mensajeEstado.textContent = "El tiempo para confirmar asistencia finalizó el 30 de octubre de 2026 (23:59).";
                if (btnAsistire) btnAsistire.disabled = true;
                if (btnNoAsistire) btnNoAsistire.disabled = true;
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
        console.error("Error de conexión al cargar invitación:", error);
    }
}

// Función para enviar la respuesta de asistencia
async function enviarRespuesta(estado) {
    const ahora = new Date();
    const fechaLimite = new Date('2026-10-30T23:59:59');
    if (ahora > fechaLimite) {
        alert("El tiempo límite para confirmar o modificar tu asistencia ha finalizado (30/10/2026 a las 23:59).");
        return;
    }
    const tokenParaGuardar = tokenActivo || identificador;
    if (!tokenParaGuardar) {
        if (mensajeEstado) mensajeEstado.textContent = `¡Gracias! Respuesta de prueba registrada: ${estado}`;
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/invitacion/${tokenParaGuardar}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estadoAsistencia: estado })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            if (mensajeEstado) mensajeEstado.textContent = `¡Gracias! Has confirmado que: ${estado}`;
            alert("Tu respuesta ha sido guardada.");
        } else {
            alert(datos.error || "No se pudo registrar la respuesta"); 
        }
    } catch (error) {
        alert("Hubo un error al enviar tu respuesta.");
    }
}

// Asignar los eventos de clic a los botones
if (btnAsistire) btnAsistire.addEventListener('click', () => enviarRespuesta('Asistirá'));
if (btnNoAsistire) btnNoAsistire.addEventListener('click', () => enviarRespuesta('No asistirá'));

// Iniciar carga del invitado
cargarInvitacion();

// LÓGICA DEL CONTADOR DE TIEMPO 
const fechaBoda = new Date(2026, 11, 18, 14, 30, 0).getTime(); 
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

// LÓGICA DE LA MÚSICA DE FONDO 
const reproductorMusica = document.getElementById('musica-fondo');
const btnMusica = document.getElementById('btn-musica');

let musicaReproduciendo = false;

if (reproductorMusica) {
    try {
        reproductorMusica.volume = 0.35; // Volumen óptimo
    } catch (e) {
    }
}

function actualizarBotonMusica(reproduciendo) {
    if (!btnMusica) return;
    if (reproduciendo) {
        btnMusica.innerHTML = ' <i class="bi bi-volume-mute-fill"></i> Pausar Música';
        btnMusica.classList.remove('pulse');
    } else {
        btnMusica.innerHTML = ' <i class="bi bi-volume-up-fill"></i> Activar Música';
        btnMusica.classList.add('pulse');
    }
}

// Función para iniciar la música
function encenderMusica() {
    if (!reproductorMusica) return;
    
    const playPromise = reproductorMusica.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            musicaReproduciendo = true;
            actualizarBotonMusica(true);
            removerListenersInteraccion();
        }).catch((error) => {
            // Políticas de autoplay en celulares bloquean el audio hasta el primer toque
            console.log("Autoplay en espera de interacción táctil:", error.message || error);
            actualizarBotonMusica(false);
        });
    }
}

function pausarMusica() {
    if (!reproductorMusica) return;
    reproductorMusica.pause();
    musicaReproduciendo = false;
    actualizarBotonMusica(false);
}

// Manejador del primer toque/gesto en celular
function activarMusicaAlInteractuar() {
    if (!musicaReproduciendo) {
        encenderMusica();
    }
}

const eventosTactiles = ['touchstart', 'touchend', 'click', 'pointerdown'];

function agregarListenersInteraccion() {
    eventosTactiles.forEach(evento => {
        window.addEventListener(evento, activarMusicaAlInteractuar, { passive: true });
        document.addEventListener(evento, activarMusicaAlInteractuar, { passive: true });
    });
}

function removerListenersInteraccion() {
    eventosTactiles.forEach(evento => {
        window.removeEventListener(evento, activarMusicaAlInteractuar);
        document.removeEventListener(evento, activarMusicaAlInteractuar);
    });
}

// Intentamos reproducción automática directa (funciona en desktop si hay permiso)
window.addEventListener('load', () => {
    encenderMusica();
});

// Escuchamos el primer toque/scroll en el celular para desbloquear el audio inmediatamente
agregarListenersInteraccion();

// También activar al hacer clic en el botón de bienvenida "Ver invitación →"
const btnHero = document.querySelector('.boton-portada');
if (btnHero) {
    btnHero.addEventListener('click', () => {
        if (!musicaReproduciendo) encenderMusica();
    });
}

// Control manual para pausar/reanudar cuando el invitado lo desee
if (btnMusica && reproductorMusica) {
    btnMusica.addEventListener('click', (e) => {
        e.stopPropagation();
        if (musicaReproduciendo) {
            pausarMusica();
        } else {
            encenderMusica();
        }
    });
}
