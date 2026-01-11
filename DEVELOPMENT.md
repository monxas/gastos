# Desarrollo

Instrucciones para desarrollo local del proyecto Gastos.

## Stack Tecnologico

- **Frontend**: React 18, Vite, Recharts, date-fns
- **Backend**: Node.js, Fastify, SQLite (better-sqlite3)
- **PWA**: vite-plugin-pwa, Workbox

## Requisitos

- Node.js 18+
- npm

## Desarrollo Local

### Backend

```bash
cd backend
npm install
npm run dev
```

El servidor se inicia en `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

La app se inicia en `http://localhost:5173` con hot reload.

## Estructura del Proyecto

```
gastos/
├── backend/
│   └── src/
│       ├── db/          # Inicializacion SQLite
│       ├── routes/      # Endpoints API
│       └── index.js     # Entry point
├── frontend/
│   └── src/
│       ├── components/  # Componentes React
│       ├── context/     # Auth y Theme contexts
│       ├── pages/       # Paginas de la app
│       ├── services/    # API client
│       └── styles/      # CSS global
├── docker-compose.yml
├── docker-compose.prod.yml
└── Dockerfile
```

## Build Local con Docker

```bash
docker-compose up -d --build
```

La app estara en `http://localhost:8080`

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
- `GET /api/expenses/summary/monthly` - Resumen mensual
- `GET /api/expenses/export/csv` - Exportar CSV

### Categorias
- `GET /api/categories` - Listar
- `POST /api/categories` - Crear
- `PUT /api/categories/:id` - Actualizar
- `DELETE /api/categories/:id` - Eliminar

### Cuentas
- `GET /api/accounts` - Listar
- `POST /api/accounts` - Crear
- `PUT /api/accounts/:id` - Actualizar
- `DELETE /api/accounts/:id` - Eliminar
- `POST /api/accounts/:id/close-statement` - Cerrar tarjeta

### Presupuestos
- `GET /api/budgets` - Listar
- `POST /api/budgets` - Crear
- `GET /api/budgets/insights` - Alertas y tendencias

### Ingresos
- `GET /api/incomes` - Listar
- `POST /api/incomes` - Crear
- `GET /api/incomes/summary` - Resumen por fuente

### Gastos Recurrentes
- `GET /api/recurring` - Listar reglas
- `POST /api/recurring` - Crear regla
- `POST /api/recurring/process` - Procesar pendientes
- `GET /api/recurring/upcoming` - Proximos gastos

### Otros
- `GET /api/tags` - Tags
- `GET /api/currency/list` - Divisas disponibles
- `GET /api/currency/rate` - Tipo de cambio
- `GET /api/receipts/:id/image` - Imagen de recibo
- `GET /api/settings` - Configuracion
- `GET /health` - Health check
