const fs = require('fs');

function refactorDashboard() {
    const path = "c:/Users/nahue/OneDrive/Escritorio/licitaciones-demo/fronted/src/pages/Dashboard.jsx";
    let text = fs.readFileSync(path, 'utf8');

    // TABS DE EMPRESAS block
    const tabsStart = text.indexOf("{/* TABS DE EMPRESAS */}");
    const tabsEndStr = "</button>\n          </div>\n        )}";
    if (tabsStart !== -1) {
        const tabsEnd = text.indexOf(tabsEndStr, tabsStart);
        if (tabsEnd !== -1) {
            text = text.slice(0, tabsStart) + text.slice(tabsEnd + tabsEndStr.length);
        } else {
            console.log("Could not find end string for tabs");
        }
    } else {
        console.log("Could not find start string for tabs");
    }

    text = text.replace(/const COLORS = \['#e30613', '#8db92e'\]; \/\/ Rojo DPC \(Perdidos\) y Verde SR \(Ganados\)/g, "const COLORS = ['#e30613', '#8db92e'];");

    fs.writeFileSync(path, text);
    console.log("Dashboard processed again.");
}

refactorDashboard();
