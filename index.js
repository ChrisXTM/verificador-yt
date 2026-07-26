const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ⚠️ Variables de configuración
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyC7i_KURfsl34xGdJ7O9JIxri-CFtNhB54";
const YOUR_CHANNEL_ID = "UCKCBWFnPAzrUX16Nw-MES0Q"; // Tu ID de canal

/**
 * Extrae y limpia el ID de Canal (UC...) o Handle (@...) de cualquier texto o URL pegada
 */
async function getChannelIdFromHandle(rawInput) {
    if (!rawInput) return null;

    let cleanInput = decodeURIComponent(rawInput).trim();

    // 1. EXTRAER ID DIRECTO (UC... de 24 caracteres), incluso si viene dentro de una URL o texto sucio
    const ucMatch = cleanInput.match(/UC[a-zA-Z0-9_-]{22}/);
    if (ucMatch) {
        const foundUcId = ucMatch[0];
        console.log(`[DEBUG] ID de Canal (UC) detectado y limpiado: ${foundUcId}`);
        return foundUcId;
    }

    // 2. EXTRAER HANDLE (@usuario), incluso si viene dentro de una URL
    const handleMatch = cleanInput.match(/@[a-zA-Z0-9._-]+/);
    let formattedHandle = "";

    if (handleMatch) {
        formattedHandle = handleMatch[0];
    } else {
        // Si ingresaron un texto plano sin @ ni UC, le agregamos el @
        cleanInput = cleanInput.split(']')[0].split(' ')[0]; // Limpia corchetes o espacios extra
        formattedHandle = cleanInput.startsWith('@') ? cleanInput : `@${cleanInput}`;
    }

    try {
        console.log(`[DEBUG] Consultando API de YouTube para handle limpiado: ${formattedHandle}`);
        
        const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: {
                part: 'id',
                forHandle: formattedHandle,
                key: YOUTUBE_API_KEY
            }
        });

        const items = response.data.items || [];
        console.log(`[DEBUG] Canales encontrados para ${formattedHandle}: ${items.length}`);

        if (items.length > 0) {
            const channelId = items[0].id;
            console.log(`[DEBUG] Channel ID encontrado: ${channelId}`);
            return channelId;
        } else {
            console.log(`[WARN] No se encontró canal para el handle: ${formattedHandle}`);
        }
    } catch (error) {
        console.error('[ERROR] Error al consultar la API de YouTube:', error.response?.data || error.message);
    }
    
    return null;
}

/**
 * Endpoint de Verificación
 */
app.get('/verify-subscription', async (req, res) => {
    const { username } = req.query;

    if (!username || username.trim().length === 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Debes proporcionar un nombre de usuario, handle o ID de canal.' 
        });
    }

    try {
        console.log(`\n--- NUEVA PETICIÓN RECIBIDA: ${username} ---`);

        // 1. Obtener y limpiar el Channel ID del usuario
        const userChannelId = await getChannelIdFromHandle(username);
        
        if (!userChannelId) {
            return res.json({ 
                success: false, 
                message: 'No se encontró el canal de YouTube. Verifica el handle o ID ingresado.' 
            });
        }

        // 2. Verificar suscripción en la API de YouTube
        console.log(`[DEBUG] Verificando si ${userChannelId} está suscrito a tu canal (${YOUR_CHANNEL_ID})...`);
        
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
            console.log(`✅ [EXITO] ¡Suscripción confirmada!`);
            return res.json({ 
                success: true, 
                message: '¡Suscripción confirmada!' 
            });
        } else {
            console.log(`❌ [FALLO] No se detectó suscripción pública.`);
            return res.json({ 
                success: false, 
                message: 'No se detectó tu suscripción. Asegúrate de estar suscrito y de tener tus suscripciones en modo PÚBLICO.' 
            });
        }

    } catch (error) {
        console.error('💥 [ERROR CRÍTICO]:', error.response?.data || error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno al consultar la API de YouTube.' 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor activo en el puerto ${PORT}`);
});
