const fs = require('fs');
const path = require('path');

console.log('=== ARCHITECTURE VALIDATION TESTS ===\n');

let passed = 0, failed = 0;

function test(name, condition) {
    if (condition) {
        console.log(`✓ ${name}`);
        passed++;
    } else {
        console.log(`✗ ${name}`);
        failed++;
    }
}

// Test 1: Verify footballData.js has LIGAS_MAP
const footballDataPath = path.join(__dirname, 'services', 'footballData.js');
const footballDataContent = fs.readFileSync(footballDataPath, 'utf8');
test('footballData.js exports obtenerPartidosEuropa', footballDataContent.includes('obtenerPartidosEuropa'));
test('footballData.js exports obtenerPosicionesEuropa', footballDataContent.includes('obtenerPosicionesEuropa'));
test('footballData.js has LIGAS_MAP', footballDataContent.includes('const LIGAS_MAP'));
test('footballData.js LIGAS_MAP has PL', footballDataContent.includes("'PL'"));
test('footballData.js LIGAS_MAP has LIB', footballDataContent.includes("'LIB'"));

// Test 2: Verify argentina.js
const argentinaPath = path.join(__dirname, 'services', 'argentina.js');
const argentinaContent = fs.readFileSync(argentinaPath, 'utf8');
test('argentina.js has LEAGUE_ID = 128', argentinaContent.includes('const LEAGUE_ID = 128'));
test('argentina.js exports obtenerPartidos', argentinaContent.includes('obtenerPartidos'));
test('argentina.js exports obtenerPosiciones', argentinaContent.includes('obtenerPosiciones'));
test('argentina.js has timezone support', argentinaContent.includes('America/Argentina/Buenos_Aires'));

// Test 3: Verify ligas.js
const ligasPath = path.join(__dirname, 'public', 'js', 'ligas.js');
const ligasContent = fs.readFileSync(ligasPath, 'utf8');
test('ligas.js exports CONFIG_LIGAS', ligasContent.includes('export const CONFIG_LIGAS'));
test('ligas.js exports obtenerEndpointsLiga', ligasContent.includes('export function obtenerEndpointsLiga'));
test('CONFIG_LIGAS has ARG', ligasContent.includes("'ARG'"));
test('CONFIG_LIGAS has PL', ligasContent.includes("'PL'"));

// Test 4: Verify api.js routing
const apiPath = path.join(__dirname, 'routes', 'api.js');
const apiContent = fs.readFileSync(apiPath, 'utf8');
test('api.js has NOMBRES_LIGAS', apiContent.includes('const NOMBRES_LIGAS'));
test('api.js has /posiciones/:liga endpoint', apiContent.includes("router.get('/posiciones/:liga'"));
test('api.js has /partidos/:liga endpoint', apiContent.includes("router.get('/partidos/:liga'"));
test('api.js has /partidos/hoy endpoint', apiContent.includes("router.get('/partidos/hoy'"));
test('api.js routes ARG to argentina service', apiContent.includes('liga === \'ARG\''));

// Test 5: Verify server.js
const serverPath = path.join(__dirname, 'server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');
test('server.js requires argentina service', serverContent.includes("require('./services/argentina')"));
test('server.js requires footballData service', serverContent.includes("require('./services/footballData')"));
test('server.js has ligasPrioritarias', serverContent.includes('ligasPrioritarias'));
test('server.js includes ARG in warm-up', serverContent.includes("'ARG'"));

// Test 6: Verify app.js
const appPath = path.join(__dirname, 'public', 'js', 'app.js');
const appContent = fs.readFileSync(appPath, 'utf8');
test('app.js imports CONFIG_LIGAS', appContent.includes('CONFIG_LIGAS'));
test('app.js has cargarSeccion function', appContent.includes('async function cargarSeccion'));
test('app.js handles ARG league', appContent.includes("'ARG'"));

// Test 7: Count current leagues
const ligasMapMatch = footballDataContent.match(/const LIGAS_MAP = \{[\s\S]*?\};/);
const liigasCount = (ligasMapMatch?.[0]?.match(/'\w+'/g) || []).length;
test(`footballData.js LIGAS_MAP has entries (found ${liigasCount})`, liigasCount >= 8);

const argCount = (argentinaContent.match(/const LEAGUE_ID/g) || []).length;
test('argentina.js has single LEAGUE_ID', argCount === 1);

const configCount = (ligasContent.match(/'\w+'\s*:\s*\{/g) || []).length;
test(`CONFIG_LIGAS has entries (found ${configCount})`, configCount >= 8);

const nombresCount = (apiContent.match(/\w+:\s*['"][^'"]+['"]/g) || []).length;
test(`NOMBRES_LIGAS has entries (found ${nombresCount})`, nombresCount >= 13);

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);
console.log(`Result: ${failed === 0 ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);

process.exit(failed === 0 ? 0 : 1);
