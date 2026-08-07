// Adaptador robusto a prueba de propiedades nulas
function adaptarTablaArgentina(tablaOriginal) {
    if (!Array.isArray(tablaOriginal)) return [];
    
    return tablaOriginal.map(item => {
        if (item.isHeader) {
            return { isHeader: true, strTeam: item.strTeam || '' };
        }
        return {
            isHeader: false,
            rank: item.intRank || item.rank || '-',
            teamName: item.strTeam || item.team?.name || 'Equipo',
            badge: item.strBadge || item.team?.logo || '',
            played: item.intPlayed ?? item.all?.played ?? 0,
            goalDiff: item.intGoalDifference ?? item.goalsDiff ?? 0,
            points: item.intPoints ?? item.points ?? 0
        };
    });
}

function adaptarTablaEuropa(tablaOriginal) {
    if (!Array.isArray(tablaOriginal)) return [];

    return tablaOriginal.map(item => ({
        isHeader: false,
        rank: item.position || item.rank || '-',
        teamName: item.team?.shortName || item.team?.name || item.strTeam || 'Equipo',
        badge: item.team?.crest || item.team?.logo || item.strBadge || '',
        played: item.playedGames ?? item.all?.played ?? item.intPlayed ?? 0,
        goalDiff: item.goalDifference ?? item.goalsDiff ?? item.intGoalDifference ?? 0,
        points: item.points ?? item.intPoints ?? 0
    }));
}

function adaptarPartidosArgentina(eventosOriginales) {
    if (!Array.isArray(eventosOriginales)) return [];

    return eventosOriginales.map(item => ({
        homeTeam: item.strHomeTeam || item.teams?.home?.name || 'Local',
        homeBadge: item.strHomeTeamBadge || item.teams?.home?.logo || '',
        homeScore: item.intHomeScore ?? item.goals?.home ?? '-',
        awayTeam: item.strAwayTeam || item.teams?.away?.name || 'Visitante',
        awayBadge: item.strAwayTeamBadge || item.teams?.away?.logo || '',
        awayScore: item.intAwayScore ?? item.goals?.away ?? '-',
        status: item.strStatus || 'SCHEDULED',
        timeOrStatus: item.strStatus === 'IN_PLAY' ? 'EN VIVO' : (item.strTime || '00:00'),
        date: item.dateEvent || ''
    }));
}

function adaptarPartidosEuropa(partidosOriginales) {
    if (!Array.isArray(partidosOriginales)) return [];

    return partidosOriginales.map(item => {
        const hora = item.utcDate ? new Date(item.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00';
        return {
            homeTeam: item.homeTeam?.shortName || item.homeTeam?.name || 'Local',
            homeBadge: item.homeTeam?.crest || '',
            homeScore: item.score?.fullTime?.home ?? '-',
            awayTeam: item.awayTeam?.shortName || item.awayTeam?.name || 'Visitante',
            awayBadge: item.awayTeam?.crest || '',
            awayScore: item.score?.fullTime?.away ?? '-',
            status: item.status || 'SCHEDULED',
            timeOrStatus: item.status === 'IN_PLAY' ? 'EN VIVO' : (item.status === 'FINISHED' ? 'Final' : hora),
            date: item.utcDate ? item.utcDate.split('T')[0] : ''
        };
    });
}