const nodemailer = require('nodemailer');
require('dotenv').config(); // Importante para leer el .env

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587, // Cambiamos a 587
    secure: false, // false para 587 (usa STARTTLS)
    auth: {
        user: process.env.EMAIL_USER, // Lee del .env
        pass: process.env.EMAIL_PASS  // Lee del .env (asegurate que en el .env NO tenga espacios)
    },
    tls: {
        rejectUnauthorized: false // Ayuda si estás en una red corporativa con firewall
    }
});

// Verificar la conexión al iniciar (Deshabilitado para desarrollo local)
// transporter.verify()
//     .then(() => {
//         console.log("✅ Servidor de correos listo (Conexión exitosa)");
//     })
//     .catch((err) => {
//         console.error("❌ Error en configuración de mail:", err.message);
//     });

module.exports = transporter;