# Laundry ERP

## Database Blueprint v1.0

**Proyecto:** Laundry ERP

**Motor:** PostgreSQL 17

**Backend:** Supabase

**Frontend:** React + Vite + TypeScript

**Arquitectura:** Clean Architecture

---

# Objetivos

La base de datos ha sido diseñada para:

- Soportar múltiples sucursales.
- Permitir múltiples usuarios por sucursal.
- Registrar auditoría completa.
- Permitir entregas parciales.
- Mantener histórico de precios.
- Escalar sin rediseñar el modelo.
- Integrarse posteriormente con WhatsApp, API y App Móvil.

---

# Convenciones

## Claves primarias

Todas las tablas utilizan:

```sql
UUID
```

Campo:

```text
id
```

---

## Soft Delete

Todas las tablas incluyen:

```text
deleted_at
```

Nunca se eliminará información de producción.

---

## Fechas

Todas las tablas incluyen:

```text
created_at
updated_at
```

---

## Código visible

Los usuarios nunca visualizarán UUID.

Ejemplo:

```
LPA-ORD-000154
```

---

# Módulos

## Configuración

| Tabla              | Descripción                |
| ------------------ | -------------------------- |
| branches           | Sucursales                 |
| workstations       | Equipos/Puntos de atención |
| document_sequences | Correlativos               |
| system_settings    | Configuración global       |

---

## Seguridad

| Tabla            | Descripción          |
| ---------------- | -------------------- |
| profiles         | Usuarios             |
| roles            | Roles                |
| permissions      | Permisos             |
| role_permissions | Permisos por rol     |
| profile_roles    | Roles por usuario    |
| user_branches    | Sucursales asignadas |

---

## Clientes

| Tabla     | Descripción |
| --------- | ----------- |
| customers | Clientes    |

---

## Catálogos

| Tabla              | Descripción       |
| ------------------ | ----------------- |
| garments           | Prendas           |
| services           | Servicios         |
| garment_conditions | Estado al recibir |
| payment_methods    | Métodos de pago   |

---

## Operación

| Tabla                | Descripción |
| -------------------- | ----------- |
| orders               | Cabecera    |
| order_items          | Prendas     |
| item_photos          | Fotografías |
| item_deliveries      | Entregas    |
| order_status_history | Historial   |
| item_events          | Eventos     |

---

## Pagos

| Tabla    | Descripción |
| -------- | ----------- |
| payments | Pagos       |

---

## Caja

| Tabla          | Descripción      |
| -------------- | ---------------- |
| cash_sessions  | Apertura/Cierre  |
| cash_movements | Ingresos/Egresos |

---

## Auditoría

| Tabla      | Descripción        |
| ---------- | ------------------ |
| audit_logs | Auditoría completa |

---

## Notificaciones

| Tabla          | Descripción       |
| -------------- | ----------------- |
| notifications  | Mensajes internos |
| whatsapp_queue | Cola WhatsApp     |

---

# Relaciones principales

branches

├── workstations

├── user_branches

├── customers

├── orders

├── cash_sessions

└── document_sequences

---

customers

└── orders

---

orders

├── order_items

├── payments

└── order_status_history

---

order_items

├── item_photos

├── item_deliveries

└── item_events

---

roles

└── role_permissions

---

profiles

├── profile_roles

└── user_branches

---

# Reglas del negocio

## Clientes

- El celular debe ser único.
- El cliente se busca por celular.
- Si no existe, se crea automáticamente.

---

## Órdenes

- Deben contener al menos una prenda.
- El precio queda congelado al momento del registro.
- El servicio también queda registrado como texto histórico.
- El código de la orden es único.

---

## Entregas

- Se permite entrega parcial.
- Una prenda solo puede entregarse una vez.
- La orden se cierra automáticamente cuando todas las prendas fueron entregadas.

---

## Pagos

- Se permiten pagos parciales.
- Una orden puede tener múltiples pagos.
- El saldo pendiente se calcula automáticamente.

---

## Caja

- Solo una caja abierta por estación de trabajo.
- Todo pago genera automáticamente un ingreso.
- Los egresos son manuales.

---

## Auditoría

Se registrará:

- INSERT
- UPDATE
- DELETE lógico
- Login
- Logout
- Cambio de estado
- Pagos
- Entregas

---

# Estados de Orden

RECEIVED

IN_PROCESS

READY

PARTIALLY_DELIVERED

DELIVERED

REQUIRES_REWASH

CANCELLED

---

# Próximas migraciones

001_extensions.sql

002_schema.sql

003_configuration.sql

004_security.sql

005_catalogs.sql

006_customers.sql

007_orders.sql

008_payments.sql

009_cash.sql

010_notifications.sql

011_functions.sql

012_triggers.sql

013_views.sql

014_indexes.sql

015_rls.sql

016_seed.sql
