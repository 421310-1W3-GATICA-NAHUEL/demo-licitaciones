const fs = require('fs');

function processFile(path) {
    if (!fs.existsSync(path)) return;
    let text = fs.readFileSync(path, 'utf8');

    // Remove userEmpresaAcceso logic
    text = text.replace(/const userEmpresaAcceso = sessionStorage\.getItem\('userEmpresaAcceso'\);\s*/g, '');
    text = text.replace(/const defaultEmpresa = .*?;\s*/g, '');
    text = text.replace(/const \[empresa, setEmpresa\] = useState\(.*?\);\s*/g, '');
    text = text.replace(/const \[importEmpresa, setImportEmpresa\] = useState\(.*?\);\s*/g, '');
    
    text = text.replace(/,\s*empresa/g, ''); // inside dependency arrays
    text = text.replace(/empresa,\s*/g, ''); // inside objects/deps
    text = text.replace(/importEmpresa/g, "'Nuestra Empresa'");

    text = text.replace(/empresa === 'SALUD RENAL' \? 'CBA' : provinciaFiltro/g, 'provinciaFiltro');
    text = text.replace(/empresa === 'SALUD RENAL' \? 'CBA' : 'Todas'/g, "'Todas'");
    text = text.replace(/empresa === 'SALUD RENAL'/g, "false");

    // Remove useEffect for SALUD RENAL
    const cbaBlockRegex = /\/\/ Bloquear provincia a CBA si es Salud Renal[\s\S]*?\}, \[.*?\]\);/g;
    text = text.replace(cbaBlockRegex, '');
    
    // Remove TABS DE EMPRESAS
    const tabsStart = text.indexOf("{/* TABS DE EMPRESAS */}");
    if (tabsStart !== -1) {
        const tabsEndStr = "</button>\n          </div>\n        )}";
        const tabsEnd = text.indexOf(tabsEndStr);
        if (tabsEnd !== -1) {
            text = text.slice(0, tabsStart) + text.slice(tabsEnd + tabsEndStr.length);
        }
    }
    
    // PANEL INFORMATIVO DE SALUD RENAL
    const panelStart = text.indexOf("{/* PANEL INFORMATIVO DE SALUD RENAL */}");
    if (panelStart !== -1) {
        const panelEndStr = "</div>\n        )}";
        const panelEnd = text.indexOf(panelEndStr, panelStart);
        if (panelEnd !== -1) {
            text = text.slice(0, panelStart) + text.slice(panelEnd + panelEndStr.length);
        }
    }

    // Remove EMPRESA DESTINATARIA select in modal
    const empDestStart = text.indexOf("{/* EMPRESA DESTINATARIA */}");
    if (empDestStart !== -1) {
        const empDestEndStr = "</button>\n                    </div>\n                  </div>";
        const empDestEnd = text.indexOf(empDestEndStr, empDestStart);
        if (empDestEnd !== -1) {
            text = text.slice(0, empDestStart) + text.slice(empDestEnd + empDestEndStr.length);
        }
    }

    // Clean up specific cases
    text = text.replace(/\{ params: \{ empresa \} \}/g, "");
    text = text.replace(/\$\{empresa\.replace\(\/\\s\+\/g, '_'\)\}/g, "Empresa");
    text = text.replace(/disabled=\{false\}/g, "");
    
    // `<>...` for province options
    text = text.replace(/\{false \? \([\s\S]*?\) : \(\s*<>\s*([\s\S]*?)\s*<\/>\s*\)\}/g, "$1");

    fs.writeFileSync(path, text);
    console.log(`${path} processed.`);
}

processFile("c:/Users/nahue/OneDrive/Escritorio/licitaciones-demo/fronted/src/pages/Seguimiento.jsx");
processFile("c:/Users/nahue/OneDrive/Escritorio/licitaciones-demo/fronted/src/pages/Inventario.jsx");
