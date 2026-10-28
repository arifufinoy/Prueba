# Enviar visitas sin catastro y separar envío de verificación
Estado: aceptada por cambio explícito del solicitante. Fecha: 2026-10-27. Requisitos: R4, R6, R9, R10 y corrección posterior.
## Contexto
El solicitante pide retirar preparación de API y permitir crear la primera lectura aunque no exista un medidor. Esto modifica la regla inicial de verificar siempre antes del primer POST. También pide mostrar registros creados directamente en MockAPI.
## Alternativas
- Bloquear hasta cargar catastro: cumple el enunciado inicial pero contradice la corrección solicitada.
- Inventar medidor y lectura anterior: parece desbloquear, pero falsifica información de campo.
- Enviar visita con valores previos null y verificacionPendiente=true: conserva información real y separa recepción remota de verificación posterior.
## Decisión y justificación
Se adopta la tercera alternativa. Si no existe el código exacto, se envía la visita real a /lecturas sin crear un medidor ficticio. Se verifica posteriormente; si aparece anomalía se pide evidencia/revisión y se actualiza el mismo ID remoto con PUT, nunca con otro POST. Las anomalías conocidas bloquean el primer envío. Los enviados verificados siguen en sólo lectura. Se retiran herramientas de diagnóstico y siembra de la aplicación. **La visualización de lecturas remotas dentro de la app fue retirada después por ADR-012; el envío y la verificación de esta decisión siguen vigentes.**
## Consecuencias
Positivas: funciona con colecciones inicialmente vacías, sin inventar datos. Negativas: el servidor puede contener visitas recibidas aún no verificadas, cambio deliberado frente a R4 inicial.
## Riesgos o limitaciones
MockAPI debe conservar verificacionPendiente (boolean) y valores null; no ofrece unicidad transaccional. PUT sobre un ID conocido puede reintentarse sin crear otra lectura; POST incierto conserva reconciliación. Fotografía perdida no se fabrica ni se considera válida.
## Verificación
Pruebas de primer POST sin medidor, actualización posterior sin segundo POST, anomalía posterior, duplicados y timeout. No se afirma prueba física del dispositivo.
## Uso de IA
Cambio de política requerido por el solicitante; diseño y código por IA. Sin nuevas dependencias. Sustituye la preparación obligatoria de ADR-010, que se conserva como registro histórico.
