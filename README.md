# EPMAPS · Registro de Lecturas de Agua

Aplicación Android de campo con React Native, **Expo SDK 57**, TypeScript y Expo Router. Registra visitas sin Internet, conserva borradores y fotografías, verifica consumo y sincroniza automáticamente sin reintentar POST ambiguos a ciegas. Se reutilizó el proyecto Expo existente; las rutas viven en **`src/app/`**, conforme a `AGENTS.md`.

## Ejecutar

Requisitos: Node **22.13 o superior** (Node 22.13+ para SDK 57; las pruebas con `node:sqlite` requieren una versión que lo incluya), npm, Android real o emulador preparado. No hay proyecto nativo escrito a mano.

```sh
npm ci
```

Copia `.env.example` a `.env` (PowerShell: `Copy-Item .env.example .env`):

```dotenv
EXPO_PUBLIC_API_URL=https://6adfc91b8e42963c8d5e5ce2.mockapi.io
```

```sh
npx expo start
# abrir en Android con a o escanear el QR con Expo Go compatible con SDK 57
npm run typecheck
npx expo lint
npm test
npx expo install --check
npx expo-doctor
```

Las variables `EXPO_PUBLIC_*` se incorporan al bundle y **no son secretos**. Reinicia Metro después de cambiarlas. Para instalar módulos nativos usa siempre `npx expo install <paquete>`. Si el cliente no contiene alguno de los módulos, genera una compilación propia; no agregues carpetas `android/` o `ios/` manualmente.

**Credenciales de demostración:** `EMP-001` / `Demo2026!`. SecureStore conserva únicamente el código autenticado, nunca la contraseña. La sesión local y las credenciales incluidas en código son exclusivas de la prueba: **no constituyen autenticación segura de producción**. MockAPI es público y no aplica autorización por empleado.

## Recorrido

Inicio → Nueva lectura → identificación y fecha → información del catastro → estado y lectura → fotografía/revisión → resumen y guardado. Puedes pausar desde cualquier paso. Al volver a Inicio o reabrir con sesión válida aparece el diálogo para continuar o descartar. La información se carga antes de navegar. Retroceso Android pausa sólo después de confirmación; volver al paso anterior no elimina datos.

Pendientes permite consultar y editar registros no enviados. El detalle de enviados es de sólo lectura. Historial filtra por período (Date Picker) y estado; integra las lecturas remotas del empleado sin fingir que fueron generadas localmente. Perfil cierra sesión y conserva las lecturas. Una preferencia de ayuda se conserva en AsyncStorage. La barra superior global muestra conexión, cantidad pendiente y actividad de sincronización, incluido login.

## Arquitectura

```text
src/app/                     rutas, layouts y pantallas
src/components/              kit neumórfico, tarjetas y formularios por paso
src/theme/design.ts          paleta, sombras dobles y campos hundidos
src/context/                 sesión, borrador transitorio y runtime
src/hooks/                   consultas y eventos de conectividad/ciclo de vida
src/services/                Axios, caché, archivos y sincronización
src/database/                esquema versionado y repositorios SQLite
src/types/                   modelos de dominio
src/utils/rules.ts           validación y cálculo centralizados
src/constants/               queryKeys jerárquicas y etiquetas de cola
docs/adr/                    nueve decisiones arquitectónicas
docs/demo/                   cuerpos JSON y procedimiento de carga manual
scripts/test-core.cjs        pruebas reales Node, sin dependencias adicionales
```

Los componentes originales no usados de la plantilla se conservaron; no intervienen en las rutas EPMAPS. El símbolo de agua de la interfaz y `assets/images/epmaps-icon.png` es original para esta implementación académica, **no el logotipo oficial**. Se puede regenerar en Windows con `powershell -ExecutionPolicy Bypass -File scripts/generate-brand.ps1`.

### Trazabilidad R1–R10

| Requisito | Implementación principal |
|---|---|
| R1 sesión | `context/SessionContext.tsx`, `app/login.tsx`, `app/profile.tsx`, guardas en `app/_layout.tsx` |
| R2 código estricto | `utils/rules.ts`, `services/api.ts`, `components/MeterSearch.tsx`, `registration/Identification.tsx` |
| R3 consulta y caché | `services/meters.ts`, `services/queryClient.ts`, `hooks/useMeterLookup.ts`, `constants/queryKeys.ts`, tabla `meters` |
| R4 registro offline | `utils/rules.ts:toLocal`, `database/repository.ts`, `services/syncEngine.ts` |
| R5 estados condicionales | `registration/StateForm.tsx`, `utils/rules.ts:validateDraft/currentOf/toLocal` |
| R6 consumo/anomalía | `utils/rules.ts:consumption/validateDraft`, `registration/AnomalyNotice.tsx`, `services/syncEngine.ts` |
| R7 evidencia durable | `services/photos.ts`, `registration/PhotoForm.tsx`, `app/reading/[id].tsx` |
| R8 borradores recuperables | `context/RegistrationContext.tsx`, tabla `drafts`, `app/register/[step].tsx`, recuperación desde `app/index.tsx` |
| R9 cola automática | `hooks/useRuntime.ts`, `services/sync.ts`, `services/syncEngine.ts`, repositorio `claimReading/writeQueue` |
| R10 edición/unicidad | `database/schema.ts`, `saveReading/startEditing`, `app/reading/[id].tsx`, `findLogical`, Date Picker |

## Persistencia y caché

`epmaps.db` se abre con API asíncrona de expo-sqlite, WAL, claves foráneas y busy timeout. La migración v1 es transaccional y usa `PRAGMA user_version`. No se elimina ni se recrea la base en cada arranque.

- **readings:** identificador estable `clientId`, código, período, empleado, estado, JSON completo, intentos y próximo reintento. `UNIQUE(codigo,periodo)` es global al dispositivo, no por empleado. Los valores se enlazan como parámetros SQL.
- **drafts:** un borrador por empleado con campos, fotografía definitiva y paso. Se guarda **cada cambio**, serializando escrituras; avanzar, pausar y abrir cámara esperan la escritura. La barra de errores informa fallos de persistencia. Los borradores de edición actúan como reserva persistente: la cola no envía esa lectura mientras se revisa.
- **meters:** copia JSON validada de cada medidor consultado, con fecha de actualización.

TanStack Query usa vigencia de 12 horas y retención en memoria de 24 horas. `networkMode: always` permite resolver desde SQLite sin que Query deje la consulta en pausa offline. NetInfo controla `onlineManager`. No se realizan solicitudes de códigos inválidos. Si existe copia SQLite y falla la red, se devuelve la copia sin error de red. Tras reiniciar se consulta SQLite; no es necesario persistir toda la caché Query en AsyncStorage.

**La cola es SQLite, nunca la caché Query.** AsyncStorage sólo guarda ayuda de interfaz. SecureStore sólo guarda sesión. Context comparte estado transitorio y no sustituye persistencia.

## Reglas de negocio

- Código exacto `^MED-\d{6}$`, sin confundirlo con `id` de MockAPI. Cambiar el código borra datos visibles anteriores.
- Fecha válida local `YYYY-MM-DD`, no futura; período `YYYY-MM` derivado de esa misma fecha local, sin conversión UTC para agrupar el mes. El código y período de una lectura existente no se cambian al editar.
- Normal: lectura numérica obligatoria. Inaccesible: motivo obligatorio, lectura actual y consumo null. Dañado: descripción y fotografía obligatorias, lectura opcional.
- Número no negativo con hasta tres decimales; no se aceptan NaN, Infinity ni notación exponencial. Cambiar estado limpia campos excluyentes; el payload siempre envía null en los no aplicables.
- Consumo = actual − anterior; anomalía **estrictamente mayor** a promedio × 3. Igual al triple no es anomalía; promedio cero también se compara correctamente.
- Consumo negativo bloquea avance/guardado y requiere corrección. No se inventa una explicación de rollover.
- Anomalía exige foto existente y confirmación física. Cambiar lectura o estado reinicia la confirmación. Si cambia la lectura anterior al verificar remoto, se invalida la confirmación anterior.
- Sin catastro se permite guardar con `pending_verification`, anterior/consumo null. Al reconectar, se recupera el medidor y se ejecutan las mismas reglas antes de enviar. Si la fecha del dato previo es posterior a la visita se bloquea para revisión, evitando calcular una visita histórica contra una base futura.

React Hook Form utiliza `Controller`, `useWatch` y resolvers que llaman funciones puras; no se incorporó Zod, Redux ni otro gestor de validación/estado.

## Fotografías y permisos

Al tocar «Tomar fotografía» se pide permiso de cámara. Si se deniega se explica el motivo, se ofrece abrir configuración y se conserva el borrador; sólo se puede continuar sin foto cuando es opcional. No se solicita micrófono ni acceso a galería. `expo-image-picker` está configurado en `app.json`.

Cada captura se copia con **`await new File(uri).copy(destino)` (SDK57)** a `Paths.document/epmaps-photos/<clientId>-<timestamp>.jpg`. Sólo después de comprobar el archivo se guarda la URI definitiva en SQLite. Se recupera también `ImagePicker.getPendingResultAsync()` al restaurar el paso de fotografía tras destrucción de actividad Android. Se permite vista previa y reemplazo; quitar foto sólo si no es obligatoria. Quitar la asociación no borra inmediatamente los archivos anteriores para evitar pérdida de evidencia si una escritura falla; una política de limpieza de huérfanos es mejora futura.

El archivo permanece en documentos privados, no en caché temporal. No hay proveedor de almacenamiento remoto configurado: **`fotoUrl` es null**, `tieneFoto` indica evidencia local y la URI privada **no se envía** en JSON. Las fotos incluso de registros enviados permanecen en este dispositivo. Subida autenticada a almacenamiento de objetos, gestión de retención y respaldo son integraciones futuras. Desinstalar o borrar datos elimina lecturas y evidencia locales.

## Sincronización y protección contra duplicados

Se inicia con sesión activa al abrir con conexión, reconectar, volver a primer plano y cada 30 segundos mientras está activa. No depende de un botón. No se afirma ejecutar tareas cuando Android termina el proceso; se reanuda al abrir.

1. Mutex central impide ejecuciones simultáneas. Una transacción reclama cada fila comprobando estado y reserva de edición en SQLite.
2. Busca `clientId` y filtra coincidencias exactas; si ya está remoto, guarda su ID y marca `sent` sin otro POST.
3. Busca código/período exactos; otra identidad existente produce `conflict`, conservando el registro local y sin crear otra lectura.
4. Recupera catastro remoto, valida datos, calcula consumo y exige revisión humana si procede. Falta de medidor/anomalía no confirmada se conserva como `pending_verification` con razón visible.
5. Persiste `sending` **antes** de HTTP. El mismo `clientId`, generado una sola vez mediante randomblob SQLite de 128 bits, se conserva en cualquier intento.
6. Sólo respuesta con ID y clientId/código/período correctos confirma envío. Error o respuesta ambigua después de comenzar POST → `unknown_remote_result`; reabrir con `sending` también recupera como incierto.
7. Los inciertos se consultan automáticamente por clientId, **sin volver a POST ni siquiera si GET devuelve vacío**. Es una elección conservadora de integridad: si el POST nunca llegó, la lectura puede quedar retenida. No existe botón que fuerce un POST inseguro. Resolver ese caso exige investigar el servidor y una futura herramienta administrativa respaldada por un backend idempotente.
8. Fallos previos al POST quedan `error` con backoff de 30 segundos a 15 minutos. Falta de medidor/revisión y reconciliación tienen intervalos controlados. La lectura nunca desaparece al fallar un envío.

Estados: `pending_verification`, `pending_sync`, `sending`, `unknown_remote_result`, `sent`, `error`, `conflict`. Los dos estados transitorios/remotamente inciertos y `sent` bloquean edición; `sent` es sólo lectura incluso en el repositorio. Un borrador de edición se reserva transaccionalmente para evitar carrera con sincronización.

**Limitación explícita:** MockAPI no garantiza idempotencia ni unicidad transaccional. Dos dispositivos podrían pasar simultáneamente el preflight y crear duplicados. Producción requiere restricción única servidor `(codigoMedidor,periodo)`, clave idempotente `clientId`, transacciones, autenticación y reconciliación autorizada. Nunca se afirma garantía exactly-once desde el cliente.

## Modelo y preparación de MockAPI

Ambos recursos raíz existen pero respondieron `[]` en la inspección inicial del **2026-10-26**. No se han sembrado registros automáticamente ni se usan fixtures como respuestas reales. La colección vacía no permite comprobar su configuración de campos. Si un recurso falta, créalo en el panel como se describe en [`docs/demo/README.md`](docs/demo/README.md).

### `GET /medidores`

| Campos string | Campos number |
|---|---|
| `id`, `codigo`, `direccion`, `sector`, `numeroCuenta`, `estado`, `fechaUltimaLectura` | `ultimaLectura`, `consumoPromedioMensual` |

`id` generado por MockAPI; `codigo` como `MED-000001`. Fecha ISO válida. Valores previos/promedios finitos y no negativos. Búsqueda `?codigo=...` más comparación exacta; múltiples coincidencias exactas o modelo incompleto generan error, nunca datos inventados.

### `/lecturas`

| Tipo | Campos |
|---|---|
| string | `id` generado, `clientId`, `codigoMedidor`, `codigoEmpleado`, `periodo`, `fechaRegistro`, `estadoMedidor` (`normal`, `inaccesible`, `dañado`) |
| number o null | `lecturaActual`, `lecturaAnterior`, `consumoCalculado` |
| boolean | `consumoAnomalo`, `confirmacionAnomalia` |
| string o null | `motivoInaccesible`, `descripcionDanio`, `fotoUrl` |
| adicionales | `fechaVisita` string local, `tieneFoto` boolean, `fechaSincronizacion` string ISO opcional |

Los campos locales `status`, `photoUri`, `meter`, `error`, `attempts`, `nextAttempt` no forman parte del POST. La fecha confirmada de sincronización se conserva localmente tras confirmar el servidor. Axios tiene timeout de 15 s; no reintenta POST automáticamente. Si MockAPI responde 404 a un filtro vacío se consulta la colección completa para distinguir ausencia de resultados de ausencia del recurso.

Datos de ejemplo: [`docs/demo/medidores.json`](docs/demo/medidores.json), [`docs/demo/lecturas.json`](docs/demo/lecturas.json). El procedimiento manual **sólo añade códigos/identidades inexistentes**, nunca sobrescribe ni elimina datos. Incluye normal, >triple, inaccesible, dañado, medidor sin caché y registro existente del mes; ajustar fechas del ejemplo si se ejecuta en otro mes.

## Dependencias y ADR

Los ADR se redactaron y registraron **antes de instalar dependencias e implementar**, commit `f08c8c4`. Las tecnologías exigidas se identifican como decisiones del solicitante; las comparaciones y el código fueron elaborados con IA, sin inventar opiniones ni pruebas personales del estudiante.

| Dependencias incorporadas | Decisión |
|---|---|
| expo-sqlite, @react-native-async-storage/async-storage | ADR-001 |
| axios, @tanstack/react-query | ADR-002 |
| React Context y Router existentes | ADR-003 |
| expo-secure-store | ADR-009 (separada de la decisión ya documentada en ADR-003 antes de implementar) |
| funciones TypeScript, sin biblioteca nueva | ADR-004 |
| react-hook-form, @react-native-community/datetimepicker | ADR-005 |
| expo-image-picker, expo-file-system | ADR-006 |
| @react-native-community/netinfo | ADR-007 |
| @expo/vector-icons; eslint y eslint-config-expo (sólo desarrollo) | ADR-008 |

React, React Native, TypeScript, Expo y restantes dependencias originales de la plantilla se conservaron en sus versiones compatibles con SDK57. No se agregó biblioteca adicional de UI, estado o validación. `node:sqlite`, TypeScript y assert permiten probar sin instalar un framework de tests.

## Generar APK Android

`eas.json` incluye perfil `preview` con `distribution: internal`, `android.buildType: apk` y URL de API explícita. No se configuró un projectId ajeno ni se generaron carpetas nativas.

Con tu cuenta Expo y autorización para compilar:

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

Si `build:configure` propone cambios, conserva SDK57 y el perfil preview existente. Acepta la vinculación a **tu** proyecto y la creación de credenciales Android. Descarga el APK desde el enlace que entregue EAS. Con Android SDK/adb: `adb install ruta/al/archivo.apk`; alternativamente abre el enlace en el dispositivo y autoriza la instalación. No es necesario Xcode ni Android Studio para compilar en EAS. **No se afirma que el APK esté construido**: se dejó la configuración y no se inició un build cloud sin sesión EAS preparada.

## Verificaciones y limitaciones

Resultados reales y pruebas pendientes: [`docs/VERIFICACION.md`](docs/VERIFICACION.md). Las comprobaciones automatizadas validan reglas, migración SQLite real en Node y sincronización con puertos de transporte controlados; esos puertos sólo se usan en tests y **no sustituyen MockAPI en la aplicación**.

Android es el objetivo soportado. No se configuró SQLite/WASM ni SecureStore/FileSystem para web: `expo start --web` no es una alternativa funcional para validar el flujo nativo. Sombras dobles y elevation mantienen la identidad; sombras inset requieren Android compatible. Evaluación visual, permisos, cámara, modo avión, persistencia física tras reinicio e instalación del APK requieren un dispositivo/emulador preparado y no se presentan como pruebas realizadas.
