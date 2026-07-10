/**
 * Determina si la empresa activa ganó el renglón basándose en el nombre del oferente ganador.
 * Colapsa espacios múltiples y normaliza a mayúsculas para evitar inconsistencias de tipeo.
 * 
 * @param {string} primerOferente - El oferente registrado como ganador en el renglón.
 * @param {string} empresaActiva - La empresa activa consultada ('SR' o 'DPC').
 * @returns {boolean} True si somos los ganadores del renglón.
 */
function esNuestroGanador(primerOferente, empresaActiva) {
    if (!primerOferente) return false;
    
    // Normalizar: mayúsculas, colapsar múltiples espacios internos a uno solo, quitar espacios en extremos
    const normalizado = primerOferente.toUpperCase().trim().replace(/\s+/g, ' ');
    
    const VARIANTES_SR = ['SALUD RENAL'];
    const VARIANTES_DPC = ['DROG. PHARMA CENTER'];
    const VARIANTES_DEMO = ['NUESTRA EMPRESA', 'DROGUERIA LOCAL', 'MI EMPRESA'];
    
    if (empresaActiva === 'SR') return VARIANTES_SR.includes(normalizado);
    if (empresaActiva === 'DPC') return VARIANTES_DPC.includes(normalizado);
    if (empresaActiva === 'NUESTRA EMPRESA' || empresaActiva === 'TODAS') return VARIANTES_DEMO.includes(normalizado);
    return VARIANTES_DEMO.includes(normalizado);
}

module.exports = { esNuestroGanador };
