const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
);

const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
    level: 'info',
    format: fileFormat,
    transports: [
        // Guardar logs de nivel 'error' en error.log
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/error.log'), 
            level: 'error',
            format: fileFormat
        }),
        // Guardar todos los logs (combined.log)
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/combined.log'),
            format: fileFormat
        }),
        // Consola
        new winston.transports.Console({
            level: isProduction ? 'warn' : 'info',
            format: logFormat
        })
    ]
});

module.exports = logger;
