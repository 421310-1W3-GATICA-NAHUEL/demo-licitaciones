import os
import re

def process_dashboard(content):
    # Remove userEmpresaAcceso and defaultEmpresa
    content = re.sub(r"const userEmpresaAcceso = sessionStorage\.getItem\('userEmpresaAcceso'\);\s*", "", content)
    content = re.sub(r"const defaultEmpresa = .*?;\s*", "", content)
    content = re.sub(r"const \[empresa, setEmpresa\] = useState\(.*?;\s*", "", content)
    
    # Remove params.append('empresa', empresa)
    content = re.sub(r"params\.append\('empresa', empresa\);\s*", "", content)
    
    # Remove empresa from dependencies
    content = re.sub(r"empresa,\s*", "", content)
    
    # primaryColor
    content = re.sub(r"const primaryColor = empresa === 'SALUD RENAL' \? '#4f46e5' : '#0059a3';", "const primaryColor = '#0059a3';", content)
    
    # ESTADISTICAS DPC / SR
    content = content.replace("ESTADISTICAS DPC / SR", "ESTADISTICAS")
    content = content.replace("ESTADÍSTICAS DPC / SR", "ESTADÍSTICAS")
    
    # Bloquear provincia a CBA
    content = re.sub(r"// Bloquear provincia a CBA si es Salud Renal\s*useEffect\(\(\) => \{\s*if \(empresa === 'SALUD RENAL'\) \{\s*setFiltros\(prev => \(\{ \.\.\.prev, provincia: 'CBA', hospital: 'Todos' \}\)\);\s*\} else \{\s*setFiltros\(prev => \(\{ \.\.\.prev, provincia: 'Todas', hospital: 'Todos' \}\)\);\s*\}\s*\}, \[empresa\]\);\s*", "", content)
    content = re.sub(r"// Bloquear provincia a CBA si es Salud Renal.*?\}, \[\]\);", "", content, flags=re.DOTALL)
    
    # Tabs
    content = re.sub(r"\{\/\* TABS DE EMPRESAS \*\/\}.*?<\/div>\s*\}\)\s*", "", content, flags=re.DOTALL)
    
    # Map colors
    content = content.replace("heatColor = 'bg-[#8db92e]'; // Verde SR", "heatColor = 'bg-[#0059a3]';")
    content = content.replace("heatColor = 'bg-[#e30613]'; // Rojo DPC", "heatColor = 'bg-[#0059a3]';")
    content = content.replace("glowColor = 'bg-[#8db92e]/25';", "glowColor = 'bg-[#0059a3]/25';")
    content = content.replace("glowColor = 'bg-[#e30613]/25';", "glowColor = 'bg-[#0059a3]/25';")
    
    # textToCopy templates
    content = content.replace("(${empresa})", "")
    
    # disabled
    content = re.sub(r"disabled=\{empresa === 'SALUD RENAL'\}", "", content)
    content = re.sub(r"\{empresa === 'SALUD RENAL' \? \(.*?\) : \(\s*<>\s*(.*?)\s*</>\s*\)\}", r"\1", content, flags=re.DOTALL)

    # number box color
    content = re.sub(r"\$\{empresa === 'SALUD RENAL' \? 'group-hover:bg-\[#4f46e5\]' : 'group-hover:bg-\[#0059a3\]'\}", "group-hover:bg-[#0059a3]", content)

    # TABS DE EMPRESAS block logic specifically
    # Just remove it manually if regex fails
    
    return content

path = "c:/Users/nahue/OneDrive/Escritorio/licitaciones-demo/fronted/src/pages/Dashboard.jsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()
    
# Manual tab removal
import re
tabs_start = text.find("{/* TABS DE EMPRESAS */}")
if tabs_start != -1:
    tabs_end = text.find("</button>\n          </div>\n        )}")
    if tabs_end != -1:
        text = text[:tabs_start] + text[tabs_end + len("</button>\n          </div>\n        )}")]

text = process_dashboard(text)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)
print("Dashboard processed.")
