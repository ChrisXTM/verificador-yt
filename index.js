const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ⚠️ Variables de entorno
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyC7i_KURfsl34xGdJ7O9JIxri-CFtNhB54";
const YOUR_CHANNEL_ID = "UCKCBWFnPAzrUX16Nw-MES0Q"; // ID de tu canal

/**
 * Convierte un handle (ej. @ChrisXTM) en un Channel ID de YouTube (UC...)
 */
async function getChannelIdFromHandle(handle) {
    // Si el usuario ya ingresó un Channel ID (empieza por UC), lo usamos directamente
    if (handle.startsWith('UC') && handle.length === 24) {
        return handle;
    }

    // LA API DE YOUTUBE REQUIERE OBLIGATORIAMENTE EL '@' EN forHandle
    const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;
    
    try {
        console.log(`[DEBUG] Buscando Channel ID para el handle: ${formattedHandle}`);
        const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: {
                part: 'id',
                forHandle: formattedHandle,
                key: YOUTUBE_API_KEY
            }
        });

        if (response.data.items && response.data.items.length > 0) {
            const channelId = response.data.items[0].id;
            console.log(`[DEBUG] Channel ID encontrado: ${channelId}`);
            return channelId;
        }
    } catch (error) {
        console.error('[ERROR] Al buscar el handle en YouTube:', error.response?.data || error.message);
    }
    
    return null;
}

/**
 * Endpoint de Verificación
 * Ejemplo: GET /verify-subscription?username=@usuario
 */
app.get('/verify-subscription', async (req, res) => {
    const { username } = req.query;

    if (!username || username.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Debes proporcionar un nombre de usuario o handle.' });
    }

    try {
        // 1. Obtener el Channel ID del usuario
        const userChannelId = await getChannelIdFromHandle(username.trim());
        
        if (!userChannelId) {
            return res.json({ 
                success: false, 
                message: 'No se encontró el canal de YouTube. Verifica que el handle sea correcto (ejemplo: @ChrisXTM).' 
            });
        }

        // 2. Consultar si ese canal está suscrito a TU canal
        console.log(`[DEBUG] Verificando si ${userChannelId} está suscrito a ${YOUR_CHANNEL_ID}...`);
        
        const subCheck = await axios.get('https://www.googleapis.com/youtube/v3/subscriptions', {
            params: {
                part: 'snippet',
                channelId: userChannelId,      // Canal del suscriptor
                forChannelId: YOUR_CHANNEL_ID, // Tu canal
                key: YOUTUBE_API_KEY
            }
        });

        const isSubscribed = subCheck.data.items && subCheck.data.items.length > 0;

        if (isSubscribed) {
            console.log(`[EXITO] ¡Suscripción confirmada para ${username}!`);
            return res.json({ success: true, message: '¡Suscripción confirmada!' });
        } else {
            console.log(`[FALLO] No se detectó suscripción pública para ${username}.`);
            return res.json({ 
                success: false, 
                message: 'No se detectó tu suscripción. Asegúrate de estar suscrito y de tener tus suscripciones en modo PÚBLICO.' 
            });
        }

    } catch (error) {
        console.error('[ERROR CRÍTICO] En la API de YouTube:', error.response?.data || error.message);
        return res.status(500).json({ success: false, message: 'Error interno al consultar la API de YouTube.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo en el puerto ${PORT}`);
});
