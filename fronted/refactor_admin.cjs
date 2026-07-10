const fs = require('fs');

function refactorAdminUsuarios() {
    const path = "c:/Users/nahue/OneDrive/Escritorio/licitaciones-demo/fronted/src/pages/AdminUsuarios.jsx";
    let text = fs.readFileSync(path, 'utf8');

    // Remove the select elements for 'Acceso a Empresa'

    const desktopSelectRegex = /\{\/\* Empresa Acceso \*\/\}\s*<td className="py-5 px-4 font-black">[\s\S]*?<\/td>/g;
    text = text.replace(desktopSelectRegex, '');

    const mobileSelectRegex = /\{\/\* Empresa Acceso \*\/\}\s*<div>\s*<label className="text-\[9px\] text-slate-400 uppercase tracking-wider block mb-1">Acceso a Empresa<\/label>[\s\S]*?<\/div>/g;
    text = text.replace(mobileSelectRegex, '');

    // Replace the table header 
    text = text.replace(/<th className="px-4 py-4 uppercase text-\[10px\] tracking-widest">Empresa<\/th>/g, '');
    
    // Remove default initial state
    text = text.replace(/empresa_acceso: u\.empresa_acceso,/g, '');
    text = text.replace(/empresa_acceso: editData\.empresa_acceso,/g, '');

    fs.writeFileSync(path, text);
    console.log("AdminUsuarios processed.");
}

refactorAdminUsuarios();
