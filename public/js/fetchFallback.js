// Fallback: si la ruta de la liga falla, usamos /api/partidos/hoy
async function fetchWithFallback(url, fallbackUrl) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response not ok');
    return await res.json();
  } catch (e) {
    console.warn('Primary fetch failed, using fallback:', url, e.message);
    try {
      const res2 = await fetch(fallbackUrl);
      if (!res2.ok) throw new Error('Fallback response not ok');
      return await res2.json();
    } catch (e2) {
      console.error('Fallback also failed:', e2.message);
      return { events: [] };
    }
  }
}

export async function cargarPartidosParaLiga(codigoLiga, endpoints) {
  // endpoints.partidos viene de obtenerEndpointsLiga; fallback al endpoint global hoy
  const fallback = '/api/partidos/hoy';
  const data = await fetchWithFallback(endpoints.partidos, fallback);
  return data;
}
