// src/services/live/liveEmitter.js
const { EventEmitter } = require("events");

class LiveEmitter extends EventEmitter {}

module.exports = new LiveEmitter();