# EPMAPS · Registro de Lecturas de Agua

**Flujo vigente (28-10-2026): En cola → Pendiente → Revisado.** El alta guarda exclusivamente código y fecha. El estado técnico de sincronización es independiente del estado del registro; consulta el recorrido actualizado abajo.

**Auditoría frente a la prueba académica:** [`docs/REVISION-RUBRICA.md`](docs/REVISION-RUBRICA.md) distingue implementación, pruebas ejecutadas y criterios que dependen de Android; no supone una calificación ni una instalación del APK. La revisión del 2026-10-27 incorpora las correcciones del documento sobre código duplicado, registros locales y el flujo Registros → Pendientes → Enviándose.

Aplicación Android de campo con React Native, **Expo SDK 57**, TypeScript y Expo Router. Registra visitas sin Internet, conserva borradores y fotografías, verifica consumo y sincroniza automáticamente sin reintentar POST ambiguos a ciegas. **La app muestra únicamente los registros guardados en el dispositivo; las lecturas existentes en MockAPI no se listan ni se copian a la interfaz.** El catastro se consulta por código exacto y se presenta con campos. Se reutilizó el proyecto Expo existente; las rutas viven en **`src/app/`**, conforme a `AGENTS.md`.

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

1. Inicio → Nueva lectura → código y fecha → Guardar registro. No se solicita estado, lectura ni foto en el alta.
2. El registro permanece **En cola** hasta confirmar su sincronización (también si falla una solicitud con Internet aparente). Al reconectar se envía automáticamente y pasa a **Pendiente**. No se crea un medidor ficticio en `/medidores`: se crea el registro de visita en `/lecturas`, con estado y lectura null.
3. Desde Pendientes o el detalle: **Registrar estado y lectura** → información del catastro → estado/lectura → evidencia y revisión → **Guardar como Revisado**. Se actualiza el mismo `clientId` e ID remoto con PUT. Las validaciones de lectura, foto y anomalía siguen vigentes.
4. **Editar registro pendiente** permite corregir la fecha dentro del mismo mes. Código y mes identifican el registro y no cambian después del alta. **Nueva lectura de este medidor** inicia otro registro, sin sobrescribir el anterior; sigue bloqueada una segunda lectura en el mismo mes.

Puedes pausar y recuperar los borradores. Los registros pendientes enviados siguen siendo editables porque aún no están revisados. Los revisados y enviados son de sólo consulta. Si completas una lectura sin red, queda Revisado localmente con su actualización por enviar; ambos estados se muestran por separado.

Pendientes incluye altas En cola, registros Pendientes de completar y actualizaciones por enviar. Registros contiene únicamente SQLite local. Inicio cuenta En cola, Pendientes y Revisados. La barra superior separa envíos pendientes de registros por completar. No se muestran listas remotas. Los registros de versiones anteriores sin `workflow` conservan sus datos y se tratan como lecturas completas; no se convierten en altas vacías.

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
docs/adr/                    catorce decisiones (incluidas las correcciones posteriores)
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

`epmaps.db` se abre con API asíncrona de expo-sqlite, WAL, claves foráneas y busy timeout. Las migraciones v1 y v2 son transaccionales y usan `PRAGMA user_version`; v2 conserva una tabla reservada para snapshots de versiones anteriores sin borrar lecturas existentes.

- **readings:** identificador estable `clientId`, código, período, empleado, estado, JSON completo, intentos y próximo reintento. `UNIQUE(codigo,periodo)` es global al dispositivo, no por empleado. Los valores se enlazan como parámetros SQL.
- **drafts:** un borrador por empleado con campos, fotografía definitiva y paso. Se guarda **cada cambio**, serializando escrituras; avanzar, pausar y abrir cámara esperan la escritura. La barra de errores informa fallos de persistencia. Los borradores de edición actúan como reserva persistente: la cola no envía esa lectura mientras se revisa.
- **meters:** copia JSON validada de cada medidor consultado, con fecha de actualización.
- **remote_snapshots:** tabla reservada de la migración v2. La aplicación actual no lista lecturas remotas; la caché operativa del catastro está en `meters` y la cola en `readings`.

TanStack Query usa vigencia de 12 horas y retención en memoria de 24 horas. `networkMode: always` permite resolver desde SQLite sin que Query deje la consulta en pausa offline. NetInfo controla `onlineManager`. No se realizan solicitudes de códigos inválidos. Si existe copia SQLite y falla la red, se devuelve la copia sin error de red. Tras reiniciar se consulta SQLite; no es necesario persistir toda la caché Query en AsyncStorage.

**La cola es SQLite, nunca la caché Query.** AsyncStorage sólo guarda ayuda de interfaz. SecureStore sólo guarda sesión. Context comparte estado transitorio y no sustituye persistencia.

## Reglas de negocio

- Código exacto `^MED-\d{6}$`, sin confundirlo con `id` de MockAPI. Cambiar el código borra datos visibles anteriores. **Al escribir un código válido se comprueba en el propio campo si ya existe una lectura local o remota para ese medidor y período; el botón Continuar se bloquea con el mensaje correspondiente.** La comprobación remota se repite al guardar.
- Fecha válida local `YYYY-MM-DD`, no futura; período `YYYY-MM` derivado de esa misma fecha local, sin conversión UTC para agrupar el mes. El código y período de una lectura existente no se cambian al editar.
- Normal: lectura numérica obligatoria. Inaccesible: motivo obligatorio, lectura actual y consumo null. Dañado: descripción y fotografía obligatorias, lectura opcional.
- Número no negativo con hasta tres decimales; no se aceptan NaN, Infinity ni notación exponencial. Cambiar estado limpia campos excluyentes; el payload siempre envía null en los no aplicables.
- Consumo = actual − anterior; anomalía **estrictamente mayor** a promedio × 3. Igual al triple no es anomalía; promedio cero también se compara correctamente.
- Consumo negativo bloquea avance/guardado y requiere corrección. No se inventa una explicación de rollover.
- Anomalía exige foto existente y confirmación física. Cambiar lectura o estado reinicia la confirmación. Si cambia la lectura anterior al verificar remoto, se invalida la confirmación anterior.
- Sin catastro se guarda y envía a `/lecturas`, con anterior/consumo null y `verificacionPendiente: true`. No se crea un medidor falso. Si después aparece el medidor, se verifica y se actualiza **el mismo ID remoto con PUT**, nunca otro POST. Si se descubre anomalía, se exige corrección, foto y revisión antes del PUT. Una fecha previa posterior a la visita bloquea la verificación.

React Hook Form utiliza `Controller`, `useWatch` y resolvers que llaman funciones puras; no se incorporó Zod, Redux ni otro gestor de validación/estado.

## Fotografías y permisos

Al tocar «Tomar fotografía» se pide permiso de cámara. Si se deniega se explica el motivo, se ofrece abrir configuración y se conserva el borrador; sólo se puede continuar sin foto cuando es opcional. No se solicita micrófono ni acceso a galería. `expo-image-picker` está configurado en `app.json`.

Cada captura se copia con **`await new File(uri).copy(destino)` (SDK57)** a `Paths.document/epmaps-photos/<clientId>-<timestamp>-<sufijo>.jpg`. Se comprueba antes de guardar la URI en SQLite. Al recuperar lecturas y borradores se busca también por nombre en la raíz actual de documentos si cambia el contenedor privado. Se recupera `ImagePicker.getPendingResultAsync()` tras destrucción de actividad Android. Se permite vista previa y reemplazo; quitar foto sólo si no es obligatoria. Si el archivo desapareció, se exige nueva captura; no se inventa evidencia.

El archivo permanece en documentos privados, no en caché temporal. No hay proveedor de almacenamiento remoto configurado: **`fotoUrl` es null**, `tieneFoto` indica evidencia local y la URI privada **no se envía** en JSON. Las fotos incluso de registros enviados permanecen en este dispositivo. Subida autenticada a almacenamiento de objetos, gestión de retención y respaldo son integraciones futuras. Desinstalar o borrar datos elimina lecturas y evidencia locales.

## Sincronización y protección contra duplicados

Se inicia con sesión activa al abrir con conexión, reconectar, volver a primer plano y cada 30 segundos mientras está activa. No depende de un botón. No se afirma ejecutar tareas cuando Android termina el proceso; se reanuda al abrir.

1. Mutex central impide ejecuciones simultáneas. Una transacción reclama cada fila comprobando estado y reserva de edición en SQLite.
2. Busca `clientId` y filtra coincidencias exactas; si ya está remoto, guarda su ID y marca `sent` sin otro POST.
3. Busca código/período exactos; otra identidad existente produce `conflict`, conservando el registro local y sin crear otra lectura.
4. Si falta catastro, envía la visita real con anterior/consumo null y `verificacionPendiente: true`. Una anomalía **conocida** sin revisión/foto bloquea el primer POST. Si se descubre después, bloquea el PUT hasta que se complete la revisión.
5. Persiste `sending` **antes** de HTTP. El mismo `clientId`, generado una sola vez mediante randomblob SQLite de 128 bits, se conserva en cualquier intento.
6. Sólo respuesta con ID y clientId/código/período correctos confirma envío. Error o respuesta ambigua después de comenzar POST → `unknown_remote_result`; reabrir con `sending` también recupera como incierto. La verificación posterior actualiza con PUT el mismo ID, incluso si se interrumpe y hay que reintentar la actualización.
7. Los inciertos se consultan automáticamente por `clientId`. Si el GET encuentra la fila, se reconcilia y no hay segundo POST. Si el GET confirma que no existe, se reintenta la creación con el **mismo** `clientId`; así una petición que no llegó se recupera y una respuesta perdida se reconcilia en el siguiente ciclo. No hay botón de POST inseguro. La unicidad absoluta sigue dependiendo de la consistencia de MockAPI.
8. Fallos previos al POST quedan `error` con backoff de 30 segundos a 15 minutos. Revisión y reconciliación tienen intervalos controlados. Una visita ya enviada sin catastro se vuelve a consultar sin recrearla. La lectura nunca desaparece al fallar.

Estados: `pending_verification`, `pending_sync`, `sending`, `unknown_remote_result`, `sent`, `error`, `conflict`. `sent` bloquea edición; si aparece anomalía después del envío inicial pasa a pendiente y permite corregir antes de actualizar el mismo ID. Un borrador de edición se reserva transaccionalmente.

**Limitación explícita:** MockAPI no garantiza idempotencia ni unicidad transaccional. Dos dispositivos podrían pasar simultáneamente el preflight y crear duplicados. Producción requiere restricción única servidor `(codigoMedidor,periodo)`, clave idempotente `clientId`, transacciones, autenticación y reconciliación autorizada. Nunca se afirma garantía exactly-once desde el cliente.

## Modelo y preparación de MockAPI

### Recursos vacíos y registros manuales en MockAPI

Registrar una visita de `MED-000123` **no requiere** registros previos en `/medidores` ni `/lecturas`: crea la visita en `/lecturas` con valores previos desconocidos como null. No crea un objeto en `/medidores` porque el registro de la visita no contiene dirección, sector, cuenta ni promedio; inventarlos comprometería el catastro. Cuando aparezca un medidor válido se verifica y actualiza el mismo registro remoto.

El 2026-10-27 se observaron realmente nueve medidores y tres lecturas en MockAPI. Ese contenido remoto **no se pinta en la app**: las lecturas de `/lecturas` no se cargan en Inicio ni en Registros, y el catálogo no se muestra como lista. El técnico consulta un medidor por código exacto y sólo ve sus campos; la app guarda y muestra exclusivamente los registros locales. Pendientes muestra la cola SQLite y Registros las lecturas de este dispositivo.

Se retiraron los botones de diagnóstico, la carga del catastro y la lista de lecturas remotas. Los archivos `docs/demo` son únicamente documentación para carga manual opcional de MockAPI, no datos embebidos ni respuestas simuladas. Consultas sin resultado se reconsultan al reconectar y el paso de información ofrece «Volver a consultar medidor». Una foto perdida no se considera válida aunque haya conexión.

### `GET /medidores`

| Campos string | Campos number |
|---|---|
| `id`, `codigo`, `direccion`, `sector`, `numeroCuenta`, `estado`, `fechaUltimaLectura` | `ultimaLectura`, `consumoPromedioMensual` |

`id` generado por MockAPI; `codigo` como `MED-000001`. Fecha ISO válida. Valores previos/promedios finitos y no negativos. Búsqueda `?codigo=...` más comparación exacta; múltiples coincidencias exactas o modelo incompleto generan error, nunca datos inventados.

### `/lecturas`

| Tipo | Campos |
|---|---|
| string | `id` generado, `clientId`, `codigoMedidor`, `codigoEmpleado`, `periodo`, `fechaRegistro`, `workflow` (`pending`, `reviewed`) |
| string o null | `estadoMedidor`: null al dar de alta; `normal`, `inaccesible` o `dañado` al completar |
| number o null | `lecturaActual`, `lecturaAnterior`, `consumoCalculado` |
| boolean | `consumoAnomalo`, `confirmacionAnomalia` |
| string o null | `motivoInaccesible`, `descripcionDanio`, `fotoUrl` |
| adicionales | `fechaVisita` string local, `tieneFoto` boolean, `verificacionPendiente` boolean para visita sin catastro |

Los campos locales `status`, `photoUri`, `meter`, `error`, `attempts`, `nextAttempt` no forman parte del POST. La fecha confirmada de sincronización se conserva localmente tras confirmar el servidor. Axios tiene timeout de 15 s; no reintenta un POST sin consultar antes `clientId`: si el GET confirma ausencia, reintenta la creación con la misma identidad; si encuentra la fila, reconcilia. Si MockAPI responde 404 a un filtro vacío se consulta la colección completa para distinguir ausencia de resultados de ausencia del recurso.

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
| Cambio solicitado: visita sin catastro y eliminación de diagnóstico (sin dependencias nuevas) | ADR-011; ADR-010 queda como decisión anterior sustituida |
| Cambio solicitado: app sólo con registros locales y sin listas de MockAPI | ADR-012 |
| Cambio solicitado: validación inline de código duplicado | ADR-013 |

React, React Native, TypeScript, Expo y restantes dependencias originales de la plantilla se conservaron en sus versiones compatibles con SDK57. No se agregó biblioteca adicional de UI, estado o validación. `node:sqlite`, TypeScript y assert permiten probar sin instalar un framework de tests.

## Generar APK Android

`eas.json` incluye perfil `preview` con `distribution: internal`, `android.buildType: apk` y URL de API explícita. El `projectId` EAS existente en `app.json` se conserva; no se generaron carpetas nativas.

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
