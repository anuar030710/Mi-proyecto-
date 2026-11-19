# Arquitectura de MedInfo

## Objetivos

1. **Fiabilidad de la información**: solo fuentes oficiales, texto sin modificar, fuente y fecha siempre visibles.
2. **Búsqueda eficiente** y tolerante a cómo escribe la gente.
3. **Arquitectura escalable**: añadir fuentes, pantallas o idiomas sin tocar el resto.

## Tecnología

- **Expo SDK 58 + React Native + TypeScript estricto**: un solo código para iOS, Android y web.
- **Expo Router**: navegación basada en archivos y enlaces profundos (`medinfo://medicamento/cima:80298`).
- **AsyncStorage**: caché y datos del usuario en el dispositivo.
- **Jest (jest-expo)**: tests unitarios.

Sin librerías de estado ni de peticiones adicionales: React Context + un hook `useAsync` cancelable bastan para este alcance
y mantienen el número de dependencias bajo. Si la app crece (sincronización, cuentas), el punto natural de cambio es
sustituir `useAsync` por TanStack Query sin modificar repositorios ni pantallas.

## Capas

```
 Pantallas (src/app)  ──►  hooks  ──►  DrugRepository  ──►  CimaClient ─► CIMA (AEMPS)
        │                                   │          └──►  OpenFdaClient ─► openFDA
        │                                   └──►  Cache (AsyncStorage)
        └──►  services (lógica pura: búsqueda, interacciones)  ◄── data/local (diccionario, tabla curada)
```

- **domain**: tipos (`Drug`, `DrugSummary`, `Interaction`…). Ninguna otra capa depende de los formatos de las APIs.
- **data/remote**: un cliente + adaptador por fuente que traduce la respuesta al dominio.
  `http.ts` centraliza tiempo de espera (12 s), reintentos con espera exponencial para errores transitorios (red, 5xx, 429)
  y errores tipados (`DataError`) que la UI traduce a mensajes claros.
- **data/repositories**: único punto de acceso para la UI. Decide a qué fuentes preguntar, combina y ordena,
  gestiona la caché y el modo sin conexión. Se inyecta por contexto (`ServicesProvider`), lo que permite sustituirlo en tests.
- **services**: funciones puras y testeables (normalización de texto, reconocimiento de principios activos, interacciones).

## Búsqueda

1. Se espera 350 ms tras dejar de escribir y se cancela la petición anterior (evita resultados desordenados).
2. `resolveQuery` reconoce el principio activo: coincidencia exacta con nombre español, inglés o marca; prefijo único;
   o corrección de erratas (Levenshtein, tolerancia según longitud para evitar falsos positivos).
3. En paralelo: CIMA por nombre, CIMA por principio activo y openFDA (una consulta por término).
4. Se eliminan duplicados y se ordena: marca buscada → monofármacos del principio activo → combinaciones → resto.
5. Si una fuente falla, se muestran las demás con un aviso. Si fallan todas, se usa la última búsqueda guardada.

## Ficha del medicamento

- CIMA devuelve la ficha técnica segmentada (secciones 4.1–4.9 del formato europeo) en una sola petición.
  El HTML se convierte a párrafos de texto (`html.ts`): **no se renderiza HTML remoto**.
- openFDA devuelve texto en inglés que se divide por epígrafes. **No se traduce automáticamente** para no introducir
  errores en información clínica; se marca como "EN".
- Caché de 7 días. Sin red se sirve la copia caducada indicándolo con su fecha.

## Interacciones

Tres tipos de evidencia, de mayor a menor fiabilidad de la gravedad:

| Evidencia | Origen | Gravedad |
|---|---|---|
| Duplicidad | Mismo principio activo en dos productos | Grave (riesgo de sobredosis) |
| Curada | `data/local/curatedInteractions.ts` | Según la tabla |
| Ficha técnica | Mención del otro fármaco o de su grupo en la sección de interacciones | "Revisar" (no se infiere) |

La tabla curada trabaja a nivel de principio activo **o grupo** (AINE, IECA, ISRS…), así una entrada cubre muchos fármacos.
Las menciones se buscan con palabra completa y en ambos idiomas, por lo que funciona entre fichas de CIMA y openFDA.
La UI muestra siempre el texto literal de la ficha y avisa de que el análisis no es exhaustivo.

## Gobierno de datos

- **Tabla curada y diccionario**: cualquier cambio debe revisarlo un profesional sanitario (farmacéutico o médico)
  y contrastarse con la ficha técnica. Criterio de gravedad documentado en la cabecera del archivo.
  Los tests (`interactions.test.ts`) fijan el comportamiento esperado de casos clave.
- **Trazabilidad**: cada ficha muestra fuente, enlace al documento original y fecha de revisión.
- **Privacidad**: sin cuentas ni analítica. Solo se envía a las APIs el texto buscado.

## Cómo extender

- **Nueva fuente** (p. ej. una agencia latinoamericana): crear `data/remote/<fuente>.ts` con cliente + adaptador al dominio,
  añadir el prefijo de id y registrarlo en `DrugRepository`. La UI no cambia.
- **Nuevo idioma de la interfaz**: los textos están en las pantallas; extraerlos a un módulo i18n (p. ej. `expo-localization`).
- **Ampliar interacciones**: añadir entradas a la tabla (con revisión) y, si hace falta, grupos en `ingredients.ts`.

## Calidad

`npm test` (49 tests: normalización, reconocimiento de nombres, adaptadores de ambas fuentes, HTTP con reintentos y
tiempos de espera, repositorio con caché y modo sin conexión, interacciones, estado del usuario),
`npm run typecheck` y `npm run lint` deben pasar antes de integrar cambios.
