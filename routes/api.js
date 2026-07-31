const express = require("express");
const router = express.Router();

const footballData = require("../services/footballData");

// Importamos el servicio de Argentina
let argentinaService;
try {
    argentinaService = require("../services/argentina");
} catch (e) {
    console.warn("⚠️ No se encontró services/argentina.js");
}

// ==========================================
// RUTAS FOOTBALL-DATA (Premier, Champions, Ligue 1, etc.)
// ==========================================

router.get("/partidos", async (req, res) => {
    try {
        const liga = req.query.liga || "PL";
        const season = req.query.season;

        const data = await footballData.obtenerPartidos(liga, season);
        res.json(data);
    } catch (error) {
        console.error("Error en /partidos:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.get("/posiciones", async (req, res) => {
    try {
        const liga = req.query.liga || "PL";
        const season = req.query.season;

        const data = await footballData.obtenerPosiciones(liga, season);
        res.json(data);
    } catch (error) {
        console.error("Error en /posiciones:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.get("/equipos", async (req, res) => {
    try {
        const liga = req.query.liga || "PL";

        const data = await footballData.obtenerEquipos(liga);
        res.json(data);
    } catch (error) {
        console.error("Error en /equipos:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// RUTAS LIGA ARGENTINA (/api/arg/...)
// ==========================================

router.get("/arg/partidos", async (req, res) => {
    try {
        const season = req.query.season || "2026";
        
        if (!argentinaService || typeof argentinaService.obtenerPartidos !== "function") {
            return res.status(501).json({ error: "Servicio de Argentina no implementado" });
        }

        const data = await argentinaService.obtenerPartidos(season);
        
        res.json({
            leagueName: "Liga Profesional Argentina",
            ...data
        });
    } catch (error) {
        console.error("Error en /arg/partidos:", error.message);
        res.status(500).json({ error: error.message });
    }
});

router.get("/arg/posiciones", async (req, res) => {
    try {
        const season = req.query.season || "2026";

        if (!argentinaService || typeof argentinaService.obtenerPosiciones !== "function") {
            return res.status(501).json({ error: "Servicio de Argentina no implementado" });
        }

        const data = await argentinaService.obtenerPosiciones(season);
        
        res.json({
            leagueName: "Liga Profesional Argentina",
            ...data
        });
    } catch (error) {
        console.error("Error en /arg/posiciones:", error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;