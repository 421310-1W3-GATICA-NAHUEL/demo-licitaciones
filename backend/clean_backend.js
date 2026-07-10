const fs = require('fs');

function cleanFile(path, rules) {
    if (fs.existsSync(path)) {
        let c = fs.readFileSync(path, 'utf8');
        rules.forEach(r => {
            c = c.replace(r.search, r.replace);
        });
        fs.writeFileSync(path, c);
    }
}

// 1. inventario.controller.js
cleanFile('src/controllers/inventario.controller.js', [
    { search: /const empresaActiva = resolverEmpresaActiva\(req, 'SHORT'\);\s*/g, replace: '' },
    { search: /const values = \[empresaActiva\];/g, replace: 'const values = [];\n        let paramIndex = 1;' },
    { search: /WHERE empresa = \$1/g, replace: 'WHERE 1=1' },
    { search: /AND empresa = \$1/g, replace: 'AND 1=1' },
    { search: /, \[empresaActiva\]/g, replace: '' }
]);

// 2. ia.controller.js
cleanFile('src/controllers/ia.controller.js', [
    { search: /const empresaActiva = resolverEmpresaActiva\(req, 'SHORT'\);\s*/g, replace: '' },
    { search: /\[empresaActiva, `%\\\$\{busqueda\}%`\]/g, replace: '[`%${busqueda}%`]' },
    { search: /\[empresaActiva, `%\\\$\{nroNormalizado\}%`\]/g, replace: '[`%${nroNormalizado}%`]' },
    { search: /valuesInv\.push\(empresaActiva\);\s*/g, replace: '' },
    { search: /valuesRen\.push\(empresaActiva\);\s*/g, replace: '' },
    { search: /valuesDia\.push\(empresaActiva\);\s*/g, replace: '' },
    { search: /AND empresa = \$1/g, replace: 'AND 1=1' },
    { search: /AND R\.empresa = \$1/g, replace: 'AND 1=1' },
    { search: /AND D\.empresa = \$1/g, replace: 'AND 1=1' }
]);

// 3. notificaciones.controller.js
cleanFile('src/controllers/notificaciones.controller.js', [
    { search: /const empresa = resolverEmpresaActiva\(req, 'SHORT'\);\s*/g, replace: '' },
    { search: /AND empresa = \$1/g, replace: 'AND 1=1' },
    { search: /, \[empresa\]/g, replace: '' }
]);

// 4. importarController.js y importarPdf.controller.js
cleanFile('src/controllers/importarController.js', [
    { search: /const defaultEmpresa = resolverEmpresaActiva\(req, 'LONG'\);\s*/g, replace: '' }
]);
cleanFile('src/controllers/importarPdf.controller.js', [
    { search: /const targetEmpresa = resolverEmpresaActiva\(req, 'LONG'\);\s*\/\/ "PHARMA CENTER" o "SALUD RENAL"\s*/g, replace: '' }
]);

console.log('Cleaned controllers');
