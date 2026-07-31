function adaptarPartidoFootballData(match) {
    return {
        matchday: match.matchday || 1,
        utcDate: match.utcDate,

        homeTeam: {
            name: match.homeTeam?.name || "Local",
            shortName: match.homeTeam?.shortName || match.homeTeam?.name || "Local",
            crest: match.homeTeam?.crest || ""
        },

        awayTeam: {
            name: match.awayTeam?.name || "Visitante",
            shortName: match.awayTeam?.shortName || match.awayTeam?.name || "Visitante",
            crest: match.awayTeam?.crest || ""
        },

        status: match.status,

        score: {
            fullTime: {
                home: match.score?.fullTime?.home ?? "-",
                away: match.score?.fullTime?.away ?? "-"
            }
        }
    };
}

function adaptarPartidoArgentina(evento) {
    return {
        matchday: Number(evento.intRound) || 1,
        utcDate: `${evento.dateEvent}T${evento.strTime || "00:00:00"}`,

        homeTeam: {
            name: evento.strHomeTeam || "Local",
            shortName: evento.strHomeTeam || "Local",
            crest: evento.strHomeTeamBadge || ""
        },

        awayTeam: {
            name: evento.strAwayTeam || "Visitante",
            shortName: evento.strAwayTeam || "Visitante",
            crest: evento.strAwayTeamBadge || ""
        },

        status: evento.strStatus || "SCHEDULED",

        score: {
            fullTime: {
                home: evento.intHomeScore ?? "-",
                away: evento.intAwayScore ?? "-"
            }
        }
    };
}

function adaptarTablaFootballData(tabla) {
    return tabla.map(row => ({
        position: row.position,
        team: {
            name: row.team?.name || "Equipo",
            shortName: row.team?.shortName || row.team?.name || "Equipo",
            crest: row.team?.crest || ""
        },
        playedGames: row.playedGames || 0,
        goalDifference: row.goalDifference || 0,
        points: row.points || 0
    }));
}

function adaptarTablaArgentina(tabla) {
    return tabla.map(row => ({
        position: Number(row.intRank) || 1,
        team: {
            name: row.strTeam || "Equipo",
            shortName: row.strTeam || "Equipo",
            crest: row.strBadge || ""
        },
        playedGames: Number(row.intPlayed) || 0,
        goalDifference: Number(row.intGoalDifference) || 0,
        points: Number(row.intPoints) || 0
    }));
}