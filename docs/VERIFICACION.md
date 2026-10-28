# Verificaciones técnicas

## Flujo en dos etapas — 2026-10-28

Vigente: alta con código y fecha → En cola hasta confirmar sincronización → Pendiente → completar estado/lectura/evidencia → Revisado. `workflow` (pending/reviewed) es independiente de `status` (transporte). Estado observado y lectura son null al dar de alta; no se supone un estado normal. Pendientes enviados se pueden editar y completar mediante PUT del mismo ID. Revisados enviados siguen inmutables. Una actualización revisada sin red se conserva localmente y se envía al reconectar. El código y mes permanecen fijos; se conserva UNIQUE(codigo,periodo) y la validación instantánea de fecha. Los registros anteriores sin workflow se conservan como lecturas completas. Las secciones anteriores describen comprobaciones históricas y no sustituyen este flujo.

Pruebas nuevas: alta mínima, offline/reconexión, permanencia en Pendiente sin revisión automática, finalización mediante PUT, finalización sin catastro, respuesta POST perdida, duplicado mensual y edición de fecha por PUT. Sin POST reales, APK ni pruebas físicas. Resultados finales se registran al cerrar la tarea.

## Validación inmediata de fecha — 2026-10-28

Se mantiene una lectura por medidor y mes, sin cambiar las reglas del valor leído. En Identificación se muestra el conflicto también bajo la fecha: distingue fecha exacta repetida de otra fecha del mismo mes. Los datos locales disponibles se comprueban de forma inmediata; con red se comprueba MockAPI de forma asíncrona y antes de continuar. La lectura en edición se excluye por clientId. Resultados: `npm test` 25/25, `npx tsc --noEmit` sin errores y `npx expo lint` sin incidencias. Sin APK ni prueba física. Este cambio se limita a la validación de fecha; no introduce el flujo separado En cola → Pendiente → Revisado.

## Corrección del documento de validaciones — 2026-10-27

- El campo «Código de medidor» del paso 1 valida si ya existe una lectura local o remota para ese `codigoMedidor` y `periodo`. Muestra el motivo bajo el campo y deshabilita Continuar; excluye el `clientId` en edición. La comprobación final se mantiene en `Summary` y en la sincronización.
- Se retiraron las listas de lecturas de MockAPI, la sección «Lecturas en MockAPI» de Inicio, los snapshots de lecturas y el catálogo completo de medidores. El catastro se sigue consultando por código exacto y se muestra con los siete campos.
- Inicio y la barra global usan el flujo Registros → Pendientes → Enviándose. Registros muestra sólo SQLite local; Pendientes muestra la cola y cuántos se están enviando.
- `npm test` 24/24 (incluye identidad mensual local excluyendo la edición), `npx tsc --noEmit`, `npx expo lint`, `npx expo install --check` y `npx expo-doctor` 21/21. No se generó APK ni se probó en dispositivo.

## Revisión del documento `prueba_I_Práctica.docx` — 2026-10-27

Matriz completa por requisito y pruebas pendientes en [`REVISION-RUBRICA.md`](REVISION-RUBRICA.md). Se corrigieron R2 (catálogo oculto y sin consultas cuando el código parcial está escrito), R4 (guardar sin red marca `pending_verification`, con o sin copia local), R7 (desaparición de foto opcional no bloquea una lectura normal) y una ventana R9 que trataba como POST incierto una reclamación SQLite anterior a cualquier llamada HTTP. Una reserva efímera protege de la edición concurrente y se libera al terminar el ciclo. `npm test`, `npx expo lint`, `npx tsc --noEmit` y `npx expo-doctor` se volvieron a ejecutar; resultados finales se indican al cerrar esta revisión.

Sesión EAS autenticada como `arifufinox` y proyecto `@arifufinox/Prueba` disponible. Build APK `preview` **iniciado**, ID `7f1fd388-4111-4183-b0f3-3e0cbea27956`; [logs](https://expo.dev/accounts/arifufinox/projects/Prueba/builds/7f1fd388-4111-4183-b0f3-3e0cbea27956). Aún no se confirma finalización/instalación. `git remote -v` no devuelve URL; el enlace de repositorio solicitado por el documento sigue pendiente de publicación. El emulador mostró `offline` antes de intentar arrancarlo; no se atribuyen pruebas nativas sin confirmación posterior.

**Aclaración posterior del solicitante:** el APK lo construirá él mismo después. Se ejecutó `npx eas-cli@latest build:cancel 7f1fd388-4111-4183-b0f3-3e0cbea27956 --non-interactive` y EAS confirmó **Build canceled**. No se continuará con compilación ni instalación. `npx eas-cli@latest build --platform android --profile preview` queda para el estudiante. El intento de arrancar emulador terminó y no se usó para afirmar que la aplicación pasó pruebas físicas.

**Resultado final de comprobaciones de código tras esta revisión:** `npm test` 24/24 (incluye R2 sin red para código inválido, R9 con reconciliación por `clientId` y reintento sólo tras GET de ausencia, y R10 con identidad mensual local), `npx expo lint` sin incidencias, `npx tsc --noEmit` sin errores, `npx expo install --check` compatible con SDK 57, `npx expo-doctor` 21/21. No se generó APK ni se ejecutaron pruebas físicas por alcance acordado. `git remote -v` sigue sin remoto. Las pruebas de avión, permisos, borradores tras reinicio y fallo de POST real no se ejecutaron; la sincronización absolutely exactly-once no se puede garantizar con MockAPI.

## Cambio solicitado: envío sin catastro y visualización de MockAPI — 2026-10-27

> Esta visualización remota fue sustituida por ADR-012 y por la corrección posterior: la app ya no lista lecturas de MockAPI. El envío sin catastro y la verificación con PUT siguen vigentes.

- GET reales (sólo lectura): `/medidores` respondió 9 filas: 6 códigos MED y 3 códigos `codigo n` creados manualmente; `/lecturas` respondió 3 filas con empleados `codigoEmpleado n`, períodos `periodo n` y códigos `codigoMedidor n`. No eran visitas de EMP-001 ni cumplían el formato de período. Nunca se sobrescribieron ni se eliminaron.
- Se retiraron los botones y servicios de diagnóstico/carga de catastro. Una visita nueva sin medidor ahora se publica en `/lecturas` con anterior y consumo null y `verificacionPendiente`. Verificación posterior usa PUT al mismo ID. No se fabrica ni se publica un medidor incompleto.
- Inicio e Historial combinan lecturas SQLite y remotas por ID/clientId; Historial ya no abre filtrado por mes/empleado. Consulta muestra el catálogo remoto e identifica datos manuales inválidos. Snapshot SQLite de las respuestas remotas para uso offline tras reinicio.
- Resolución conservadora de fotografías al cambiar la raíz de documentos: sólo acepta archivo existente y no sustituye evidencia desaparecida. El registro de la captura del usuario aún debe corregirse si el archivo físico ya no está.
- `npm test`: 22 comprobaciones controladas, sin POST a MockAPI real, incluyendo primera visita remota sin catastro, PUT posterior sin duplicado, tres registros Faker visibles, migración v2 que conserva lecturas y foto reubicada.
- TypeScript y lint; Expo Doctor y bundle Android se volvieron a ejecutar. No se afirma instalación, ejecución en el emulador del usuario ni recepción remota de su visita concreta.

**Las secciones siguientes conservan el historial de verificaciones previas.** Las instrucciones antiguas de carga de ejemplos quedaron sustituidas por ADR-011 y ya no describen la interfaz actual.

## Corrección de API/catastro — 2026-10-27

- Inspección real de ambos GET: `[]`. La URL coincide con la captura; no hubo un fallo de conectividad observado desde este entorno. Un esquema vacío no crea medidores.
- Se corrigió el mensaje que atribuía la falta de datos a Internet. Perfil ofrece diagnóstico real y carga **manual confirmada** de catastro académico, no fixtures como respuestas a consultas.
- Se eliminaron las 12 horas de frescura de búsquedas vacías, se habilitó su reconsulta al reconectar y se añadió reconsulta en información del medidor.
- La preparación omite códigos existentes, no carga lecturas de ejemplo y despierta sólo verificaciones pendientes, sin desbloquear resultados inciertos ni modificar clientId. No se realizaron POST remotos en esta corrección.
- `npm test`: **23 comprobaciones correctas**, incluyendo API vacía con respuesta 404 al filtrar, carga no destructiva, visita inaccesible del caso reportado, timeout de carga sin reintento y nombres de esquema inválidos.
- Verificación final de la corrección: `npm run typecheck`, `npx expo lint`, `npx expo install --check` y `npx expo export --platform android --output-dir dist` correctos. Bundle Android generado, no APK ni prueba de ejecución en dispositivo.
- La comprobación inicial de tipos detectó una referencia residual de plantilla a `/explore` y la variante array de boxShadow no admitida por TextInput. Se corrigieron la ruta y la representación nativa de la sombra sin eliminar archivos del usuario.
- No se probó el teléfono/emulador del solicitante ni se afirma que su lectura local ya se encuentre en MockAPI. La carga de ejemplos requiere confirmación en la app actualizada. Los cambios preexistentes en app.json (vinculación EAS) y el comentario del repositorio se conservaron.

Fecha: 2026-10-26. Ejecutadas por agente IA en Windows; no son pruebas personales del estudiante.

## Ejecutadas
- GET reales `/medidores` y `/lecturas`: `[]`. No se modificaron recursos remotos.
- `npx expo install --check`: dependencias compatibles con SDK57.
- `npx expo-doctor --verbose`: 21/21 comprobaciones correctas. Una primera ejecución simultánea con instalación reportó un fallo de versiones; la ejecución posterior completa lo resolvió sin cambiar SDK.
- `npx tsc --noEmit`: correcto.
- `npx expo export --platform android --output-dir dist`: bundle Hermes Android generado correctamente; **no equivale a un APK instalado ni prueba de ejecución nativa**.
- `npx expo config --type public`: SDK57, plugins, identidad Android y permisos revisados.
- `node scripts/test-core.cjs`: **18 comprobaciones correctas** de reglas puras, SQLite real de Node en memoria, frontera Axios y motor de sincronización con transporte inyectado, sin peticiones POST reales.
- `npx expo lint`: correcto, sin errores ni advertencias, después de corregir un hook de plantilla y reemplazar useForm.watch por useWatch.
- `npm audit --omit=dev --json`: 9 avisos (6 high, 3 moderate) en árbol Expo/CLI/Router/transitivos; algunas correcciones sugeridas cambian de SDK. No se aplicó `audit fix --force`, no se ocultaron avisos ni se cambió SDK57. Se requiere seguimiento de parches compatibles antes de producción.

## Pruebas que debe ejecutar el estudiante en Android
1. Ingresar, forzar cierre, reabrir: sesión conservada; cerrar sesión y comprobar nueva solicitud de credenciales.
2. Códigos inválidos no generan red; cambiar código elimina datos anteriores.
3. Consultar medidor real, activar avión, repetir; cerrar/reabrir offline y recuperar copia SQLite sin error de red.
4. Registrar medidor nunca consultado en modo avión; reiniciar y verificar lectura pending_verification y foto.
5. Recuperar borrador en cada paso, incluidos foto, estado y fecha. Cancelar retroceso no pierde nada.
6. Probar estados normal/inaccesible/dañado, exactamente triple, superior al triple, promedio cero y lectura menor.
7. Denegar cámara: explicación y configuración; opcional permite seguir, obligatoria retiene borrador. Capturar, reemplazar y reiniciar.
8. Reconectar con anomalía antes desconocida: esperar bloqueo humano, editar, confirmar y enviar.
9. Simular pérdida de conexión durante POST; inspeccionar clientId, unknown_remote_result y reconciliación sin POST nuevo.
10. Abrir/cerrar y alternar primer plano durante cola; no deben aparecer envíos concurrentes. Probar duplicado local y remoto mensual.
11. Guardar enviado y verificar que no existe edición. Revisar identidad visual, teclado, safe area y contraste en pantalla pequeña.
12. Con EAS configurado, generar e instalar APK preview y repetir fuera de Expo Go.

Pendiente: todas las pruebas físicas anteriores y construcción cloud del APK. La aplicación no puede garantizar idempotencia entre dispositivos ni conservar datos tras desinstalar; evidencia remota requiere integración externa futura.
