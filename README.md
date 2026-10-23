# Restaurante App

Aplicación web cliente/servidor para un restaurante: toma de pedidos por mesa, cocina, inventario, productos, cobro y reportes de ventas.

## En línea

| | |
|---|---|
| Cliente | http://sabor-chapin-app.s3-website-us-east-1.amazonaws.com |
| API | http://52.21.51.111/api |

## Arquitectura

```
Navegador ──> S3 (sitio estático: React)
    │
    └── HTTP /api ──> EC2 (Docker Compose)
                        ├── api: Node 22 + Express 5
                        └── db:  MariaDB 10.11
```

- **Cliente:** React 19 + Vite, Tailwind CSS 4, React Router, React Hook Form y Zod.
- **API:** Express 5 con JWT, bcrypt, Zod, helmet, CORS y límite de intentos de login. Los reportes se generan con pdfkit y exceljs.
- **Base de datos:** MariaDB con llaves foráneas, CHECKs, vistas para reportes y transacciones con bloqueo de filas.

## Estructura

```
api/            API REST
  src/modules/  un módulo por recurso: auth, users, mesas, productos, insumos, pedidos, reportes
  test/         pruebas con node:test
client/         aplicación React
  src/pages/    una carpeta por pantalla
  src/lib/      cliente HTTP, validaciones y formato
db/init/        tablas, datos iniciales y vistas (se ejecutan al crear la BD)
deploy/         script para actualizar el servidor
docker-compose.yml
```

Cada módulo de la API se divide en `routes → controller → service → repository`, más un `schema` con las validaciones de Zod. Las rutas solo validan y revisan permisos, el service tiene las reglas del negocio y el repository es el único que escribe SQL.

## Roles

| Rol | Qué puede hacer |
|---|---|
| Administrador | Todo: usuarios, productos, mesas, inventario y reportes |
| Mesero | Mesas, tomar y editar pedidos, cobrar e imprimir la cuenta |
| Cocina | Cola de pedidos y ajustes de inventario |

## Reglas importantes

- Un pedido pasa por **pendiente → en preparación → entregado → pagado**. Se puede cancelar mientras no se haya entregado, y solo se edita mientras está pendiente.
- Al crear un pedido se descuenta del inventario lo que lleva la receta de cada producto. Si se cancela o se edita, se devuelve. Las notas como "sin cebolla" son solo indicaciones para cocina y **no ajustan el inventario**.
- La mesa queda libre cuando ya no tiene pedidos sin pagar.
- Las ventas solo cuentan pedidos entregados y pagados, en la fecha del pago.
- La cuenta se puede imprimir de tres formas: una sola, en partes iguales o una hoja por comensal según lo que pidió cada uno.
- Los registros no se borran, se desactivan. La excepción son los productos que nunca se han vendido.
- El stock solo cambia con movimientos (pedidos o ajustes con motivo), así queda el historial de cada insumo.
- Todo se valida dos veces: en el formulario, para avisar al momento, y en la API, que es la que decide.

## Correr en local

Requisitos: Node 22 y Docker Desktop.

```bash
# 1. Base de datos
cp .env.example .env              # llenar las contraseñas y JWT_SECRET
docker compose up -d db           # MariaDB en localhost:3307

# 2. API
cd api
cp .env.example .env              # mismos datos de la BD
npm install
npm run dev                       # http://localhost:3000

# 3. Cliente
cd ../client
npm install
npm run dev                       # http://localhost:5173
```

Para probar desde la misma red: `npm run dev -- --host` y abrir la IP de la PC.

### Pruebas

Con la API corriendo:

```bash
cd api
npm test
```

## Variables de entorno

| Archivo | Para qué |
|---|---|
| `.env` (raíz) | Docker Compose: contraseñas de la BD, `JWT_SECRET` y `CORS_ORIGIN` |
| `api/.env` | Correr la API fuera de Docker durante el desarrollo |
| `client/.env.production` | URL de la API para el build de producción |

Cada uno tiene su `.env.example` con lo que lleva.
