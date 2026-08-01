const express = require('express');
const app = express();
const apiRoutes = require('./routes/api');

// Servir archivos estáticos de la carpeta "public"
app.use(express.static('public'));
app.use(express.json());

// Usar las rutas definidas en api.js
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de los3puntos corriendo en http://localhost:${PORT}`);
});