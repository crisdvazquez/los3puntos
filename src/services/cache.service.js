// src/services/cache.service.js
const NodeCache = require("node-cache");

const cache = new NodeCache();

const TTL = {
    STANDINGS: 14400,      // 4h - tablas de posiciones
    FIXTURES: 14400,       // 4h - fixture completo de la temporada
    EVENTS: 300,           // 5min - goleadores/eventos de un partido
    LIVE: 30                // 30s - partidos en vivo
};

function get(key) {
    return cache.get(key);
}

function set(key, value, ttlSeconds) {
    return cache.set(key, value, ttlSeconds);
}

function has(key) {
    return cache.has(key);
}

function del(key) {
    return cache.del(key);
}

module.exports = { get, set, has, del, TTL };