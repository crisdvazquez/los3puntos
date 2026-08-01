const express = require("express");
const path = require("path");
const { obtenerPosicionesEuropa, obtenerPartidosEuropa } = require("./services/footballData");
const { obtenerPosiciones: obtenerPosicionesArg, obtenerPartidos: obtenerPartidosArg } = require("./services/argentina");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Endpoint para los partidos de HOY (Home)
app.get("/api/partidos/hoy", async (req, res) => {
    try {
        const hoyStr = new Date().toISOString().split("T")[0];
        
        const ligasMonitoreadas = [
            { codigo: 'ARG', nombre: 'Liga Profesional', fn: () => obtenerPartidosArg() },
            { codigo: 'PL', nombre: 'Premier League', fn: () => obtenerPartidosEuropa('PL') },
            { codigo: 'PD', nombre: 'LaLiga', fn: () => obtenerPartidosEuropa('PD') },
            { codigo: 'SA', nombre: 'Serie A', fn: () => obtenerPartidosEuropa('SA') },
            { codigo: 'BL1', nombre: 'Bundesliga', fn: () => obtenerPartidosEuropa('BL1') },
            { codigo: 'FL1', nombre: 'Ligue 1', fn: () => obtenerPartidosEuropa('FL1') },
            { codigo: 'CL', nombre: 'Champions League', fn: () => obtenerPartidosEuropa('CL') }
        ];

        let partidosHoy = [];

        for (const liga of ligasMonitoreadas) {
            try {
                const data = await liga.fn();
                if (data && data.events) {
                    const filtrados = data.events.filter(e => e.dateEvent === hoyStr);
                    filtrados.forEach(p => p.strLeagueName = liga.nombre);
                    partidosHoy.push(...filtrados);
                }
            } catch (err) {
                // Continúa si falla una liga en particular
            }
        }

        res.json({ events: partidosHoy });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener partidos de hoy" });
    }
});

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

// Endpoint unificado para Partidos
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