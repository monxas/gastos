# Proyecto: PWA Mobile-First (ES) para Gestión de Gastos (Multiusuario aislado)

## 0) Objetivo
Construir una **PWA mobile-first en español** para **gestión de gastos** con:
- Categorías, conceptos (descripciones), tags
- Gastos recurrentes (simples y avanzados)
- Varias cuentas (banco, efectivo, tarjeta)
- Multimoneda por gasto con conversión automática
- Filtros potentes
- Informes + gráficas
- Exportación a Excel + import/export completo (backup)
- **Local-first + sync** con **backend centralizado**
- UX **muy cuidada**: “Apple vibes” minimalista, animaciones suaves, cero ruido

Alcance inicial: **solo gastos** (no ingresos ni transferencias generales), con excepciones: lógica especial para tarjeta (ver sección cuentas).

---

## 1) Principios de Producto
- **Mobile-first**: 1 mano, navegación clara, inputs optimizados.
- **Offline-first**: todo funciona sin red; la sync es “mejora progresiva”.
- **Rápido**: arranque instantáneo, listas fluidas, animaciones sutiles.
- **Privado por diseño**: datos del usuario aislados, sync segura.
- **Simple por defecto**: avanzado a un toque (no en la cara).

Idioma UI: **español**.

---

## 2) Requisitos Funcionales

### 2.1 Usuarios y autenticación
- App multiusuario, datos **aislados por usuario** (sin grupos compartidos).
- Autenticación “simple” (email+password o equivalente sencillo). Evitar flujos complejos.
- Soporte de cierre de sesión.
- Cada usuario tiene sus datos: cuentas, categorías, tags, configuración de moneda.

### 2.2 Gastos
Campos mínimos por gasto:
- Fecha/hora (por defecto “ahora” con selector amigable)
- Importe (decimal)
- Moneda (por defecto la del usuario; se puede cambiar por gasto)
- Categoría (obligatoria)
- Tags (0..n)
- Concepto/nota (texto)
- Cuenta asociada (obligatoria)
- Adjuntos opcionales (foto ticket) [MVP: opcional/deshabilitado si complica]

Comportamiento:
- CRUD completo
- Duplicar gasto
- Edición rápida en lista (opcional si complica; si no, modal/bottom sheet)
- Búsqueda por texto (concepto)
- Filtros por fecha, categoría, tag, cuenta, rango importe, moneda, recurrente/no recurrente

### 2.3 Categorías y tags
- Seed por defecto al crear usuario (ejemplos):
  - Categorías: Alimentación, Transporte, Casa, Suscripciones, Ocio, Salud, Educación, Viajes, Impuestos, Otros
  - Tags: Supermercado, Restaurante, Gasolina, Amazon, Trabajo, Familia, Urgente, Reembolso
- Cada usuario puede:
  - Crear/editar/borrar categorías y tags
  - Reordenar categorías (para UI)
- Guardar color/icono opcional para categoría y tag (para gráficos y chips).

### 2.4 Recurrentes
Dos niveles:
1) Recurrente fijo simple:
   - Frecuencia: semanal, mensual, anual (y cada X)
   - Fecha inicio
   - Opcional fecha fin
2) Reglas avanzadas:
   - “Día N del mes” (ej. 1, 15, 28)
   - “Último día del mes”
   - “Último viernes” / “Primer lunes” (weekday ordinal)
   - Excepciones: saltar si cae en festivo (MVP: NO; dejar para futuro)

Ejecución:
- Generar instancias de gastos recurrentes automáticamente:
  - Offline: al abrir la app y detectar pendientes, “materializa” instancias.
  - Sync: backend valida/evita duplicados mediante idempotencia.

UX:
- Wizard simple para crear recurrente.
- Vista “Recurrentes” con lista + próxima ocurrencia.

### 2.5 Cuentas (banco/efectivo/tarjeta)
Tipos:
- Banco
- Efectivo
- Tarjeta

Reglas:
- Cada gasto se asigna a una cuenta.
- Para Banco y Efectivo: saldo = saldo inicial - suma(gastos).
- Para Tarjeta: el saldo se comporta como “deuda acumulada” (MVP recomendado):
  - deuda_tarjeta = suma(gastos en tarjeta desde último cierre)
  - Visualizar: “Pendiente tarjeta” y fecha de próximo cierre/pago.

Funcionalidad especial tarjeta:
- “Cerrar tarjeta” (acción):
  - Toma la deuda acumulada del periodo
  - La **resetea a 0** (marca gastos del periodo como “liquidados” o crea un corte)
  - Crea automáticamente un gasto en una **cuenta bancaria indicada** por el usuario:
    - categoría sugerida: “Tarjeta” / “Pago tarjeta”
    - concepto: “Cierre tarjeta [Nombre]”
    - fecha: fecha de cierre
    - importe: deuda
    - moneda: moneda base del usuario (o configurable)
- Configuración por cuenta tarjeta:
  - Banco de cargo por defecto
  - Día de cierre/pago (para avisos)
  - (Opcional) límite de crédito solo informativo

### 2.6 Moneda y conversión
- Cada usuario tiene una moneda base (ej. EUR).
- Cada gasto puede tener moneda distinta.
- Debe existir conversión automática para informes y totales:
  - Guardar en cada gasto:
    - importe_original + moneda_original
    - tipo_cambio_usado + fecha_tipo_cambio
    - importe_convertido_base (calculado)
- Tipo de cambio:
  - Backend centralizado obtiene rates (API externa).
  - Offline: si no hay red, usar último rate cacheado, marcar gasto como “rate pendiente/estimado”.
- Informes siempre pueden:
  - sumar en moneda base
  - mostrar desglose por moneda si aplica

### 2.7 Informes y gráficos
Básicos:
- Gastos por mes
- Gastos por categoría (mes seleccionado)
- Gastos por cuenta

Avanzados:
- Tendencias (línea) mensual por categoría y total
- Comparativa YoY (mismo mes vs año anterior)
- Top tags/categorías
- “Heatmap” de gasto por día (opcional si encaja en minimalismo)

Presupuestos y alertas:
- Presupuesto mensual por:
  - total
  - categoría (opcional)
- Alertas:
  - al superar 80% / 100%
  - notificaciones PWA (si el usuario acepta)

### 2.8 Exportación e import/backup
Export:
- Excel (.xlsx) con hojas:
  - gastos
  - categorías
  - tags
  - cuentas
  - recurrentes
- CSV opcional (si fácil)
- Export de “backup completo” (json + versión)

Import:
- Importar backup completo para restaurar (migraciones versionadas).
- Importar gastos desde CSV/Excel (MVP: CSV primero si Excel complica, pero objetivo final Excel completo).

---

## 3) Requisitos No Funcionales

### 3.1 PWA
- Instalación (manifest, icons, theme)
- Offline caching (service worker)
- Sincronización en background si es viable (Background Sync), si no, sync al abrir.
- Lighthouse: performance/UX alto.

### 3.2 Arquitectura local-first + sync
- Fuente de verdad local: IndexedDB (o SQLite WASM si se decide).
- Backend centralizado:
  - Autenticación
  - Sync bidireccional
  - Resolución de conflictos
  - Almacenamiento cifrado en tránsito

Sync:
- Modelo “append-only” recomendado (event sourcing ligero) o “document replication” con versiones.
- Conflictos:
  - Estrategia simple: Last-Write-Wins con `updated_at` + `client_id`
  - Mantener historial de cambios por entidad (opcional)
- Idempotencia: operaciones con `op_id` para evitar duplicados.

Seguridad:
- HTTPS obligatorio
- Tokens seguros (rotación si posible)
- Datos aislados por `user_id` en backend (RLS si DB lo soporta).

Privacidad:
- No analytics invasivas por defecto.
- Si hay tracking: opt-in.

### 3.3 Rendimiento y UX
- Listas virtualizadas si hace falta
- Animaciones sutiles (transiciones, bottom sheets)
- Tema claro por defecto, modo oscuro opcional (si encaja con minimal)
- Accesibilidad: tamaños, contrastes, labels.

---

## 4) Stack Tecnológico (propuesta)
El agente debe proponer stack final, pero orientaciones:
Frontend:
- PWA moderna (React/Vue/Svelte/Angular, elegir una)
- UI: componentes “native-like” (bottom sheets, segmented controls)
- Gráficas: librería ligera

Local DB:
- IndexedDB con wrapper (Dexie) recomendado.

Backend:
- Node.js (Fastify/Nest) o equivalente simple
- DB: Postgres recomendado (RLS ideal)
- Rates service: job scheduler + cache

Export Excel:
- Librería para generar XLSX en cliente o servidor (evaluar trade-off).

---

## 5) Modelo de Datos (mínimo)
Entidades (con `id`, `user_id`, `created_at`, `updated_at`, `deleted_at` para soft delete, `version` para sync):
- user_settings: moneda_base, idioma, etc.
- categories: name, icon, color, order
- tags: name, color
- accounts: name, type (bank/cash/card), currency?, initial_balance, card_billing_account_id, card_close_day, etc.
- expenses:
  - date
  - amount_original, currency_original
  - exchange_rate, exchange_rate_date
  - amount_base
  - category_id
  - account_id
  - note
  - is_recurrent_instance, recurrent_rule_id?
  - settled_at / statement_id (para tarjeta)
- recurrent_rules:
  - pattern_type (simple/advanced)
  - frequency data (JSON)
  - start_date, end_date
  - next_run_at
- statements (para tarjeta):
  - account_id (tarjeta)
  - period_start, period_end, closed_at
  - total_amount_base

Relaciones:
- expense_tags (m:n)

---

## 6) Pantallas y UX (mobile-first)
Navegación: bottom nav con 4 tabs:
1) Inicio
   - Resumen del mes (total, top categorías)
   - Acceso rápido “+ Gasto”
2) Gastos
   - Lista por fecha (sticky headers)
   - Filtros (sheet)
   - Búsqueda
3) Informes
   - Selector rango (mes, trimestre, año)
   - Gráficas y tarjetas
4) Ajustes
   - Moneda base
   - Cuentas
   - Categorías
   - Tags
   - Recurrentes
   - Export/Import

Flujos clave:
- Añadir gasto: bottom sheet con campos mínimos, autocomplete, tags tipo chips.
- Cerrar tarjeta: CTA en detalle de cuenta tarjeta.

---

## 7) Plan de Entregas (iterativo)
MVP-1:
- Auth simple
- CRUD gastos + categorías + tags
- Cuentas banco/efectivo
- IndexedDB local
- Sync básico (LWW)
- Export CSV (si Excel no llega)

MVP-2:
- Recurrentes (simple + avanzados)
- Cuentas tarjeta + cierre + cargo a banco
- Moneda por gasto + conversión
- Informes básicos

MVP-3:
- Informes avanzados + presupuestos + alertas
- Export Excel completo + backup JSON versionado
- Import backup + migraciones

---

## 8) Definición de “Hecho”
- PWA instalable, usable offline
- Sync robusta sin duplicados
- Export Excel funcional
- UX pulida (animaciones suaves, sin saturación visual)
- Tests mínimos:
  - lógica recurrentes
  - cierre tarjeta
  - conversión moneda
  - sync idempotente

---

## 9) Entregables del agente
El agente debe entregar:
1) Repo con frontend + backend
2) README con setup local + deploy
3) Esquema DB + migraciones
4) Seed de categorías/tags
5) Scripts export/import
6) Suite básica de tests
7) Lista de decisiones (trade-offs) y futuras mejoras

---

## 10) Reglas para el agente (importante)
- No añadir funcionalidades no pedidas (ingresos, sharing, etc.) sin marcarlo como “futuro”.
- Priorizar simplicidad y UX.
- Todo texto en la UI en español.
- Mantener el diseño minimalista, sin “dashboard barroco”.
