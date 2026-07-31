function renderBannerLiga({ nombre, logo, temporada, bandera }) {

    const leagueHeader = document.getElementById("league-header");

    const logoHTML = logo
        ? `<img src="${logo}" alt="${nombre}" class="league-logo">`
        : `<span class="league-logo-fallback">${bandera || "🏆"}</span>`;

    leagueHeader.innerHTML = `
        <div class="league-banner">

            <div class="league-header-top">

                ${logoHTML}

                <h2 class="league-title">${nombre}</h2>

            </div>

            <div class="season-picker">

                <span>Temporada: ${temporada}</span>

            </div>

        </div>
    `;

}