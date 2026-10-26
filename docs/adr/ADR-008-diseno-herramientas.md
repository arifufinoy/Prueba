# Implementar neumorfismo con primitivas nativas
Estado: aceptada. Fecha: 2026-10-26. Requisitos: R1–R10 e interfaz.
## Contexto
Android necesita sombras dobles, legibilidad y teclado.
## Alternativas
Biblioteca UI acelera pero aporta identidad genérica y dependencia; primitivas permiten control y exigen componentes propios.
## Decisión y justificación
React Native con sombras dobles y fallback elevation; @expo/vector-icons para identidad, safe-area-context ya existente. ESLint/config-expo son herramientas de desarrollo para verificación requerida, no dependencias de negocio.
## Consecuencias
Positivas: coherencia y tamaño contenido. Negativas: mantenimiento visual propio.
## Riesgos o limitaciones
Inset depende de versión Android; bordes mantienen jerarquía en versiones anteriores.
## Verificación
Tipos, lint y bundle; revisión visual Android pendiente.
## Uso de IA
Paleta del solicitante; componentes y comparación por IA. No se inventan evaluaciones del estudiante.
