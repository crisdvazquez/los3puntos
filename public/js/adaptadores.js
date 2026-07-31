function adaptarTablaArgentina(tablaOriginal) {
    if (!Array.isArray(tablaOriginal)) return [];
    
    return tablaOriginal.map(item => {
        if (item.isHeader) {
            return { isHeader: true, strTeam: item.strTeam };
        }
        return {
            isHeader: false,
            rank: item.intRank || '-',
            teamName: item.strTeam || 'Equipo',
            badge: item.strBadge || '',
            played: item.intPlayed ?? 0,
            goalDiff: item.intGoalDifference ?? 0,
            points: item.intPoints ?? 0
        };
    });
}

function adaptarTablaEuropa(tablaOriginal) {
    if (!Array.isArray(tablaOriginal)) return [];

    return tablaOriginal.map(item => ({
        isHeader: false,
        rank: item.position || '-',
        teamName: item.team?.shortName || item.team?.name || 'Equipo',
        badge: item.team?.crest || '',
        played: item.playedGames ?? 0,
        goalDiff: item.goalDifference ?? 0,
        points: item.points ?? 0
    }));
}

function adaptarPartidosArgentina(eventosOriginales) {
    if (!Array.isArray(eventosOriginales)) return [];

    return eventosOriginales.map(item => ({
        homeTeam: item.strHomeTeam || 'Local',
        homeBadge: item.strHomeTeamBadge || '',
        homeScore: item.intHomeScore ?? '-',
        awayTeam: item.strAwayTeam || 'Visitante',
        awayBadge: item.strAwayTeamBadge || '',
        awayScore: item.intAwayScore ?? '-',
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