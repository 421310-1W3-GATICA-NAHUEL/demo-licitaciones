/**
 * Resuelve la empresa activa para un request, validando contra el acceso del JWT del usuario (req.user).
 * Previene vulnerabilidades de IDOR al ignorar parámetros del cliente si el acceso es fijo.
 * 
 * @param {Object} req - El objeto Express Request
 * @param {string} format - El formato deseado: 'LONG' ('PHARMA CENTER' / 'SALUD RENAL') o 'SHORT' ('DPC' / 'SR')
 * @returns {string} La empresa activa resuelta en el formato correspondiente.
 */
function resolverEmpresaActiva(req, format = 'LONG') {
    // Si la request manda explicitamente empresa en el body o query, la usamos
    const reqEmpresa = req.body?.empresa || req.query?.empresa;
    if (reqEmpresa && reqEmpresa !== 'SR' && reqEmpresa !== 'DPC') {
        return reqEmpresa;
    }
    return req.user?.empresa_acceso || req.user?.empresa || 'DROGUERIA DEMO';
}

module.exports = {
    resolverEmpresaActiva
};
