# Gastos

Aplicacion PWA mobile-first para gestion de gastos personales con soporte offline y dark mode.

## Caracteristicas

- **Gastos y categorias** - Registra gastos con categorias personalizables e iconos
- **Multiples cuentas** - Banco, efectivo, tarjetas de debito y credito
- **Tarjetas de credito** - Control de limite, cortes y pagos automaticos
- **Presupuestos** - Define limites por categoria o total mensual con alertas
- **Ingresos** - Seguimiento de salario, freelance, inversiones, etc.
- **Gastos recurrentes** - Suscripciones automaticas (Netflix, Spotify, alquiler...)
- **Informes** - Graficos por categoria, tendencias mensuales, comparativas
- **Multi-moneda** - Soporte para conversion de divisas
- **Dark mode** - Tema claro/oscuro automatico o manual
- **PWA** - Instalable en movil, funciona offline
- **Tags** - Etiquetas personalizables para filtrar gastos
- **Recibos** - Adjunta fotos de recibos a los gastos

## Stack

- **Frontend**: React 18, Vite, Recharts, date-fns
- **Backend**: Node.js, Fastify, SQLite (better-sqlite3)
- **PWA**: vite-plugin-pwa, Workbox
- **Despliegue**: Docker

## Inicio Rapido

### Con Docker (recomendado)

```bash
docker-compose up -d --build
```

La app estara disponible en http://localhost:8080

### Desarrollo local (sin Docker)

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (en otra terminal)
cd frontend && npm install && npm run dev
```

## Despliegue en Produccion

### Con Traefik

1. Crear archivo `.env`:
```bash
cp .env.example .env
# Editar y poner un JWT_SECRET seguro:
# openssl rand -base64 32
```

2. Crear red de Docker (si no existe):
```bash
docker network create web
```

3. Desplegar:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

El archivo `docker-compose.prod.yml` incluye labels de Traefik para SSL automatico con Let's Encrypt.

### Sin Traefik

```bash
docker-compose up -d --build
```

Configura un reverse proxy (nginx, caddy) apuntando al puerto 8080.

## Variables de Entorno

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secreto para tokens JWT | (requerido en prod) |
| `NODE_ENV` | Entorno | production |
| `PORT` | Puerto del servidor | 3000 |
| `DB_PATH` | Ruta base de datos SQLite | /app/backend/data/gastos.db |

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
├── docker-compose.yml      # Desarrollo
├── docker-compose.prod.yml # Produccion con Traefik
├── Dockerfile
└── .env.example
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

## Licencia

MIT
