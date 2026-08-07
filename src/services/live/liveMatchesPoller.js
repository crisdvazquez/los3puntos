// src/services/live/liveMatchesPoller.js
const { obtenerPartidosEnVivo } = require("./liveMatches.service");
const liveEmitter = require("./liveEmitter");

const POLL_INTERVAL_LIVE = 20_000;   // 20s cuando hay partidos en vivo
const POLL_INTERVAL_IDLE = 60_000; // 5min cuando no hay nada en vivo

let timer = null;
let currentIntervalMs = null;

async function pollCycle() {
    const partidos = await obtenerPartidosEnVivo(true); // bypassCache: siempre trae fresco en el poll
    liveEmitter.emit("update", partidos);

    const hasLive = partidos.length > 0;
    const nextInterval = hasLive ? POLL_INTERVAL_LIVE : POLL_INTERVAL_IDLE;

    if (nextInterval !== currentIntervalMs) {
        clearInterval(timer);
        currentIntervalMs = nextInterval;
        timer = setInterval(pollCycle, currentIntervalMs);
    }
}

function start() {
    if (timer) return; // ya está corriendo
    currentIntervalMs = POLL_INTERVAL_IDLE;
    pollCycle(); // primer ciclo inmediato
    timer = setInterval(pollCycle, currentIntervalMs);
}

function stop() {
    clearInterval(timer);
    timer = null;
    currentIntervalMs = null;
}

module.exports = { start, stop };