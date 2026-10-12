// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto'); // Para generar el token único
const Invitado = require('./db'); // Importamos la conexión y el modelo

const app = express();
const server = http.createServer(app);

// Configuración de Socket.io para la actualización en tiempo real
const io = new Server(server, {
    cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// 
// RUTAS PARA EL PANEL DE ADMINISTRADOR
// 

// 1. Obtener todos los invitados (Para llenar la tabla)
app.get('/api/invitados', async (req, res) => {
    try {
        const invitados = await Invitado.find();
        res.json(invitados);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener invitados' });
    }
});

// 2. Generar una nueva invitación
app.post('/api/invitados', async (req, res) => {
    try {
        const { nombres } = req.body;
        // Generamos un token alfanumérico corto (ej. a1b2c3d4)
        const token = crypto.randomBytes(4).toString('hex'); 
        
        // Configuramos la fecha límite (ejemplo: 20 de agosto de 2025)
        const limite = new Date('2026-10-30T23:59:59');

        const nuevoInvitado = new Invitado({
            nombres,
            token,
            limiteModificacion: limite
        });

        await nuevoInvitado.save();
        res.status(201).json(nuevoInvitado);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la invitación' });
    }
});

// 
// RUTAS PARA LA INVITACIÓN DEL CLIENTE
// 

// 3. Obtener los datos de un invitado específico (por token o por nombre)
app.get('/api/invitacion/:identificador', async (req, res) => {
    try {
        const { identificador } = req.params;
        
        // 1. Buscamos primero por token exacto
        let invitado = await Invitado.findOne({ token: identificador });
        
        // 2. Si no existe por token, buscamos comparando con el nombre normalizado
        if (!invitado) {
            const cleanIdent = identificador.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const todos = await Invitado.find();
            invitado = todos.find(inv => {
                const cleanNombre = (inv.nombres || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return cleanNombre === cleanIdent;
            });
        }
        
        if (!invitado) {
            return res.status(404).json({ error: 'Invitación no encontrada' });
        }
        
        res.json(invitado);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la invitación' });
    }
});

// 4. Confirmar o rechazar asistencia (soporta token o nombre)
app.put('/api/invitacion/:identificador', async (req, res) => {
    try {
        const { identificador } = req.params;
        const { estadoAsistencia } = req.body;

        let invitado = await Invitado.findOne({ token: identificador });
        if (!invitado) {
            const cleanIdent = identificador.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const todos = await Invitado.find();
            invitado = todos.find(inv => {
                const cleanNombre = (inv.nombres || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return cleanNombre === cleanIdent;
            });
        }

        if (!invitado) {
            return res.status(404).json({ error: 'Invitación no encontrada' });
        }

        const ahora = new Date();
        const limiteOficial = new Date('2026-10-30T23:59:59');
        if (ahora > limiteOficial) {
            return res.status(403).json({ error: 'El tiempo de confirmación ha expirado (límite: 30 de octubre de 2026 a las 23:59)' });
        }

        invitado.estadoAsistencia = estadoAsistencia;
        await invitado.save();

        io.emit('actualizacionAsistencia', {
            token: invitado.token,
            nuevoEstado: invitado.estadoAsistencia
        });

        res.json({ mensaje: 'Asistencia actualizada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar asistencia' });
    }
});

// 4. Eliminar una invitación (Anula el enlace)
app.delete('/api/invitados/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const resultado = await Invitado.findOneAndDelete({ token });
        
        if (!resultado) {
            return res.status(404).json({ error: 'Invitación no encontrada' });
        }
        
        res.json({ mensaje: 'Invitación eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la invitación' });
    }
});

// Iniciar el servidor
server.listen(3000, () => {
    console.log('Servidor corriendo en el puerto 3000');
});