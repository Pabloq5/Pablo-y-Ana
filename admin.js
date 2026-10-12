// URL de tu servidor backend en Render
const API_URL = 'https://backend-boda-dghi.onrender.com/api';

// Conexión para visualizar cada cambio a tiempo real usando Socket.io
const socket = io('https://backend-boda-dghi.onrender.com');

// Referencias a los elementos del HTML
const formInvitado = document.getElementById('form-invitado');
const inputNombre = document.getElementById('nombre-invitado');
const tablaInvitados = document.getElementById('tabla-invitados');

// Función para transformar el nombre en un formato limpio para la URL
function generarSlug(nombre) {
    return nombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quita tildes
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, '-')     // Cambia espacios y caracteres raros por guión
        .replace(/^-+|-+$/g, '');           // Limpia guiones al inicio y final
}

// Evento: Al enviar el formulario para crear un invitado
formInvitado.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = inputNombre.value;

    try {
        const respuesta = await fetch(`${API_URL}/invitados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombres: nombre })
        });

        if (respuesta.ok) {
            inputNombre.value = '';
            cargarInvitados();
        } else {
            console.error("Error del servidor al intentar guardar");
        }
    } catch (error) {
        console.error("Error al generar la invitación:", error);
    }
});

// Función para obtener todos los invitados de la base de datos y mostrarlos
async function cargarInvitados() {
    try {
        const respuesta = await fetch(`${API_URL}/invitados`);
        const invitados = await respuesta.json();
        
        tablaInvitados.innerHTML = '';

        invitados.forEach(invitado => {
            const rutaBase = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
            const slug = generarSlug(invitado.nombres);
            
            // La URL ahora solo contiene "invitacion.html" y el nombre de la persona
            const enlaceUnico = `${rutaBase}/invitacion.html?${slug}`;
            
            let claseEstado = 'pendiente';
            if(invitado.estadoAsistencia === 'Asistirá') claseEstado = 'asistira';
            if(invitado.estadoAsistencia === 'No asistirá') claseEstado = 'no-asistira';

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${invitado.nombres}</td>
                <td><a href="${enlaceUnico}" target="_blank">${enlaceUnico}</a></td>
                <td><span class="badge ${claseEstado}" id="estado-${invitado.token}">${invitado.estadoAsistencia}</span></td>
                <td>
                    <button onclick="navigator.clipboard.writeText('${enlaceUnico}')">Copiar</button>
                    <button onclick="eliminarInvitacion('${invitado.token}')" style="background-color: #dc3545; margin-left: 5px;">Eliminar</button>
                </td>
            `;
            tablaInvitados.appendChild(fila);
        });
    } catch (error) {
        console.error("Error al cargar la lista:", error);
    }
}

// LÓGICA DE TIEMPO REAL (SOCKET.IO)
socket.on('actualizacionAsistencia', (datos) => {
    const estadoBadge = document.getElementById(`estado-${datos.token}`);
    if (estadoBadge) {
        estadoBadge.textContent = datos.nuevoEstado;
        estadoBadge.className = 'badge'; 
        if(datos.nuevoEstado === 'Asistirá') estadoBadge.classList.add('asistira');
        if(datos.nuevoEstado === 'No asistirá') estadoBadge.classList.add('no-asistira');
    }
});

// Cargar la lista al abrir la página por primera vez
cargarInvitados();

// Función para eliminar un invitado y anular su enlace
async function eliminarInvitacion(token) {
    const confirmar = confirm("¿Estás seguro? El enlace dejará de funcionar permanentemente.");
    if (!confirmar) return;

    try {
        const respuesta = await fetch(`${API_URL}/invitados/${token}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            cargarInvitados();
        } else {
            alert("No se pudo eliminar al invitado.");
        }
    } catch (error) {
        console.error("Error al eliminar:", error);
    }
}
