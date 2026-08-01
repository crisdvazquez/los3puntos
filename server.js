// Endpoint para los partidos de HOY (Home)
app.get("/api/partidos/hoy", async (req, res) => {
    try {
        const { obtenerPartidosEuropa } = require("./services/footballData");
        const { obtenerPartidos: obtenerPartidosArg } = require("./services/argentina");
        
        // Obtenemos la fecha actual en formato YYYY-MM-DD
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
                // Si falla una liga particular, continúa con las demás
            }
        }

        res.json({ events: partidosHoy });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener partidos de hoy" });
    }
});