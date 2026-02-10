const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('../config/cryptoUtils');

const uploadArchivo = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo' });

        const { persona_id } = req.body;
        const nombre_archivo = req.file.originalname;
        const ruta_real = req.file.path;

        // Encriptamos la ruta antes de guardar
        const ruta_encriptada = encrypt(ruta_real);

        const [result] = await db.query(
            'INSERT INTO archivos (nombre_archivo, persona_id, ruta_archivo) VALUES (?, ?, ?)',
            [nombre_archivo, persona_id, ruta_encriptada]
        );

        res.status(201).json({ message: 'Archivo guardado correctamente', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Dentro de controllers/archivoController.js (actualizando el método getArchivoBase64)
const getArchivoBase64 = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM archivos WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Archivo no encontrado' });

        const archivo = rows[0];
        const ruta_desencriptada = decrypt(archivo.ruta_archivo);

        if (fs.existsSync(ruta_desencriptada)) {
            const bitmap = fs.readFileSync(ruta_desencriptada);
            const base64 = Buffer.from(bitmap).toString('base64');

            // Obtener la extensión y definir el MIME type básico
            const ext = path.extname(ruta_desencriptada).toLowerCase().replace('.', '');
            let mimeType = '';

            switch (ext) {
                case 'pdf': mimeType = 'application/pdf'; break;
                case 'png': mimeType = 'image/png'; break;
                case 'jpg': case 'jpeg': mimeType = 'image/jpeg'; break;
                case 'doc': case 'docx': mimeType = 'application/msword'; break;
                default: mimeType = 'application/octet-stream';
            }

            res.json({
                nombre: archivo.nombre_archivo,
                extension: ext,
                mime: mimeType,
                base64: `data:${mimeType};base64,${base64}`
            });
        } else {
            res.status(404).json({ message: 'Archivo físico no encontrado en servidor' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { uploadArchivo, getArchivoBase64 };