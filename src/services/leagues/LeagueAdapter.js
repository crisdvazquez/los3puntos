/**
 * Clase base para adaptadores de liga.
 * Cada liga (europea estándar, Argentina, etc.) debe extender esta clase
 * e implementar sus propios métodos según las reglas de negocio particulares.
 */
class LeagueAdapter {
  async getStandings() {
    throw new Error('getStandings() no implementado en el adapter');
  }

  async getFixtures(dateRange) {
    throw new Error('getFixtures() no implementado en el adapter');
  }

  async getLiveMatches() {
    throw new Error('getLiveMatches() no implementado en el adapter');
  }

  normalizeMatch(rawMatch) {
    throw new Error('normalizeMatch() no implementado en el adapter');
  }
}

module.exports = LeagueAdapter;