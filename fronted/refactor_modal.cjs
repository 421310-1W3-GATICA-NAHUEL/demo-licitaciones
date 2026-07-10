const fs = require('fs');

function refactorModal() {
    const path = "c:/Users/nahue/OneDrive/Escritorio/licitaciones-demo/fronted/src/pages/Comparativas.jsx";
    let text = fs.readFileSync(path, 'utf8');

    // Replace the specific grid columns from 4 to 3 (since we merge DPC and SR into one)
    text = text.replace(/<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">/g, 
                        '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">');
                        
    // Replace the Cards for DPC and SR
    const dpcCardRegex = /\{\(userEmpresaAcceso === 'TODAS'[\s\S]*?<CardDetalle[\s\S]*?titulo="Pharma Center"[\s\S]*?\/>\s*\)\}/;
    const srCardRegex = /\{\(userEmpresaAcceso === 'TODAS'[\s\S]*?<CardDetalle[\s\S]*?titulo="Salud Renal"[\s\S]*?\/>\s*\)\}/;
    
    // We create a new single generic card
    const nuestraCard = `<CardDetalle
                      titulo="Nuestra Cotización"
                      prov={(selectedItem.nuestro_pu || selectedItem.dpc_pu || selectedItem.sr_pu) > 0 ? "Cotización Propia" : "No Cotizado"}
                      marca={selectedItem.nuestra_marca || selectedItem.marca_dpc || selectedItem.marca_sr}
                      precio={selectedItem.nuestro_pu || selectedItem.dpc_pu || selectedItem.sr_pu}
                      color="nuestro"
                      dif={calcularDiferencia(selectedItem.nuestro_pu || selectedItem.dpc_pu || selectedItem.sr_pu, selectedItem.precio_1)}
                      noCotizado={!(selectedItem.nuestro_pu || selectedItem.dpc_pu || selectedItem.sr_pu) || parseFloat(selectedItem.nuestro_pu || selectedItem.dpc_pu || selectedItem.sr_pu) === 0}
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

    fs.writeFileSync(path, text);
    console.log("Modal in Comparativas updated.");
}

refactorModal();
