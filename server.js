const express = require("express");
const path = require("path");
const { obtenerPosicionesEuropa, obtenerPartidosEuropa } = require("./services/footballData");
const { obtenerPosiciones: obtenerPosicionesArg, obtenerPartidos: obtenerPartidosArg } = require("./services/argentina");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Endpoint unificado para Posiciones
app.get("/api/posiciones/:liga", async (req, res) => {
    const liga = req.params.liga.toUpperCase();
    try {
        if (liga === "ARG") {
            const data = await obtenerPosicionesArg();
            res.json(data);
        } else {
            const data = await obtenerPosicionesEuropa(liga);
            res.json(data);
        }
    } catch (error) {
        res.status(500).json({ error: "Error al obtener posiciones" });
    }
});

// Endpoint unificado para Partidos (Fixture con soporte de fechas/jornadas)
app.get("/api/partidos/:liga", async (req, res) => {
    const liga = req.params.liga.toUpperCase();
    const round = req.query.round || null;

    try {
        if (liga === "ARG") {
            const data = await obtenerPartidosArg({ round });
            res.json(data);
        } else {
            const data = await obtenerPartidosEuropa(liga, round);
            res.json(data);
        }
    } catch (error) {
        res.status(500).json({ error: "Error al obtener partidos" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});