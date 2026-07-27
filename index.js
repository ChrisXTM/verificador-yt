const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de tu repositorio
const GITHUB_OWNER = "ChrisXTM";
const GITHUB_REPO = "Privacy";
const FILE_PATH = "LoadHeroesBG.lua"; // Ruta de tu script dentro del repo
const BRANCH = "main";

app.get("/get-script", async (req, res) => {
    const token = process.env.GITHUB_TOKEN; // Se lee desde las variables de Render

    if (!token) {
        return res.status(500).send("-- Error: GITHUB_TOKEN no configurado en Render.");
    }

    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${BRANCH}/${FILE_PATH}`;

    try {
        const response = await fetch(rawUrl, {
            headers: {
                "Authorization": `token ${token}`,
                "Accept": "application/vnd.github.v3.raw"
            }
        });

        if (!response.ok) {
            return res.status(response.status).send(`-- Error al obtener script de GitHub (${response.status})`);
        }

        const luaScript = await response.text();

        // Responder como texto plano para Roblox
        res.setHeader("Content-Type", "text/plain");
        return res.send(luaScript);

    } catch (error) {
        console.error(error);
        return res.status(500).send("-- Error interno del servidor.");
    }
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
});
