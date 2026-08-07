const fs = require('fs');
const path = require('path');

console.log('=== CACHE AND EXTRA MINUTES TESTS ===\n');

let passed = 0;
let failed = 0;

function test(name, condition) {
    if (condition) {
        console.log(`✓ ${name}`);
        passed += 1;
    } else {
        console.log(`✗ ${name}`);
        failed += 1;
    }
}

const footballData = fs.readFileSync(path.join(__dirname, 'services', 'footballData.js'), 'utf8');
const argentina = fs.readFileSync(path.join(__dirname, 'services', 'argentina.js'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, 'routes', 'api.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'public', 'js', 'app.js'), 'utf8');
const ui = fs.readFileSync(path.join(__dirname, 'public', 'js', 'ui.js'), 'utf8');
const cacheService = fs.readFileSync(path.join(__dirname, 'public', 'js', 'cacheService.js'), 'utf8');

test('footballData formatea minutos extra', footballData.includes("if (extra) return `${elapsed}+${extra}'`;"));
test('argentina formatea minutos extra', argentina.includes("if (extra) return `${elapsed}+${extra}'`;"));
test('footballData expone intExtra', footballData.includes('intExtra: extra'));
test('argentina expone intExtra', argentina.includes('intExtra: extra'));
test('services include fixtureId', footballData.includes('fixtureId: item.fixture?.id ?? null') && argentina.includes('fixtureId: item.fixture?.id ?? null'));
test('api expone endpoint live-scores', api.includes("router.get('/partidos/hoy/live-scores'"));
test('api live-scores devuelve extra', api.includes('extra: evento.intExtra ?? null'));
test('app usa cacheService', app.includes("from './cacheService.js'"));
test('app refresca home con live-scores liviano', app.includes("fetch('/api/partidos/hoy/live-scores')"));
test('app programa refresh horario home', app.includes('const HOME_REFRESH_INTERVAL_MS = 60 * 60 * 1000'));
test('ui renderiza data-fixture-id', ui.includes('data-fixture-id="${escaparHtml(m.fixtureId ?? \'\')}"'));
test('ui tiene helper de minutos extra', ui.includes("if (extra) return `${minuto}+${extra}'`;"));
test('cacheService define TTL 1 hora', cacheService.includes('const HOME_CACHE_TTL_MS = 60 * 60 * 1000'));
test('cacheService guarda hash de eventos', cacheService.includes('hash: generarHashEventos(events)'));

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

process.exit(failed === 0 ? 0 : 1);
