# MedInfo

Aplicación móvil (iOS, Android y web) para consultar información sobre medicamentos:
posología, efectos adversos, contraindicaciones, advertencias, embarazo y **comprobación de interacciones** entre varios fármacos.

> ⚠️ MedInfo es una herramienta informativa. No sustituye el consejo de un médico o farmacéutico.

## Funcionalidades

- **Búsqueda tolerante**: por marca (Dalsy, Advil), principio activo (ibuprofeno), nombre en inglés (acetaminophen) o con erratas (ibuprofemo). Sin tildes ni mayúsculas.
- **Ficha técnica oficial** organizada en secciones plegables: indicaciones, posología, contraindicaciones, efectos adversos, interacciones, advertencias, embarazo y sobredosis. Con enlace al documento original y fecha de revisión.
- **Comprobador de interacciones** para hasta 10 medicamentos: gravedad (contraindicada / grave / moderada / leve), qué hacer y el texto literal de la ficha técnica que lo respalda. Detecta también duplicidades de principio activo.
- **Guardados** y **búsquedas recientes**, solo en el dispositivo.
- **Funciona sin conexión** con las fichas ya consultadas (avisa si la copia está desactualizada).
- Modo claro/oscuro, lectores de pantalla y objetivos táctiles ≥ 44 pt.

## Fuentes de datos

| Fuente | Uso | Idioma |
|---|---|---|
| [CIMA – AEMPS](https://cima.aemps.es) | Principal: fichas técnicas autorizadas en España | Español |
| [openFDA](https://open.fda.gov) | Complementaria: fichas de EE. UU. | Inglés (sin traducir) |
| Tabla curada local (`src/data/local/`) | Gravedad de interacciones relevantes y diccionario de nombres | — |

El contenido clínico **no se redacta en la app**: se muestra tal cual lo publican las agencias.
Ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) para el detalle.

## Puesta en marcha

Requisitos: Node 20+.

```bash
cd medinfo
npm install
npx expo start          # escanea el QR con Expo Go, o pulsa a / i / w
```

| Comando | Qué hace |
|---|---|
| `npm test` | Tests unitarios (Jest) |
| `npm run typecheck` | Comprobación de tipos TypeScript |
| `npm run lint` | ESLint |
| `npx expo export --platform web` | Compila la versión web en `dist/` |
| `npx eas-cli@latest build` | Compila para tiendas (requiere cuenta Expo) |

## Estructura

```
src/
├── app/                 Pantallas (Expo Router, enrutado por archivos)
│   ├── (tabs)/          Buscar · Interacciones · Guardados · Información
│   └── medicamento/[id] Ficha del medicamento
├── domain/              Tipos del dominio (independientes de fuentes y UI)
├── data/
│   ├── remote/          Clientes HTTP y adaptadores de CIMA y openFDA
│   ├── local/           Diccionario de principios activos y tabla de interacciones
│   ├── cache/           Caché persistente con caducidad
│   └── repositories/    Orquesta fuentes, caché y modo sin conexión
├── services/            Lógica pura: búsqueda/normalización e interacciones
├── state/               Contextos: inyección de servicios y datos del usuario
├── hooks/               Peticiones cancelables, debounce
├── ui/                  Tema y componentes
└── __tests__/           Tests unitarios
```
