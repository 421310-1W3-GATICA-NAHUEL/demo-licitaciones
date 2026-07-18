# 🏥 Sistema de Gestión de Licitaciones y Cotizador

![Banner/Screenshot](https://via.placeholder.com/1000x400.png?text=Captura+de+Pantalla+del+Proyecto)

Un desarrollo Full-Stack de una plataforma integral para la gestión de productos, inventario y cotizaciones, orientada a droguerías y proveedores de insumos médicos. La aplicación permite administrar el catálogo de productos de forma segura y ofrece a los clientes un cotizador interactivo en tiempo real.

🔗 **Demo en Vivo:** [Ver Aplicación](https://demo-licitaciones.vercel.app/)

---

## ✨ Características Principales

- **Dashboard de Inventario:** Gestión en tiempo real del stock y los productos.
- **Cotizador Interactivo:** Interfaz dinámica para calcular cotizaciones al instante.
- **Autenticación Segura:** Sistema de login mediante JWT (JSON Web Tokens) y cookies seguras con política `SameSite`.
- **Roles de Usuario:** Diferenciación entre usuarios administradores y clientes.
- **Diseño Responsivo:** Interfaz moderna y adaptable a cualquier dispositivo gracias a Tailwind CSS.

## 🛠️ Tecnologías y Herramientas

**Frontend:**
- [React.js](https://reactjs.org/) (Framework)
- [Vite](https://vitejs.dev/) (Build tool)
- [Tailwind CSS](https://tailwindcss.com/) (Estilos)
- React Router (Navegación SPA)

**Backend:**
- [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/) (Servidor)
- JSON Web Tokens (Autenticación)
- bcrypt (Encriptación)

**Base de Datos & Despliegue:**
- **PostgreSQL** alojado en [Neon Tech](https://neon.tech/)
- **Frontend** alojado en [Vercel](https://vercel.com/)
- **Backend** alojado en [Render](https://render.com/)

---

## 🚀 Credenciales de Prueba (Demo)

Para probar la plataforma en su versión desplegada, podés utilizar los siguientes usuarios de demostración:

| Rol | Email | Contraseña |
| --- | --- | --- |
| **Administrador** | `admin@drogueria.local` | `admin123` |
| **Usuario** | `usuario@drogueria.local` | `user123` |

---

## 💻 Instalación Local

Si deseás correr este proyecto en tu propia máquina:

1. Cloná este repositorio:
   ```bash
   git clone https://github.com/421310-1W3-GATICA-NAHUEL/demo-licitaciones.git
   ```

2. Instalación del Servidor (Backend):
   ```bash
   cd backend
   npm install
   # Crear un archivo .env con las variables necesarias (DB_USER, DB_PASS, JWT_SECRET, etc)
   npm run start
   ```

3. Instalación del Cliente (Frontend):
   ```bash
   cd fronted
   npm install
   npm run dev
   ```

---

*Proyecto desarrollado por Nahuel Gatica para portfolio personal.*
