# Verificaciones técnicas

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
