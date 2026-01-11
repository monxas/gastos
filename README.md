# Gastos

Aplicacion PWA mobile-first para gestion de gastos personales con soporte offline y dark mode.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

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

## Instalacion

### Docker Compose (recomendado)

1. Crea un archivo `docker-compose.yml`:

```yaml
services:
  gastos:
    image: ghcr.io/monxas/gastos:latest
    container_name: gastos
    ports:
      - "8080:3000"
    volumes:
      - gastos-data:/app/backend/data
    environment:
      - JWT_SECRET=tu-secreto-seguro-aqui
    restart: unless-stopped

volumes:
  gastos-data:
```

2. Genera un secreto seguro para JWT:

```bash
openssl rand -base64 32
```

3. Reemplaza `tu-secreto-seguro-aqui` con el secreto generado.

4. Inicia la aplicacion:

```bash
docker-compose up -d
```

5. Accede a `http://localhost:8080`

### Con Traefik (SSL automatico)

Si usas Traefik como reverse proxy:

```yaml
services:
  gastos:
    image: ghcr.io/monxas/gastos:latest
    container_name: gastos
    volumes:
      - gastos-data:/app/backend/data
    environment:
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.gastos.rule=Host(`gastos.tudominio.com`)"
      - "traefik.http.routers.gastos.entrypoints=websecure"
      - "traefik.http.routers.gastos.tls.certresolver=letsencrypt"
      - "traefik.http.services.gastos.loadbalancer.server.port=3000"

networks:
  web:
    external: true

volumes:
  gastos-data:
```

Crea un archivo `.env` con tu secreto:

```bash
JWT_SECRET=$(openssl rand -base64 32)
```

## Actualizacion

```bash
docker-compose pull
docker-compose up -d
```

## Backup

Los datos se almacenan en un volumen Docker. Para hacer backup:

```bash
# Crear backup
docker run --rm -v gastos-data:/data -v $(pwd):/backup alpine tar czf /backup/gastos-backup.tar.gz -C /data .

# Restaurar backup
docker run --rm -v gastos-data:/data -v $(pwd):/backup alpine tar xzf /backup/gastos-backup.tar.gz -C /data
```

## Variables de Entorno

| Variable | Descripcion | Requerido |
|----------|-------------|-----------|
| `JWT_SECRET` | Secreto para tokens de autenticacion | Si |

## Uso

1. **Registro**: Al acceder por primera vez, crea una cuenta
2. **Cuentas**: Configura tus cuentas bancarias, efectivo y tarjetas
3. **Categorias**: Personaliza las categorias de gastos
4. **Gastos**: Registra tus gastos diarios desde el boton +
5. **Presupuestos**: Define limites mensuales por categoria
6. **Informes**: Visualiza graficos y tendencias

### Instalacion como PWA

En tu movil, abre la app en el navegador y selecciona "Agregar a pantalla de inicio" para instalarla como aplicacion nativa.

## Desarrollo

Ver [DEVELOPMENT.md](DEVELOPMENT.md) para instrucciones de desarrollo local.

## Licencia

MIT
