// index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');


// Configuración de variables de entorno
dotenv.config();

// Importar rutas
const pacienteRoutes = require('./routes/pacienteRoutes');
const userRoutes = require('./routes/userRoutes');
const archivoRoutes = require('./routes/archivoRoutes');
const solicitudRoutes = require('./routes/solicitudRoutes');
const tipoListaRoutes = require('./routes/tipoLista');
const representanteRoutes = require('./routes/representanteRoutes');
const implantacionRoutes = require('./routes/implantacionRoutes');
const tecnicaRoutes = require('./routes/tecnicaRoutes');
const complicacionesRoutes = require('./routes/ComplicacionesImplantadasRoutes');
const indicacionesRoutes = require('./routes/indicacionesRoutes');

const app = express();

// Middlewares
app.use(cors()); // Permite conexiones externas
app.use(express.json()); // Permite recibir JSON en el body

// Rutas
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/archivos', archivoRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/listas', tipoListaRoutes);
app.use('/api/representantes', representanteRoutes);
app.use('/api/implantacion', implantacionRoutes);
app.use('/api/tecnica', tecnicaRoutes);
app.use('/api/complicaciones', complicacionesRoutes);
app.use('/api/indicaciones', indicacionesRoutes);

// Ruta base de prueba
app.get('/', (req, res) => {
    res.send('API REST Salud funcionando correctamente');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});