const xlsx = require('xlsx');
const { poolPromise } = require('../config/db');
const { resolverEmpresaActiva } = require('../utils/empresaAccess');
const { esNuestroGanador } = require('../utils/ganamosHelper');
const logger = require('../utils/logger');


// ==========================================
// TOP-LEVEL HELPERS
// ==========================================

const normalizarFechaAString = (val) => {
    if (!val || val === 'S/D') return null;

    if (typeof val === 'string') {
        const s = val.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            return s;
        }
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
            const [d, m, y] = s.split('/');
            const month = m.padStart(2, '0');
            const day = d.padStart(2, '0');
            return `${y}-${month}-${day}`;
        }
    }

    let fechaObj;
    if (val instanceof Date) {
        fechaObj = val;
    } else if (typeof val === 'number') {
        fechaObj = new Date((val - (25567 + 1)) * 86400 * 1000);
    } else {
        fechaObj = new Date(val);
    }

    if (isNaN(fechaObj.getTime())) return null;

    const fechaArg = fechaObj.toLocaleDateString('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires'
    });

    return fechaArg;
};

const detectarProvincia = (hospital) => {
    if (!hospital) return 'Córdoba';
    const h = hospital.toUpperCase();

    if (h.includes('MENDOZA')) return 'Mendoza';
    if (h.includes('TUCUMAN') || h.includes('TUCUMÁN')) return 'Tucumán';
    if (h.includes('CATAMARCA')) return 'Catamarca';
    if (h.includes('PAMPA')) return 'La Pampa';
    if (h.includes('SANTA FE')) return 'Santa Fe';
    if (h.includes('BUENOS AIRES')) return 'Buenos Aires';
    if (h.includes('SALTA')) return 'Salta';
    if (h.includes('CORDOBA') || h.includes('CÓRDOBA')) return 'Córdoba';
    
    return 'Córdoba';
};

const normalizarNombreHospital = (nombre) => {
    if (!nombre) return '';
    return nombre.toString()
        .toUpperCase()
        .replace(/\./g, '')       // Quitar puntos (ej. "DR." -> "DR")
        .replace(/,/g, '')        // Quitar comas
        .replace(/-/g, ' ')       // Reemplazar guiones por espacios
        .replace(/\s+/g, ' ')     // Colapsar espacios múltiples
        .trim();
};

const limpiarPrecio = (v) => {
    if (v === null || v === undefined || v === '') {
        return 0;
    }
    const original = String(v).trim();
    if (original.includes('*')) {
        return 0;
    }
    if (typeof v === 'number') {
        return Number(v);
    }
    let texto = original;
    texto = texto.replace(/\$/g, '');
    texto = texto.replace(/\s/g, '');

    if (texto.includes(',')) {
        texto = texto
            .replace(/\./g, '') // miles
            .replace(',', '.'); // decimal
    }
    const num = parseFloat(texto);
    return isNaN(num) ? 0 : num;
};

const normalizarNombreColumna = (col) => {
    if (!col) return '';
    return col.toString().toLowerCase().trim()
        .replace(/_/g, ' ')
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const normalizarNroProceso = (nro) => {
    if (!nro || nro === 'S/D') return 'S/D';
    return nro.toString()
        .trim()
        .toUpperCase()
        .replace(/-/g, '/')          // Normalize dashes to slashes
        .replace(/\b0+(\d+)/g, '$1') // Strip leading zeros in numeric parts
        .replace(/\s+/g, '');        // Strip all spaces
};

const normalizarEstado = (est) => {
    if (!est) return 'PRESENTADA';
    const e = est.toString().toUpperCase().trim();
    if (e.includes('GANADA TOTAL') || e.includes('ADJUDICADA TOTAL') || e === 'GANADA' || e === 'ADJUDICADA') return 'GANADA TOTAL';
    if (e.includes('GANADA PARCIAL') || e.includes('ADJUDICADA PARCIAL')) return 'GANADA PARCIAL';
    if (e.includes('PERDIDA') || e.includes('PERDIO')) return 'PERDIDA';
    if (e.includes('BAJA') || e.includes('CANCELADA')) return 'DADA DE BAJA';
    if (e.includes('ESPERA') || e.includes('OC') || e.includes('ORDEN DE COMPRA')) return 'EN ESPERA DE OC';
    return 'DESCONOCIDO';
};

const repararProcesoFecha = (val) => {
    if (!val) return val;
    let fechaObj = null;

    if (val instanceof Date) {
        fechaObj = val;
    } else if (typeof val === 'string') {
        const s = val.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
            fechaObj = new Date(s);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
            const [d, m, y] = s.split('/');
            fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
        }
    } else if (typeof val === 'number') {
        if (val > 35000 && val < 60000) {
            fechaObj = new Date((val - (25567 + 1)) * 86400 * 1000);
        }
    }

    if (fechaObj && !isNaN(fechaObj.getTime())) {
        const mes = fechaObj.getMonth() + 1;
        const anio = fechaObj.getFullYear();
        return `${mes}/${anio}`;
    }

    return val;
};

// ==========================================
// COMPARATIVAS IMPORTER
// ==========================================

const analizarDocumentoComparativa = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No hay archivo' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const filas = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        let hospitalDetectado = 'S/D';
        let nroProcesoDetectado = 'S/D';
        let fechaDetectada = 'S/D';

        for (let i = 0; i < Math.min(filas.length, 25); i++) {
            const fila = filas[i];
            if (!fila) continue;
            
            fila.forEach((celda, idx) => {
                if (!celda) return;
                const valStr = String(celda).toUpperCase();

                if (valStr.includes('HOSPITAL') && hospitalDetectado === 'S/D') {
                    hospitalDetectado = String(celda).replace(/\xa0/g, ' ').replace(/\s+/g, ' ').trim();
                }
                if ((valStr.includes('COTIZACI') || valStr.includes('PROCESO')) && nroProcesoDetectado === 'S/D') {
                    const n = fila.find(c => /[\d/-]{4,}/.test(String(c)));
                    if (n) nroProcesoDetectado = String(n).trim();
                }
                if (valStr.includes('FECHA') && fechaDetectada === 'S/D') {
                    const posibleFecha = (celda instanceof Date || /\d/.test(valStr)) ? celda : fila[idx + 1];
                    const fNorm = normalizarFechaAString(posibleFecha);
                    if (fNorm) fechaDetectada = fNorm;
                }
            });
        }

        const filaHeadersIdx = filas.findIndex(f => {
            if (!f) return false;
            const val = String(f[0] || '').trim().toUpperCase();
            if (val === 'R' || val === 'ITEM') return true;
            if (val.startsWith('RENGL')) return true;
            return false;
        });
        if (filaHeadersIdx === -1) return res.status(400).json({ error: 'Formato no reconocido' });

        const filaHeaders = filas[filaHeadersIdx];
        const filaEmpresasIdx = filaHeadersIdx - 1;

        const lowerHeaders = filaHeaders.map(h => String(h || '').trim().toLowerCase());
        const idxR = lowerHeaders.findIndex(h => h === 'r' || h === 'item' || h.startsWith('rengl'));
        const idxCant = lowerHeaders.findIndex(h => h.startsWith('cant'));
        const idxDetalle = lowerHeaders.findIndex(h => h === 'detalle' || h === 'producto' || h === 'insumo' || h.startsWith('detal'));
        const idxMenor = lowerHeaders.findIndex(h => h === 'menor' || h.includes('menor'));
        const idxProv = lowerHeaders.findIndex(h => h === 'proveedor' || h.includes('proveedor'));
        const idxMarca = lowerHeaders.findIndex(h => h === 'marca');

        const isHeaderReserved = (valH) => {
            const v = valH.trim().toUpperCase();
            if (v === 'R' || v === 'ITEM' || v === 'TOTAL' || v === 'MARCA' || v === 'MENOR' || v === 'PROVEEDOR') {
                return true;
            }
            if (v.startsWith('RENGL') || v.startsWith('CANT') || v.startsWith('DETAL') || v.startsWith('PROD') || v.startsWith('INSUMO')) {
                return true;
            }
            return false;
        };

        const mapaOferentes = []; 
        for (let col = 0; col < filaHeaders.length; col++) {
            const valH = String(filaHeaders[col] || '').trim().toUpperCase();
            if (valH && !isHeaderReserved(valH)) {
                let nombreReal = '';
                for (let b = col; b >= 0; b--) {
                    const c = String(filas[filaEmpresasIdx][b] || '').trim();
                    if (c && !c.toUpperCase().includes('OFERENTE')) { nombreReal = c.toUpperCase(); break; }
                }
                mapaOferentes.push({ nombre: nombreReal || valH, colPrecio: col, colMarca: col - 1 });
            }
        }

        const colSR = mapaOferentes.find(o => {
            const n = String(o.nombre || '').toUpperCase().replace(/\s+/g, ' ').replace(/[^A-Z0-9 ]/g, '');
            return n.includes('DROGUERIA DEMO') || n.includes('DORGUERIA DEMO') || n.includes('DEMO') || (n.includes('SALUD') && n.includes('RENAL'));
        });
        const colPH = mapaOferentes.find(o => {
            const n = String(o.nombre || '').toUpperCase().replace(/\s+/g, ' ').replace(/[^A-Z0-9 ]/g, '');
            // Evitar confundir competidores/proveedores que tienen "pharma" en el nombre (como EURO PHARMA)
            if (n.includes('EURO') || n.includes('SUIZO') || n.includes('SUIZA') || n.includes('ROFREN')) {
                return false;
            }
            return n.includes('PHARMA CENTER') || n.includes('PHARMACENTER') || n === 'PHARMA' || (n.includes('DROG') && n.includes('PHARMA'));
        });

        const renglones = [];
        const finalIdxR = idxR !== -1 ? idxR : 0;
        const finalIdxCant = idxCant !== -1 ? idxCant : 1;
        const finalIdxDetalle = idxDetalle !== -1 ? idxDetalle : 2;
        const finalIdxMenor = idxMenor !== -1 ? idxMenor : 3;
        const finalIdxProv = idxProv !== -1 ? idxProv : 4;
        const finalIdxMarca = idxMarca !== -1 ? idxMarca : 5;

        for (let i = filaHeadersIdx + 1; i < filas.length; i++) {
            const f = filas[i];
            if (!f || isNaN(parseInt(f[finalIdxR]))) continue;

            const pGan = limpiarPrecio(f[finalIdxMenor]);
            const ofs = mapaOferentes
                .map(o => ({
                    nombre: o.nombre,
                    precio: limpiarPrecio(f[o.colPrecio]),
                    marca: String(f[o.colMarca] || 'S/M').trim()
                }))
                .filter(o => o.precio > 0)
                .filter(o => {
                    const mismoProveedor = o.nombre.trim().toUpperCase() === String(f[finalIdxProv] || '').trim().toUpperCase();
                    const mismoPrecio = Math.abs(o.precio - pGan) < 0.01;
                    return !(mismoProveedor && mismoPrecio);
                })
                .sort((a, b) => a.precio - b.precio);

            const seg = ofs.length > 0 ? ofs[0] : null;
            renglones.push({
                nro_renglon_item: String(f[finalIdxR]),
                cantidad: parseInt(f[finalIdxCant]) || 0,
                producto: String(f[finalIdxDetalle] || 'S/D').trim(),
                primer_oferente: String(f[finalIdxProv] || 'S/D'),
                precio_ganador: pGan,
                marca_ganadora: String(f[finalIdxMarca] || 'S/M'),
                segundo_oferente: seg ? seg.nombre : 'S/D',
                segundo_pu: seg ? seg.precio : 0,
                marca_segundo: seg ? seg.marca : 'S/M',
                mi_cotizacion: colSR ? { precio: limpiarPrecio(f[colSR.colPrecio]), marca: String(f[colSR.colMarca] || 'S/M') } : { precio: 0, marca: 'S/D' },
                pharma: colPH ? { precio: limpiarPrecio(f[colPH.colPrecio]), marca: String(f[colPH.colMarca] || 'S/M') } : { precio: 0, marca: 'S/D' }
            });
        }
        renglones.sort((a, b) => parseInt(a.nro_renglon_item) - parseInt(b.nro_renglon_item));

        res.json({
            cabecera: { nro_proceso: normalizarNroProceso(nroProcesoDetectado), fecha_apertura: fechaDetectada, hospital: hospitalDetectado, tipo_segmento: 'PUBLICO', provincia: detectarProvincia(hospitalDetectado) },
            renglones
        });

    } catch (error) {
        logger.error("Error al previsualizar PDF: " + error.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

const guardarMasivo = async (req, res) => {
    const { cabecera, renglones } = req.body;
    const pool = await poolPromise;
    const client = await pool.pgPool.connect();

    try {
        await client.query('BEGIN');

        // 1. Upsert Destinatarios
        const hName = normalizarNombreHospital(cabecera.hospital);
        const tipoSeg = (cabecera.tipo_segmento || 'PUBLICO').toUpperCase().trim();
        const prov = (cabecera.provincia || 'CBA').toUpperCase().trim();

        const resHosp = await client.query(`
            INSERT INTO Destinatarios (nombre_hospital, tipo_segmento, provincia) 
            VALUES ($1, $2, $3)
            ON CONFLICT (nombre_hospital) 
            DO UPDATE SET tipo_segmento = EXCLUDED.tipo_segmento, provincia = EXCLUDED.provincia
            RETURNING id_destinatario;
        `, [hName, tipoSeg, prov]);
        const id_dest = resHosp.rows[0].id_destinatario;

        // 2. Upsert Procesos
        const nroProc = normalizarNroProceso(cabecera.nro_proceso);
        const userId = req.user.id;

        const resProc = await client.query(`
            INSERT INTO Procesos (nro_proceso, fecha_apertura, id_destinatario, id_usuario_creador, fecha_importacion) 
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (nro_proceso, id_destinatario)
            DO UPDATE SET fecha_apertura = EXCLUDED.fecha_apertura, id_usuario_creador = EXCLUDED.id_usuario_creador, fecha_importacion = NOW()
            RETURNING id_proceso_db;
        `, [nroProc, cabecera.fecha_apertura, id_dest, userId]);
        const id_proc = resProc.rows[0].id_proceso_db;

        // 3. Limpiar Renglones anteriores
        await client.query('DELETE FROM Renglones WHERE id_proceso_db = $1 AND id_destinatario = $2', [id_proc, id_dest]);

        // 4. Insertar Renglones
        for (const r of renglones) {
            const prodName = (r.producto || '').toUpperCase().trim();
            
            // SELECT-then-INSERT para Productos
            let id_prod;
            const resProd = await client.query('SELECT id_producto FROM Productos WHERE nombre_detalle = $1', [prodName]);
            if (resProd.rows.length > 0) {
                id_prod = resProd.rows[0].id_producto;
            } else {
                const insertProd = await client.query('INSERT INTO Productos (nombre_detalle) VALUES ($1) RETURNING id_producto', [prodName]);
                id_prod = insertProd.rows[0].id_producto;
            }

            const pMi = r.mi_cotizacion?.precio || 0;
            const pGan = r.precio_ganador || 0;
            const ganamos = esNuestroGanador(r.primer_oferente, req.user?.empresa || 'NUESTRA EMPRESA') ? 1 : 0;

            await client.query(`
                INSERT INTO Renglones (
                    id_proceso_db, id_destinatario, id_producto, nro_renglon_item, cantidad, 
                    precio_ganador, primer_oferente, marca_ganadora, segundo_pu, segundo_oferente, 
                    marca_segundo, mi_pu, mi_marca, ganamos
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `, [
                id_proc, id_dest, id_prod, r.nro_renglon_item, r.cantidad,
                pGan, r.primer_oferente, r.marca_ganadora,
                r.segundo_pu, r.segundo_oferente, r.marca_segundo,
                pMi, r.mi_cotizacion?.marca, ganamos
            ]);
        }

        // 5. Generar Notificaciones de Licitación Ganada
        let cantGanados = 0;
        let montoGanado = 0;

        for (const r of renglones) {
            const qty = parseInt(r.cantidad) || 0;
            const price = parseFloat(r.precio_ganador) || 0;
            
            if (esNuestroGanador(r.primer_oferente, req.user?.empresa || 'NUESTRA EMPRESA')) {
                cantGanados++;
                montoGanado += price * qty;
            }
        }

        if (cantGanados > 0) {
            const montoFormateado = montoGanado.toLocaleString('es-AR', { minimumFractionDigits: 2 });
            await client.query(`
                INSERT INTO Notificaciones (empresa, titulo, mensaje)
                VALUES ('TODAS', $1, $2)
            `, [
                `¡Licitación Ganada! - ${nroProc}`,
                `Hospital: ${hName} | Adjudicados ${cantGanados} renglones por un total de $${montoFormateado}`
            ]);
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Error guardando masivo comparativas: ' + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    } finally {
        client.release();
    }
};

const MAPA_HOSPITALES_SALUD_RENAL = {
    'CORDOBA': 'HOSPITAL CÓRDOBA',
    'RIO TERCERO': 'HOSPITAL PROVINCIAL BRIGADIER GRAL. JUAN B. BUSTOS RÍO TERCERO',
    'NINOS': 'HOSPITAL DE NIÑOS',
    'NIÑOS': 'HOSPITAL DE NIÑOS',
    'ALTA GRACIA': 'HOSPITAL DR. ARTURO ILLIA - ALTA GRACIA',
    'OLIVA': 'HOSPITAL ZONAL DE OLIVA',
    'MINA CLAVERO': 'HOSPITAL BELLODI DE MINA CLAVERO',
    'CEBALLOS BELLVILLE': 'HOSPITAL DR. JOSÉ A. CEBALLOS (BELL VILLE - CBA.)',
    'CEBALLOS': 'HOSPITAL DR. JOSÉ A. CEBALLOS (BELL VILLE - CBA.)',
    'BELLVILLE': 'HOSPITAL DR. JOSÉ A. CEBALLOS (BELL VILLE - CBA.)',
    'TRANSITO CACERES': 'HOSPITAL TRANSITO CACERES DE ALLENDE',
    'TRANSITO CÁCERES': 'HOSPITAL TRANSITO CACERES DE ALLENDE',
    'PASTEUR': 'HOSPITAL REGIONAL PASTEUR',
    'PEDIATRICO': 'HOSPITAL PEDIATRICO DEL NIÑO JESUS',
    'PEDIÁTRICO': 'HOSPITAL PEDIATRICO DEL NIÑO JESUS',
    'AURELIO CRESPO': 'HOSPITAL AURELIO CRESPO',
    'ONCOLOGICO': 'HOSPITAL ONCOLOGICO',
    'ONCOLÓGICO': 'HOSPITAL ONCOLOGICO',
    'MISERICORDIA': 'HOSPITAL MISERICORDIA NUEVO SIGLO',
    'DOMINGO FUNES': 'HOSPITAL DOMINGO FUNES',
    'SAN ROQUE': 'HOSPITAL: NUEVO HOSPITAL SAN ROQUE',
    'RAWSON': 'HOSPITAL DR. GUILLERMO RAWSON',
    'SAN JOSE DE LA DORMIDA': 'HOSPITAL REGIONAL SAN JOSE DE LA DORMIDA',
    'MUNICIPALIDAD CBA': 'MUNICIPALIDAD CBA',
    'MATERNO PROVINCIAL': 'MATERNIDAD PROVINCIAL 25 DE MAYO',
    'MINISTERIO CON SOBRE': 'MINISTERIO DE SALUD',
    'MINISTERIO POR MAIL': 'MINISTERIO DE SALUD',
    'MARCOS JUAREZ': 'HOSPITAL DR ABEL AYERZA - MARCOS JUAREZ',
    'MARCOS JUÁREZ': 'HOSPITAL DR ABEL AYERZA - MARCOS JUAREZ',
    'MUNICIPALIDAD VCP': 'MUNICIPALIDAD VILLA CARLOS PAZ',
    'NEONATAL': 'HOSPITAL MATERNO NEONATAL',
    'PADUA': 'NUEVO HOSPITAL RIO CUARTO SAN ANTONIO DE PADUA',
    'UNQUILLO': 'HOSPITAL J. M. URRUTIA DE UNQUILLO',
    'VILLA DOLORES': 'HOSPITAL DE VILLA DOLORES',
    'HNC UNC': 'HOSPITAL NACIONAL DE CLINICAS - UNC',
    'FLORENCIO DIAZ': 'HOSPITAL FLORENCIO DIAZ',
    'FLORENCIO DÍAZ': 'HOSPITAL FLORENCIO DIAZ',
    'ACCION SOCIAL': 'MINISTERIO DE SALUD (ACCIÓN SOCIAL)',
    'ACCIÓN SOCIAL': 'MINISTERIO DE SALUD (ACCIÓN SOCIAL)',
    'CARCANO LABOULAYE': 'HOSPITAL RAMÓN J CÁRCANO LABOULAYE',
    'CÁRCANO LABOULAYE': 'HOSPITAL RAMÓN J CÁRCANO LABOULAYE',
    'DESPENADEROS': 'HOSPITAL ELPIDIO GONZALEZ',
    'DESPEÑADEROS': 'HOSPITAL ELPIDIO GONZALEZ',
    'ELPIDIO TORRES': 'HOSPITAL ELPIDIO TORRES',
    'EVA PERON': 'HOSPITAL EVA PERON',
    'EVA PERÓN': 'HOSPITAL EVA PERON',
    'INCLUIR SALUD / PROFE': 'MINISTERIO DE SALUD (INCLUIR SALUD)',
    'INCLUIR SALUD': 'MINISTERIO DE SALUD (INCLUIR SALUD)',
    'INFRAESTRUCTURA': 'MINISTERIO DE SALUD (INFRAESTRUCTURA)',
    'ITURRASPE': 'HOSPITAL J.B. ITURRASPE',
    'LA CALERA': 'HOSPITAL MATERNO INFANTIL ARTURO U. ILLIA - LA CALERA'
};

const HOSPITAL_KEYWORDS_SALUD_RENAL = Object.keys(MAPA_HOSPITALES_SALUD_RENAL);

const looksLikeHospitalCol = (normKey, val) => {
    if (!val) return false;
    const nk = normKey.toLowerCase();
    if (nk.includes('hospital') || nk.includes('cliente') || nk.includes('destinatario') || nk.includes('institucion')) {
        return true;
    }
    const valUpper = String(val).toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return HOSPITAL_KEYWORDS_SALUD_RENAL.some(kw => valUpper.includes(kw));
};

const normalizarHospitaldrogueriademo = (val) => {
    if (!val) return 'S/D';
    const cleanVal = val.toString().toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (MAPA_HOSPITALES_SALUD_RENAL[cleanVal]) {
        return MAPA_HOSPITALES_SALUD_RENAL[cleanVal];
    }
    
    for (const [key, mapped] of Object.entries(MAPA_HOSPITALES_SALUD_RENAL)) {
        if (cleanVal.includes(key)) {
            return mapped;
        }
    }
    
    return val.toUpperCase().trim();
};

const looksLikeProceso = (normKey) => {
    if (normKey.includes('detalle') || normKey.includes('producto') || normKey.includes('descripcion') || normKey.includes('marca') || normKey.includes('precio') || normKey.includes('subtotal')) {
        return false;
    }
    return normKey.includes('proceso') || normKey.includes('process') || normKey.includes('cotizacion');
};

const looksLikeMarca = (normKey) => {
    if (normKey.includes('segundo') || normKey.includes('1') || normKey.includes('2') || normKey.includes('3') || normKey.includes('dpc') || normKey.includes('sr') || normKey.includes('renal') || normKey.includes('pharma')) {
        return false;
    }
    return normKey === 'marca' || normKey === 'brand' || normKey.includes('marca');
};

const looksLikePrecioUnitario = (normKey) => {
    if (normKey.includes('segundo') || normKey.includes('2') || normKey.includes('dpc') || normKey.includes('sr') || normKey.includes('renal') || normKey.includes('pharma') || normKey.includes('subtotal') || normKey.includes('total')) {
        return false;
    }
    return normKey.includes('precio') || normKey.includes('unitario') || normKey === 'pu' || normKey === 'precio_unitario';
};

const analizarDocumentoDiarias = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No hay archivo' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: null });
        
        const renglones = [];
        for (const rawRow of rawRows) {
            const row = {};
            for (const [key, val] of Object.entries(rawRow)) {
                if (val === null || val === undefined) continue;
                const normKey = normalizarNombreColumna(key);
                
                const isDateVal = (val instanceof Date) || (typeof val === 'string' && /^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(val.trim()));
                if (isDateVal) {
                    if (normKey.includes('fecha') || normKey.includes('date') || normKey.includes('apertura')) {
                        row.fecha = val;
                        continue;
                    }
                    if (!looksLikeProceso(normKey)) {
                        continue;
                    }
                }

                if (normKey.includes('fecha') || normKey.includes('date') || normKey.includes('apertura')) {
                    row.fecha = val;
                } else if (looksLikeProceso(normKey)) {
                    row.nro_proceso = val;
                } else if (normKey.includes('segmento') || normKey.includes('tipo')) {
                    row.tipo_segmento = val;
                } else if (normKey.includes('hospital') || normKey.includes('destinatario') || normKey.includes('cliente')) {
                    row.hospital = val;
                } else if (normKey.includes('renglon') || normKey.includes('item') || normKey === 'r') {
                    row.renglon = val;
                } else if (normKey.includes('cantidad') || normKey.includes('cant') || normKey.includes('qty')) {
                    row.cantidad = val;
                } else if (normKey.includes('detalle') || normKey.includes('producto') || normKey.includes('descripcion') || normKey.includes('detail')) {
                    row.detalle = val;
                } else if (looksLikeMarca(normKey)) {
                    row.marca = val;
                } else if (looksLikePrecioUnitario(normKey)) {
                    row.precio_unitario = val;
                } else if (normKey.includes('empresa') || normKey.includes('company') || normKey.includes('firma')) {
                    row.empresa = val;
                }
            }

            if (row.hospital || row.nro_proceso) {
                renglones.push({
                    fecha: normalizarFechaAString(row.fecha) || new Date().toISOString().split('T')[0],
                    nro_proceso: normalizarNroProceso(repararProcesoFecha(row.nro_proceso)),
                    tipo_segmento: String(row.tipo_segmento || 'PUBLICO').trim().toUpperCase(),
                    hospital: String(row.hospital || 'S/D').trim().toUpperCase(),
                    renglon: String(row.renglon || '1'),
                    cantidad: parseInt(row.cantidad) || 0,
                    detalle: String(row.detalle || 'S/D').trim().toUpperCase(),
                    marca: String(row.marca || 'S/M').trim().toUpperCase(),
                    precio_unitario: limpiarPrecio(row.precio_unitario),
                    empresa: String(row.empresa || '').trim().toUpperCase()
                });
            }
        }

        res.json({ renglones });
    } catch (error) {
        logger.error('Error analizando diarias: ' + error.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

const guardarMasivoDiarias = async (req, res) => {
    const { renglones } = req.body;
    if (!renglones || !Array.isArray(renglones)) {
        return res.status(400).json({ error: 'Renglones inválidos' });
    }

    const pool = await poolPromise;
    const client = await pool.pgPool.connect();

    try {
        await client.query('BEGIN');

        // 1. Extraer hospitales únicos (suele haber muy pocos en la planilla)
        const uniqueHospitals = [...new Set(renglones.map(r => normalizarNombreHospital(r.hospital)))].filter(Boolean);
        const mapHospitals = {};

        for (const hospName of uniqueHospitals) {
            const resHosp = await client.query(`
                INSERT INTO Destinatarios (nombre_hospital, tipo_segmento, provincia) 
                VALUES ($1, $2, $3)
                ON CONFLICT (nombre_hospital)
                DO UPDATE SET tipo_segmento = EXCLUDED.tipo_segmento, provincia = EXCLUDED.provincia
                RETURNING id_destinatario;
            `, [hospName, 'PUBLICO', detectarProvincia(hospName)]);
            mapHospitals[hospName] = resHosp.rows[0].id_destinatario;
        }

        // 2. Extraer procesos únicos (nro_proceso + hospital)
        const uniqueProcesses = [];
        const seenProcKeys = new Set();

        for (const r of renglones) {
            const hospName = normalizarNombreHospital(r.hospital);
            const idDest = mapHospitals[hospName];
            const nroProc = normalizarNroProceso(r.nro_proceso);
            const key = `${nroProc}-${idDest}`;

            if (!seenProcKeys.has(key)) {
                seenProcKeys.add(key);
                uniqueProcesses.push({
                    nro_proceso: nroProc,
                    id_destinatario: idDest,
                    fecha: r.fecha
                });
            }
        }

        const mapProcesses = {};
        for (const proc of uniqueProcesses) {
            const resProc = await client.query(`
                INSERT INTO Procesos (nro_proceso, fecha_apertura, id_destinatario) 
                VALUES ($1, $2, $3)
                ON CONFLICT (nro_proceso, id_destinatario)
                DO UPDATE SET fecha_apertura = EXCLUDED.fecha_apertura
                RETURNING id_proceso_db;
            `, [proc.nro_proceso, proc.fecha, proc.id_destinatario]);
            const key = `${proc.nro_proceso}-${proc.id_destinatario}`;
            mapProcesses[key] = resProc.rows[0].id_proceso_db;
        }

        // 3. Limpiar registros de Diarias anteriores para los procesos involucrados
        const combinacionesLimpiadas = new Set();
        for (const key of seenProcKeys) {
            const [nroProc, idDestStr] = key.split('-');
            const idDest = parseInt(idDestStr);
            const idProc = mapProcesses[key];
            const empresaFirma = defaultEmpresa || 'PHARMA CENTER';

            const cleanKey = `${idProc}-${idDest}-${empresaFirma}`;
            if (!combinacionesLimpiadas.has(cleanKey)) {
                await client.query(`
                    DELETE FROM Diarias 
                    WHERE id_proceso_db = $1 AND id_destinatario = $2 AND empresa = $3
                `, [idProc, idDest, empresaFirma]);
                combinacionesLimpiadas.add(cleanKey);
            }
        }

        // 4. Insertar renglones de Diarias en CHUNKS (lotes de 150 filas) para evitar colapsar la conexión
        const chunkSize = 150;
        for (let i = 0; i < renglones.length; i += chunkSize) {
            const chunk = renglones.slice(i, i + chunkSize);
            let placeholders = [];
            let values = [];
            let valIdx = 1;

            chunk.forEach((r) => {
                const hospName = normalizarNombreHospital(r.hospital);
                const idDest = mapHospitals[hospName];
                const nroProc = normalizarNroProceso(r.nro_proceso);
                const idProc = mapProcesses[`${nroProc}-${idDest}`];
                const empresaFirma = r.empresa || defaultEmpresa || 'PHARMA CENTER';

                placeholders.push(`($${valIdx}, $${valIdx + 1}, $${valIdx + 2}, $${valIdx + 3}, $${valIdx + 4}, $${valIdx + 5}, $${valIdx + 6}, $${valIdx + 7}, $${valIdx + 8}, $${valIdx + 9}, $${valIdx + 10})`);
                
                values.push(
                    empresaFirma,
                    idProc,
                    idDest,
                    r.fecha,
                    r.tipo_segmento,
                    detectarProvincia(r.hospital),
                    r.renglon,
                    r.cantidad,
                    r.detalle,
                    r.marca,
                    r.precio_unitario
                );

                valIdx += 11;
            });

            const queryStr = `
                INSERT INTO Diarias (
                    empresa, id_proceso_db, id_destinatario, fecha, tipo_segmento, 
                    provincia, renglon, cantidad, detalle, marca, precio_unitario
                ) 
                VALUES ${placeholders.join(', ')}
            `;
            await client.query(queryStr, values);
        }

        // 5. Actualizar SeguimientoLicitaciones (SELECT-then-INSERT/UPDATE pattern)
        for (const comb of combinacionesLimpiadas) {
            const [idProc, idDest, empresaFirma] = comb.split('-');
            
            const sumRes = await client.query(`
                SELECT SUM(cantidad * precio_unitario) as total 
                FROM Diarias 
                WHERE id_proceso_db = $1 AND id_destinatario = $2 AND empresa = $3
            `, [parseInt(idProc), parseInt(idDest), empresaFirma]);
            const totalCotizado = sumRes.rows[0].total || 0;

            const resSeg = await client.query(`
                SELECT 1 FROM SeguimientoLicitaciones WHERE id_proceso_db = $1 AND empresa = $2
            `, [parseInt(idProc), empresaFirma]);

            if (resSeg.rows.length > 0) {
                await client.query(`
                    UPDATE SeguimientoLicitaciones 
                    SET importe_cotizado = $1 
                    WHERE id_proceso_db = $2 AND empresa = $3
                `, [totalCotizado, parseInt(idProc), empresaFirma]);
            } else {
                await client.query(`
                    INSERT INTO SeguimientoLicitaciones (id_proceso_db, empresa, estado, importe_cotizado)
                    VALUES ($1, $2, 'PRESENTADA', $3)
                `, [parseInt(idProc), empresaFirma, totalCotizado]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Error guardando diarias: ' + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    } finally {
        client.release();
    }
};

const analizarDocumentoSeguimiento = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No hay archivo' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: null });
        
        const renglones = [];
        for (const rawRow of rawRows) {
            const row = {};
            for (const [key, val] of Object.entries(rawRow)) {
                if (val === null || val === undefined) continue;
                const normKey = normalizarNombreColumna(key);
                
                const isDateVal = (val instanceof Date) || (typeof val === 'string' && /^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(val.trim()));
                if (isDateVal) {
                    if (normKey.includes('fecha') || normKey.includes('date') || normKey.includes('apertura') || normKey.includes('recibida')) {
                        if (normKey.includes('recibida')) {
                            row.fecha_recibida_oc = val;
                        } else {
                            row.fecha = val;
                        }
                        continue;
                    }
                    if (!looksLikeProceso(normKey)) {
                        continue;
                    }
                }

                if (normKey.includes('fecha') || normKey.includes('date') || normKey.includes('apertura')) {
                    row.fecha = val;
                } else if (looksLikeProceso(normKey)) {
                    row.nro_proceso = val;
                } else if (looksLikeHospitalCol(normKey, val)) {
                    row.hospital = val;
                } else if (normKey.includes('total') || normKey.includes('importe') || normKey.includes('cotizado')) {
                    row.total_cotizado = val;
                } else if (normKey.includes('estado') || normKey.includes('status') || normKey.includes('resultado')) {
                    row.estado = val;
                } else if (normKey.includes('empresa') || normKey.includes('company')) {
                    row.empresa = val;
                } else if (normKey.includes('op') || normKey.includes('oc') || normKey.includes('compra') || normKey.includes('op/oc')) {
                    row.nro_oc = val;
                } else if (normKey.includes('nv') || normKey.includes('nota') || normKey.includes('venta')) {
                    row.nro_nv = val;
                } else if (normKey.includes('factura') || normKey.includes('fact')) {
                    row.nro_factura = val;
                } else if (normKey.includes('adjudicado') || normKey.includes('adju')) {
                    row.importe_adjudicado = val;
                } else if (normKey.includes('recibida') || normKey.includes('reci')) {
                    row.fecha_recibida_oc = val;
                }
            }

            if (row.hospital || row.nro_proceso) {
                let finalHosp = String(row.hospital || 'S/D').trim().toUpperCase();
                finalHosp = normalizarHospitaldrogueriademo(finalHosp);

                renglones.push({
                    fecha: normalizarFechaAString(row.fecha) || new Date().toISOString().split('T')[0],
                    nro_proceso: normalizarNroProceso(repararProcesoFecha(row.nro_proceso)),
                    hospital: finalHosp,
                    total_cotizado: limpiarPrecio(row.total_cotizado),
                    estado: normalizarEstado(row.estado),
                    empresa: 'DROGUERIA DEMO',
                    nro_oc: row.nro_oc ? String(row.nro_oc).trim() : null,
                    nro_nv: row.nro_nv ? String(row.nro_nv).trim() : null,
                    nro_factura: row.nro_factura ? String(row.nro_factura).trim() : null,
                    importe_adjudicado: limpiarPrecio(row.importe_adjudicado),
                    fecha_recibida_oc: normalizarFechaAString(row.fecha_recibida_oc)
                });
            }
        }

        res.json({ renglones });
    } catch (error) {
        logger.error('Error analizando seguimiento: ' + error.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

const guardarMasivoSeguimiento = async (req, res) => {
    const { renglones } = req.body;
    if (!renglones || !Array.isArray(renglones)) {
        return res.status(400).json({ error: 'Renglones inválidos' });
    }

    const pool = await poolPromise;
    const client = await pool.pgPool.connect();

    try {
        await client.query('BEGIN');

        // 1. Extraer hospitales únicos
        const uniqueHospitals = [...new Set(renglones.map(r => normalizarNombreHospital(r.hospital)))].filter(Boolean);
        const mapHospitals = {};

        for (const hospName of uniqueHospitals) {
            const resHosp = await client.query(`
                INSERT INTO Destinatarios (nombre_hospital, tipo_segmento, provincia) 
                VALUES ($1, 'PUBLICO', $2)
                ON CONFLICT (nombre_hospital)
                DO UPDATE SET provincia = EXCLUDED.provincia
                RETURNING id_destinatario;
            `, [hospName, detectarProvincia(hospName)]);
            mapHospitals[hospName] = resHosp.rows[0].id_destinatario;
        }

        // 2. Extraer procesos únicos
        const uniqueProcesses = [];
        const seenProcKeys = new Set();

        for (const r of renglones) {
            const hospName = normalizarNombreHospital(r.hospital);
            const idDest = mapHospitals[hospName];
            const nroProc = normalizarNroProceso(r.nro_proceso);
            const key = `${nroProc}-${idDest}`;

            if (!seenProcKeys.has(key)) {
                seenProcKeys.add(key);
                uniqueProcesses.push({
                    nro_proceso: nroProc,
                    id_destinatario: idDest,
                    fecha: r.fecha
                });
            }
        }

        const mapProcesses = {};
        for (const proc of uniqueProcesses) {
            const resProc = await client.query(`
                INSERT INTO Procesos (nro_proceso, fecha_apertura, id_destinatario) 
                VALUES ($1, $2, $3)
                ON CONFLICT (nro_proceso, id_destinatario)
                DO UPDATE SET fecha_apertura = EXCLUDED.fecha_apertura
                RETURNING id_proceso_db;
            `, [proc.nro_proceso, proc.fecha, proc.id_destinatario]);
            const key = `${proc.nro_proceso}-${proc.id_destinatario}`;
            mapProcesses[key] = resProc.rows[0].id_proceso_db;
        }

        // 3. Guardar en SeguimientoLicitaciones (SELECT-then-INSERT/UPDATE pattern)
        for (const r of renglones) {
            const empresaFirma = r.empresa || defaultEmpresa || 'DROGUERIA DEMO';
            const hospName = normalizarNombreHospital(r.hospital);
            const idDest = mapHospitals[hospName];
            const nroProc = normalizarNroProceso(r.nro_proceso);
            const idProc = mapProcesses[`${nroProc}-${idDest}`];

            let frecVal = null;
            if (r.fecha_recibida_oc) {
                const cleanStr = String(r.fecha_recibida_oc).trim().toUpperCase();
                if (cleanStr && cleanStr !== 'NULL' && cleanStr !== 'UNDEFINED' && cleanStr !== 'S/D' && cleanStr !== 'S/M' && cleanStr !== '') {
                    const parsedD = new Date(r.fecha_recibida_oc);
                    if (!isNaN(parsedD.getTime())) {
                        frecVal = parsedD;
                    }
                }
            }

            const state = r.estado || 'PRESENTADA';
            const tot = r.total_cotizado || 0;
            const oc = r.nro_oc || null;
            const nv = r.nro_nv || null;
            const fac = r.nro_factura || null;
            const adj = r.importe_adjudicado || 0;

            const checkSeg = await client.query(`
                SELECT id_seguimiento, estado, importe_cotizado, nro_oc, nro_nv, nro_factura, importe_adjudicado, fecha_recibida_oc
                FROM SeguimientoLicitaciones 
                WHERE id_proceso_db = $1 AND empresa = $2
            `, [idProc, empresaFirma]);

            if (checkSeg.rows.length > 0) {
                // Update
                const existing = checkSeg.rows[0];
                const finalTot = tot > 0 ? tot : existing.importe_cotizado;
                const finalOc = oc !== null ? oc : existing.nro_oc;
                const finalNv = nv !== null ? nv : existing.nro_nv;
                const finalFac = fac !== null ? fac : existing.nro_factura;
                const finalAdj = adj > 0 ? adj : existing.importe_adjudicado;
                const finalFrec = frecVal !== null ? frecVal : existing.fecha_recibida_oc;

                await client.query(`
                    UPDATE SeguimientoLicitaciones 
                    SET estado = $1, 
                        importe_cotizado = $2,
                        nro_oc = $3,
                        nro_nv = $4,
                        nro_factura = $5,
                        importe_adjudicado = $6,
                        fecha_recibida_oc = $7
                    WHERE id_proceso_db = $8 AND empresa = $9
                `, [
                    state, finalTot, finalOc, finalNv, finalFac, finalAdj, finalFrec,
                    idProc, empresaFirma
                ]);
            } else {
                // Insert
                await client.query(`
                    INSERT INTO SeguimientoLicitaciones (
                        id_proceso_db, empresa, estado, importe_cotizado, 
                        nro_oc, nro_nv, nro_factura, importe_adjudicado, fecha_recibida_oc
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    idProc, empresaFirma, state, tot,
                    oc, nv, fac, adj, frecVal
                ]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Error guardando seguimiento: ' + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    } finally {
        client.release();
    }
};

module.exports = {
    analizarDocumentoComparativa,
    guardarMasivo,
    analizarDocumentoDiarias,
    guardarMasivoDiarias,
    analizarDocumentoSeguimiento,
    guardarMasivoSeguimiento
};