const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ⚠️ Configura tus variables aquí o mediante variables de entorno (.env)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyC7i_KURfsl34xGdJ7O9JIxri-CFtNhB54";
const YOUR_CHANNEL_ID = "UCKCBWFnPAzrUX16Nw-MES0Q"; // ID de tu canal de YouTube (empieza por UC...)

/**
 * Convierte un handle (ej. @ChrisXTM) en un Channel ID de YouTube
 */
async function getChannelIdFromHandle(handle) {
    const cleanHandle = handle.replace('@', '');
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
            part: 'id',
            forHandle: cleanHandle,
            key: YOUTUBE_API_KEY
        }
    });

    if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0].id;
    }
    return null;
}

/**
 * Endpoint de Verificación llamado por el Script de Roblox
 * Ejemplo de llamada: GET /verify-subscription?username=@usuario
 */
app.get('/verify-subscription', async (req, res) => {
    const { username } = req.query;

    if (!username || username.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Debes proporcionar un nombre de usuario.' });
    }

    try {
        // 1. Obtener el Channel ID del usuario
        const userChannelId = await getChannelIdFromHandle(username);
        
        if (!userChannelId) {
            return res.json({ success: false, message: 'No se encontró el canal de YouTube especificado.' });
        }

        // 2. Consultar si ese canal está suscrito a TU canal
        const subCheck = await axios.get('https://www.googleapis.com/youtube/v3/subscriptions', {
            params: {
                part: 'snippet',
                channelId: userChannelId,      // Canal del usuario que busca verificarse
                forChannelId: YOUR_CHANNEL_ID, // Tu canal
                key: YOUTUBE_API_KEY
            }
        });

        // Si devuelve elementos en `items`, significa que SÍ está suscrito y sus suscripciones son PÚBLICAS
        const isSubscribed = subCheck.data.items && subCheck.data.items.length > 0;

        if (isSubscribed) {
            return res.json({ success: true, message: '¡Suscripción confirmada!' });
        } else {
            return res.json({ 
                success: false, 
                message: 'No se detectó tu suscripción. Asegúrate de estar suscrito y de tener tus suscripciones en modo PÚBLICO en YouTube.' 
            });
        }

    } catch (error) {
        console.error('Error en la API de YouTube:', error.response?.data || error.message);
        return res.status(500).json({ success: false, message: 'Error interno en la API.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo en el puerto ${PORT}`);
});