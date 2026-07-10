const fs = require('fs');

function refactorModal(path) {
    if (!fs.existsSync(path)) return;
    let text = fs.readFileSync(path, 'utf8');

    // Replace the specific grid columns from 4 to 3
    text = text.replace(/<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">/g, 
                        '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">');
                        
    // Replace the Cards for DPC and SR
    const dpcCardRegex = /\{\(userEmpresaAcceso === 'TODAS'[\s\S]*?<CardDetalle[\s\S]*?titulo="Pharma Center"[\s\S]*?\/>\s*\)\}/;
    const srCardRegex = /\{\(userEmpresaAcceso === 'TODAS'[\s\S]*?<CardDetalle[\s\S]*?titulo="Salud Renal"[\s\S]*?\/>\s*\)\}/;
    
    // Check if it's using selectedAuditItem instead of selectedItem
    let itemVar = "selectedItem";
    if (text.includes("selectedAuditItem.dpc_pu")) {
        itemVar = "selectedAuditItem";
    }

    const nuestraCard = `<CardDetalle
                      titulo="Nuestra Cotización"
                      prov={(${itemVar}.nuestro_pu || ${itemVar}.dpc_pu || ${itemVar}.sr_pu) > 0 ? "Cotización Propia" : "No Cotizado"}
                      marca={${itemVar}.nuestra_marca || ${itemVar}.marca_dpc || ${itemVar}.marca_sr}
                      precio={${itemVar}.nuestro_pu || ${itemVar}.dpc_pu || ${itemVar}.sr_pu}
                      color="nuestro"
                      dif={calcularDiferencia(${itemVar}.nuestro_pu || ${itemVar}.dpc_pu || ${itemVar}.sr_pu, ${itemVar}.precio_1)}
                      noCotizado={!(${itemVar}.nuestro_pu || ${itemVar}.dpc_pu || ${itemVar}.sr_pu) || parseFloat(${itemVar}.nuestro_pu || ${itemVar}.dpc_pu || ${itemVar}.sr_pu) === 0}
                    />`;

    if (text.match(dpcCardRegex)) {
        text = text.replace(dpcCardRegex, nuestraCard);
        text = text.replace(srCardRegex, ''); // Remove the second one
    }
    
    // Replace styles for color
    const dpcStyleRegex = /case 'dpc':\s*return \{\s*bg: 'bg-blue-50\/70',[\s\S]*?\};/;
    const srStyleRegex = /case 'sr':\s*return \{\s*bg: 'bg-indigo-50\/70',[\s\S]*?\};/;
    
    const nuestroStyle = `case 'nuestro':
          return {
            bg: 'bg-blue-50/70',
            border: 'border-[#0059a3]',
            text: 'text-slate-700',
            icon: 'text-[#0059a3]'
          };`;

    if (text.match(dpcStyleRegex)) {
        text = text.replace(dpcStyleRegex, nuestroStyle);
        text = text.replace(srStyleRegex, '');
    }

    // Clean up specific parts for Cotizador
    text = text.replace(/if \(acceso === 'SALUD RENAL'\) return 'SR';/g, '');
    text = text.replace(/if \(acceso === 'PHARMA CENTER'\) return 'DPC';/g, '');
    
    text = text.replace(/\(hist\.sr_pu \|\| hist\.dpc_pu \|\| 0\)/g, "(hist.nuestro_pu || hist.sr_pu || hist.dpc_pu || 0)");

    fs.writeFileSync(path, text);
    console.log(`Modal in ${path} updated.`);
}

refactorModal("c:/Users/nahue/OneDrive/Escritorio/licitaciones-demo/fronted/src/pages/Cotizador.jsx");
