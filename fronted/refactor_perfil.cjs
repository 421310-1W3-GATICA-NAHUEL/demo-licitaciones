const fs = require('fs');

function refactorPerfilModal() {
    const path = "c:/Users/nahue/OneDrive/Escritorio/licitaciones-demo/fronted/src/components/PerfilModal.jsx";
    let text = fs.readFileSync(path, 'utf8');

    text = text.replace(/const userEmpresaAcceso = sessionStorage\.getItem\('userEmpresaAcceso'\) \|\| '';/g, '');
    
    // Remove the block showing 'Empresa Asignada'
    const empStart = text.indexOf("{/* EMPRESA ASIGNADA */}");
    if (empStart !== -1) {
        // Looking for the end of the div
        const empEndStr = "</div>";
        // Need to be careful. The block looks like:
        /*
          {/* EMPRESA ASIGNADA *}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
            ...
          </div>
        */
        const nextDiv = text.indexOf("</div>", empStart);
        if (nextDiv !== -1) {
            text = text.slice(0, empStart) + text.slice(nextDiv + 6);
        }
    }

    // Just use regex for the specific div if the above is brittle
    const blockRegex = /\{\/\* EMPRESA ASIGNADA \*\/\}\s*<div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">[\s\S]*?<\/div>/g;
    text = text.replace(blockRegex, '');

    fs.writeFileSync(path, text);
    console.log("PerfilModal processed.");
}

refactorPerfilModal();
