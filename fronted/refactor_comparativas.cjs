const fs = require('fs');

function processComparativas() {
    const path = "c:/Users/nahue/OneDrive/Escritorio/licitaciones-demo/fronted/src/pages/Comparativas.jsx";
    let text = fs.readFileSync(path, 'utf8');
    
    // Remove userEmpresaAcceso
    text = text.replace(/const userEmpresaAcceso = sessionStorage\.getItem\('userEmpresaAcceso'\);\s*/g, '');
    text = text.replace(/params\.append\('empresa', userEmpresaAcceso \|\| 'PHARMA CENTER'\);\s*/g, '');
    text = text.replace(/params\.append\('empresa', userEmpresaAcceso\);\s*/g, '');
    
    // Replace getGanadorLabel
    const getGanadorLabelOriginal = /const getGanadorLabel = \(item\) => \{[\s\S]*?\};\n/g;
    const newGetGanadorLabel = `const getGanadorLabel = (item) => {
  const cotizo = (item.nuestro_pu || item.sr_pu || item.dpc_pu) > 0;
  if (!cotizo) {
    return 'No Cotizado';
  }
  if (!item.ganamos) return 'Perdido';
  return 'Ganado';
};\n`;
    text = text.replace(getGanadorLabelOriginal, newGetGanadorLabel);
    
    // In the render for desktop table headers
    text = text.replace(/<th className="[^"]*?">[\s]*DPC[\s]*<\/th>\s*<th className="[^"]*?">[\s]*SALUD RENAL[\s]*<\/th>/g, 
        '<th className="px-3 py-4 text-center font-black text-slate-400 uppercase tracking-widest text-[10px] w-24">Nuestra Cotización</th>');
        
    // Also might have been written differently, let's just do an aggressive replace
    // Find DPC and SALUD RENAL headers
    text = text.replace(/<th[^>]*>\s*DPC\s*<\/th>\s*<th[^>]*>\s*SALUD RENAL\s*<\/th>/gi, '<th className="px-3 py-4 text-center font-black text-slate-400 uppercase tracking-widest text-[10px] w-24 border-l border-slate-100">NUESTRA COTIZACIÓN</th>');
    
    // In table body (desktop)
    text = text.replace(/<td[^>]*>\s*<div[^>]*>\s*(?:\{item\.dpc_pu > 0 \? ([\s\S]*?) : '---'\})\s*<\/div>\s*<\/td>\s*<td[^>]*>\s*<div[^>]*>\s*(?:\{item\.sr_pu > 0 \? ([\s\S]*?) : '---'\})\s*<\/div>\s*<\/td>/g, 
    `<td className="px-3 py-4 text-center whitespace-nowrap bg-blue-50/30 border-l border-slate-100">
        <div className="font-bold text-xs text-slate-700 bg-white border border-slate-200 py-1 px-2 rounded-lg inline-block shadow-sm">
            {(item.nuestro_pu || item.dpc_pu || item.sr_pu) > 0 ? \`$\${parseFloat(item.nuestro_pu || item.dpc_pu || item.sr_pu).toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2})}\` : '---'}
        </div>
    </td>`);

    // Sometimes it's structured differently, let's be more generic
    // Replace the specific td for DPC and SR
    // Let's just find them and replace
    const tdDpcSrRegex = /<td className="px-3 py-4 text-center whitespace-nowrap bg-rose-50\/30 border-l border-slate-100">[\s\S]*?<\/td>\s*<td className="px-3 py-4 text-center whitespace-nowrap bg-emerald-50\/30 border-l border-slate-100">[\s\S]*?<\/td>/;
    const replacementTd = `<td className="px-3 py-4 text-center whitespace-nowrap bg-blue-50/30 border-l border-slate-100">
                            <div className="font-bold text-xs text-slate-700 bg-white border border-slate-200 py-1 px-2 rounded-lg inline-block shadow-sm">
                              {(item.nuestro_pu || item.dpc_pu || item.sr_pu) > 0 ? \`$\${parseFloat(item.nuestro_pu || item.dpc_pu || item.sr_pu).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\` : '---'}
                            </div>
                          </td>`;
    text = text.replace(tdDpcSrRegex, replacementTd);

    // Replace headers again if it missed
    const thDpcSrRegex = /<th className="px-3 py-4 text-center font-black text-rose-600 uppercase tracking-widest text-\[10px\] w-24 border-l border-slate-100">\s*DPC\s*<\/th>\s*<th className="px-3 py-4 text-center font-black text-emerald-600 uppercase tracking-widest text-\[10px\] w-24 border-l border-slate-100">\s*SALUD RENAL\s*<\/th>/;
    const replacementTh = `<th className="px-3 py-4 text-center font-black text-blue-600 uppercase tracking-widest text-[10px] w-24 border-l border-slate-100">NUESTRA COTIZACIÓN</th>`;
    text = text.replace(thDpcSrRegex, replacementTh);

    // In mobile view (Cards)
    const mobileDpcSrRegex = /<div className="bg-rose-50 p-2 rounded-xl text-center border border-rose-100">[\s\S]*?<\/div>\s*<div className="bg-emerald-50 p-2 rounded-xl text-center border border-emerald-100">[\s\S]*?<\/div>/;
    const mobileReplacement = `<div className="bg-blue-50 p-2 rounded-xl text-center border border-blue-100">
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Nuestra Cotización</p>
                                <p className="text-xs font-bold text-slate-700">
                                  {(item.nuestro_pu || item.dpc_pu || item.sr_pu) > 0 ? \`$\${parseFloat(item.nuestro_pu || item.dpc_pu || item.sr_pu).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\` : '---'}
                                </p>
                              </div>`;
    text = text.replace(mobileDpcSrRegex, mobileReplacement);

    fs.writeFileSync(path, text);
    console.log("Comparativas processed.");
}

processComparativas();
