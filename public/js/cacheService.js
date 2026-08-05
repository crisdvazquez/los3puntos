const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_KEY_PREFIX = 'partidos_hoy_';
const CACHE_TIME_PREFIX = 'partidos_hoy_time_';

/**
 * Returns the cache key for a given date offset.
 * @param {number} offsetDias
 * @returns {string}
 */
function cacheKey(offsetDias) {
    return `${CACHE_KEY_PREFIX}${offsetDias}`;
}

/**
 * Returns the cache timestamp key for a given date offset.
 * @param {number} offsetDias
 * @returns {string}
 */
function cacheTimeKey(offsetDias) {
    return `${CACHE_TIME_PREFIX}${offsetDias}`;
}

/**
 * Retrieves cached match events for the given day offset, or null if expired/absent.
 * @param {number} offsetDias
 * @returns {Array|null}
 */
export function obtenerDesdeCache(offsetDias) {
    try {
        const stored = localStorage.getItem(cacheKey(offsetDias));
        const storedTime = localStorage.getItem(cacheTimeKey(offsetDias));
        if (!stored || !storedTime) return null;
        if (Date.now() - Number(storedTime) > CACHE_TTL_MS) return null;
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

/**
 * Saves match events to localStorage for the given day offset.
 * @param {number} offsetDias
 * @param {Array} eventos
 */
export function guardarEnCache(offsetDias, eventos) {
    try {
        localStorage.setItem(cacheKey(offsetDias), JSON.stringify(eventos));
        localStorage.setItem(cacheTimeKey(offsetDias), String(Date.now()));
    } catch {
        // localStorage may be unavailable (private mode, quota exceeded)
    }
}

/**
 * Returns true if the cache for the given day offset is still valid (< TTL).
 * @param {number} offsetDias
 * @returns {boolean}
 */
export function cacheEsValido(offsetDias) {
    try {
        const storedTime = localStorage.getItem(cacheTimeKey(offsetDias));
        if (!storedTime) return false;
        return Date.now() - Number(storedTime) <= CACHE_TTL_MS;
    } catch {
        return false;
    }
}

/**
 * Invalidates the cache for the given day offset.
 * @param {number} offsetDias
 */
export function invalidarCache(offsetDias) {
    try {
        localStorage.removeItem(cacheKey(offsetDias));
        localStorage.removeItem(cacheTimeKey(offsetDias));
    } catch {
        // ignore
    }
}
