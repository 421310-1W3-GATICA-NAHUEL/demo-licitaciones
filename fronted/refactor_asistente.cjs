const fs = require('fs');

function refactorAsistente() {
    const path = "c:/Users/nahue/OneDrive/Escritorio/licitaciones-demo/fronted/src/pages/AsistenteIA.jsx";
    let text = fs.readFileSync(path, 'utf8');

    // Remove empresa state and replace with 'Nuestra Empresa'
    text = text.replace(/const \[empresa, setEmpresa\] = useState.*?;\s*/g, '');
    
    // Hardcode the selection of empresa since it doesn't matter or remove the UI for it
    text = text.replace(/const empresaNombre = empresa === 'SR' \? 'Salud Renal' : 'Pharma Center';/g, "const empresaNombre = 'Nuestra Empresa';");
    
    text = text.replace(/empresa === 'SR' \? 'text-blue-600' : 'text-indigo-600'/g, "'text-blue-600'");
    text = text.replace(/Modo \{empresa === 'SR' \? 'Salud Renal' : 'Pharma Center'\}/g, 'Modo Asistente');
    text = text.replace(/empresa === 'SR' \? 'bg-blue-600' : 'bg-indigo-600'/g, "'bg-blue-600'");
    text = text.replace(/empresa === 'SR' \? 'Ej: Suturas de polipropileno o Proceso 26001072' : 'Ej: Eritropoyetina o Proceso 26001072'/g, "'Ej: Proceso 26001072'");
    text = text.replace(/empresa === 'SR'/g, 'true'); // For any ternary rendering
    
    // Fix getEmpresaFromStorage
    const getEmpresaRegex = /const getEmpresaFromStorage = \(\) => \{[\s\S]*?\};/g;
    text = text.replace(getEmpresaRegex, "const getEmpresaFromStorage = () => 'NUESTRA EMPRESA';");

    // Remove the selection screen
    const selectionScreenRegex = /if \(!empresa\) \{[\s\S]*?return \([\s\S]*?<\/div>\s*\);\s*\}/;
    if (text.match(selectionScreenRegex)) {
        text = text.replace(selectionScreenRegex, '');
    }
    
    // But since `empresa` variable was removed, any reference to `empresa` must be replaced
    text = text.replace(/empresa: empresa/g, "empresa: 'NUESTRA EMPRESA'");
    text = text.replace(/\{empresa\}/g, "");
    
    // For the UI rendering `empresa`
    text = text.replace(/<div className="flex gap-4">[\s\S]*?<\/div>/g, '<div className="flex gap-4"></div>'); // Just rip it if it's there
    
    fs.writeFileSync(path, text);
    console.log("AsistenteIA processed.");
}

refactorAsistente();
