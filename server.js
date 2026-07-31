require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use("/api", apiRoutes);

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
});