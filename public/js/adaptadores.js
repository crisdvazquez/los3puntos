function adaptarPartidoFootballData(match) {

    return {
        matchday: match.matchday || 1,
        utcDate: match.utcDate,

        homeTeam: {
            name: match.homeTeam.name,
            shortName: match.homeTeam.shortName || match.homeTeam.name,
            crest: match.homeTeam.crest
        },

        awayTeam: {
            name: match.awayTeam.name,
            shortName: match.awayTeam.shortName || match.awayTeam.name,
            crest: match.awayTeam.crest
        },

        status: match.status,

        score: {
            fullTime: {
                home: match.score?.fullTime?.home,
                away: match.score?.fullTime?.away
            }
        }
    };

}

function adaptarPartidoArgentina(evento) {

    return {

        matchday: evento.intRound || 1,

        utcDate: `${evento.dateEvent}T${evento.strTime || "00:00:00"}`,

        homeTeam: {
            name: evento.strHomeTeam,
            shortName: evento.strHomeTeam,
            crest: evento.strHomeTeamBadge || ""
        },

        awayTeam: {
            name: evento.strAwayTeam,
            shortName: evento.strAwayTeam,
            crest: evento.strAwayTeamBadge || ""
        },

        status: evento.strStatus || "SCHEDULED",

        score: {
            fullTime: {
                home: evento.intHomeScore,
                away: evento.intAwayScore
            }
        }

    };

}

function adaptarTablaFootballData(tabla) {

    return tabla.map(row => ({

        position: row.position,

        team: {
            name: row.team.name,
            shortName: row.team.shortName || row.team.name,
            crest: row.team.crest
        },

        playedGames: row.playedGames,

        goalDifference: row.goalDifference,

        points: row.points

    }));

}

function adaptarTablaArgentina(tabla) {

    return tabla.map(row => ({

        position: Number(row.intRank),

        team: {
            name: row.strTeam,
            shortName: row.strTeam,
            crest: row.strBadge || ""
        },

        playedGames: Number(row.intPlayed),

        goalDifference: Number(row.intGoalDifference),

        points: Number(row.intPoints)

    }));

}