const HOME_CACHE_PREFIX = 'los3puntos_partidos_hoy_';
const HOME_CACHE_TTL_MS = 60 * 60 * 1000;

function obtenerFechaClave(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires'
    }).format(date);
}

export function obtenerCacheKeyPartidosHoy(dateKey = obtenerFechaClave()) {
    return `${HOME_CACHE_PREFIX}${dateKey}`;
}

export function obtenerTTLCachePartidosHoy() {
    return HOME_CACHE_TTL_MS;
}

export function generarHashEventos(events = []) {
    const base = JSON.stringify(
        (Array.isArray(events) ? events : []).map(evento => ({
            fixtureId: evento.fixtureId ?? null,
            status: evento.strStatus ?? null,
            statusShort: evento.statusShort ?? null,
            statusLong: evento.statusLong ?? null,
            homeScore: evento.intHomeScore ?? null,
            awayScore: evento.intAwayScore ?? null,
            elapsed: evento.intElapsed ?? null,
            extra: evento.intExtra ?? null,
            dateEvent: evento.dateEvent ?? null,
            fixtureUTC: evento.fixtureUTC ?? null,
            league: evento.strLeagueName ?? null
        }))
    );

    let hash = 0;
    for (let i = 0; i < base.length; i += 1) {
        hash = ((hash << 5) - hash) + base.charCodeAt(i);
        hash |= 0;
    }
    return String(hash);
}

export function leerCachePartidosHoy(dateKey = obtenerFechaClave()) {
    try {
        const raw = localStorage.getItem(obtenerCacheKeyPartidosHoy(dateKey));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.events) || typeof parsed.timestamp !== 'number') return null;

        const ttl = typeof parsed.ttl === 'number' ? parsed.ttl : HOME_CACHE_TTL_MS;
        const isExpired = (Date.now() - parsed.timestamp) > ttl;

        return {
            ...parsed,
            ttl,
            isExpired
        };
    } catch (error) {
        return null;
    }
}

export function guardarCachePartidosHoy(events, dateKey = obtenerFechaClave()) {
    try {
        const payload = {
            timestamp: Date.now(),
            ttl: HOME_CACHE_TTL_MS,
            events: Array.isArray(events) ? events : [],
            hash: generarHashEventos(events)
        };
        localStorage.setItem(obtenerCacheKeyPartidosHoy(dateKey), JSON.stringify(payload));
        return payload;
    } catch (error) {
        return null;
    }
}

export function limpiarCachesVencidosPartidosHoy() {
    try {
        const now = Date.now();
        Object.keys(localStorage).forEach(key => {
            if (!key.startsWith(HOME_CACHE_PREFIX)) return;
            try {
                const parsed = JSON.parse(localStorage.getItem(key));
                const ttl = typeof parsed?.ttl === 'number' ? parsed.ttl : HOME_CACHE_TTL_MS;
                if (!parsed || typeof parsed.timestamp !== 'number' || (now - parsed.timestamp) > ttl) {
                    localStorage.removeItem(key);
                }
            } catch (error) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        // ignore
    }
}

export function formatearEdadCache(timestamp) {
    if (!timestamp) return '';
    const minutos = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
    if (minutos < 1) return 'recién';
    if (minutos === 1) return 'hace 1 min';
    return `hace ${minutos} min`;
}

export function observarCachePartidosHoy(dateKey, callback) {
    if (typeof callback !== 'function') return () => {};

    const handler = (event) => {
        if (event.key !== obtenerCacheKeyPartidosHoy(dateKey)) return;
        callback(leerCachePartidosHoy(dateKey));
    };

    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
}
