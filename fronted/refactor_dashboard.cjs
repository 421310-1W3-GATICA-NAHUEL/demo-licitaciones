const fs = require('fs');

function processDashboard() {
    const path = "c:/Users/nahue/OneDrive/Escritorio/licitaciones-demo/fronted/src/pages/Dashboard.jsx";
    let text = fs.readFileSync(path, 'utf8');
    
    // TABS DE EMPRESAS block
    const tabsStart = text.indexOf("{/* TABS DE EMPRESAS */}");
    const tabsEndStr = "</button>\n          </div>\n        )}";
    const tabsEnd = text.indexOf(tabsEndStr);
    if (tabsStart !== -1 && tabsEnd !== -1) {
        text = text.slice(0, tabsStart) + text.slice(tabsEnd + tabsEndStr.length);
    }

    text = text.replace(/const userEmpresaAcceso = sessionStorage\.getItem\('userEmpresaAcceso'\);\s*/g, '');
    text = text.replace(/const defaultEmpresa = .*?;\s*/g, '');
    text = text.replace(/const \[empresa, setEmpresa\] = useState\(.*?\);\s*/g, '');
    
    text = text.replace(/params\.append\('empresa', empresa\);\s*/g, '');
    text = text.replace(/, empresa/g, ''); // in dependencies
    
    text = text.replace(/const primaryColor = empresa === 'SALUD RENAL' \? '#4f46e5' : '#0059a3';/g, "const primaryColor = '#0059a3';");
    
    text = text.replace(/ESTADISTICAS DPC \/ SR/g, 'ESTADISTICAS');
    
    const cbaBlockRegex = /\/\/ Bloquear provincia a CBA si es Salud Renal[\s\S]*?\}, \[.*?\]\);/g;
    text = text.replace(cbaBlockRegex, '');
    
    text = text.replace(/heatColor = 'bg-\[#8db92e\]'; \/\/ Verde SR/g, "heatColor = 'bg-[#0059a3]';");
    text = text.replace(/heatColor = 'bg-\[#e30613\]'; \/\/ Rojo DPC/g, "heatColor = 'bg-[#0059a3]';");
    text = text.replace(/glowColor = 'bg-\[#8db92e\]\/25';/g, "glowColor = 'bg-[#0059a3]/25';");
    text = text.replace(/glowColor = 'bg-\[#e30613\]\/25';/g, "glowColor = 'bg-[#0059a3]/25';");
    
    text = text.replace(/\(\$\{empresa\}\)/g, "");
    
    text = text.replace(/disabled=\{empresa === 'SALUD RENAL'\}/g, "");
    
    // Replace the `<>...</>` block for the select
    const selectRegex = /\{empresa === 'SALUD RENAL' \? \([\s\S]*?\) : \(\s*<>\s*([\s\S]*?)\s*<\/>\s*\)\}/;
    const match = text.match(selectRegex);
    if (match) {
        text = text.replace(selectRegex, match[1]);
    }
    
    text = text.replace(/\$\{empresa === 'SALUD RENAL' \? 'group-hover:bg-\[#4f46e5\]' : 'group-hover:bg-\[#0059a3\]'\}/g, "group-hover:bg-[#0059a3]");
    
    fs.writeFileSync(path, text);
    console.log("Dashboard processed.");
}

processDashboard();
