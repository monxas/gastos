# Gastos - PWA de Control de Gastos

Aplicacion PWA mobile-first para gestion de gastos personales con soporte offline.

## Caracteristicas

- Autenticacion con email/password
- CRUD completo de gastos
- Categorias y tags personalizables
- Multiples cuentas (banco, efectivo, tarjeta)
- Cierre de tarjeta con cargo automatico a cuenta bancaria
- Informes y graficas mensuales
- Export de datos en JSON
- PWA instalable con soporte offline

## Requisitos

- Docker y Docker Compose

## Inicio Rapido

### Con Docker Compose (recomendado)

```bash
docker compose up -d
```

La aplicacion estara disponible en http://localhost:3000

### Con Docker directamente

```bash
# Construir imagen
docker build -t gastos-app .

# Ejecutar contenedor
docker run -d -p 3000:3000 -v gastos-data:/app/backend/data --name gastos gastos-app
```

## Desarrollo Local

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Estructura del Proyecto

```
gastos/
├── backend/
│   ├── src/
│   │   ├── db/          # Inicializacion SQLite
│   │   ├── routes/      # Rutas API
│   │   ├── utils/       # Utilidades (seed)
│   │   └── index.js     # Punto de entrada
│   └── data/            # Base de datos SQLite
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── context/     # Contextos (Auth)
│   │   ├── pages/       # Paginas
│   │   ├── services/    # API y DB local
│   │   └── styles/      # CSS
│   └── public/          # Assets estaticos
├── Dockerfile           # Build unificado
└── docker-compose.yml   # Orquestacion
```

## API Endpoints

### Autenticacion
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuario actual

### Gastos
- `GET /api/expenses` - Listar (con filtros)
- `POST /api/expenses` - Crear
- `PUT /api/expenses/:id` - Actualizar
- `DELETE /api/expenses/:id` - Eliminar
- `POST /api/expenses/:id/duplicate` - Duplicar
- `GET /api/expenses/summary/monthly` - Resumen mensual

### Categorias
- `GET /api/categories` - Listar
- `POST /api/categories` - Crear
- `PUT /api/categories/:id` - Actualizar
- `DELETE /api/categories/:id` - Eliminar

### Tags
- `GET /api/tags` - Listar
- `POST /api/tags` - Crear
- `PUT /api/tags/:id` - Actualizar
- `DELETE /api/tags/:id` - Eliminar

### Cuentas
- `GET /api/accounts` - Listar
- `POST /api/accounts` - Crear
- `PUT /api/accounts/:id` - Actualizar
- `DELETE /api/accounts/:id` - Eliminar
- `POST /api/accounts/:id/close-statement` - Cerrar tarjeta

### Configuracion
- `GET /api/settings` - Obtener
- `PUT /api/settings` - Actualizar
- `GET /api/settings/export` - Exportar backup

### Sincronizacion
- `GET /api/sync/pull` - Descargar datos
- `POST /api/sync/push` - Subir cambios

## Variables de Entorno

| Variable | Descripcion | Default |
|----------|-------------|---------|
| PORT | Puerto del servidor | 3000 |
| JWT_SECRET | Clave secreta para JWT | (generada) |
| DB_PATH | Ruta a la base de datos | ./data/gastos.db |
| FRONTEND_PATH | Ruta al frontend compilado | ../frontend/dist |

## Tecnologias

- **Backend**: Node.js, Fastify, SQLite (better-sqlite3)
- **Frontend**: React, Vite, Dexie (IndexedDB), Recharts
- **PWA**: vite-plugin-pwa, Workbox
