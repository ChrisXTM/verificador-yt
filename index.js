const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ⚠️ Variables de configuración
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyC7i_KURfsl34xGdJ7O9JIxri-CFtNhB54";
const YOUR_CHANNEL_ID = "UCKCBWFnPAzrUX16Nw-MES0Q"; // Tu ID de canal (UC...)

/**
 * Convierte un handle (ej. @ChrisXTM) o un ID directo en un Channel ID de YouTube (UC...)
 */
async function getChannelIdFromHandle(handle) {
    const cleanHandle = handle.trim();

    // 1. Si el usuario ya ingresó un Channel ID válido (empieza por UC y tiene 24 caracteres)
    if (cleanHandle.startsWith('UC') && cleanHandle.length === 24) {
        console.log(`[DEBUG] Se ingresó un Channel ID directo: ${cleanHandle}`);
        return cleanHandle;
    }

    // 2. La API de YouTube exige obligatoriamente el '@' al consultar por handle
    const formattedHandle = cleanHandle.startsWith('@') ? cleanHandle : `@${cleanHandle}`;
    
    try {
        console.log(`[DEBUG] Consultando API de YouTube para handle: ${formattedHandle}`);
        
        const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: {
                part: 'id',
                forHandle: formattedHandle,
                key: YOUTUBE_API_KEY
            }
        });

        const items = response.data.items || [];
        console.log(`[DEBUG] YouTube respondió OK. Canales encontrados: ${items.length}`);

        if (items.length > 0) {
            const channelId = items[0].id;
            console.log(`[DEBUG] Channel ID encontrado exitosamente: ${channelId}`);
            return channelId;
        } else {
            console.log(`[WARN] No se encontró ningún canal vinculado al handle: ${formattedHandle}`);
        }
    } catch (error) {
        console.error('[ERROR] Falló la búsqueda del handle en la API de YouTube:');
        if (error.response) {
            console.error(`  Status: ${error.response.status}`);
            console.error(`  Detalle: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`  Mensaje: ${error.message}`);
        }
    }
    
    return null;
}

/**
 * Endpoint de Verificación llamado por Roblox o el Navegador
 * Ejemplo: GET /verify-subscription?username=@usuario
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
        console.log(`\n--- NUEVA PETICIÓN DE VERIFICACIÓN: ${username} ---`);

        // 1. Obtener o validar el Channel ID del usuario
        const userChannelId = await getChannelIdFromHandle(username);
        
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
            console.log(`✅ [EXITO] ¡Suscripción confirmada para ${username}!`);
            return res.json({ 
                success: true, 
                message: '¡Suscripción confirmada!' 
            });
        } else {
            console.log(`❌ [FALLO] No se detectó suscripción pública para ${username}.`);
            return res.json({ 
                success: false, 
                message: 'No se detectó tu suscripción. Asegúrate de estar suscrito y de tener tus suscripciones en modo PÚBLICO.' 
            });
        }

    } catch (error) {
        console.error('💥 [ERROR CRÍTICO] En el proceso de verificación:');
        if (error.response) {
            console.error(`  Status: ${error.response.status}`);
            console.error(`  Data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`  Mensaje: ${error.message}`);
        }

        return res.status(500).json({ 
            success: false, 
            message: 'Error interno al consultar la API de YouTube.' 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor activo y escuchando en el puerto ${PORT}`);
});
