# Checklist y Estándar: Historias de Usuario (INVEST + BDD)

## 1. Evaluación INVEST

| Letra | Criterio | Pregunta de Control | Severidad |
|---|---|---|---|
| **I** | **Independent** | ¿La historia se puede desarrollar, probar y desplegar sin depender de otra historia en curso? | 🔴 Bloqueante |
| **N** | **Negotiable** | ¿Describe el objetivo y valor de negocio sin acoplarse prematuramente a una implementación interna? | 🟡 Advertencia |
| **V** | **Valuable** | ¿Genera valor medible para el evaluador técnico o visitante del portafolio? | 🔴 Bloqueante |
| **E** | **Estimable** | ¿Los límites y contratos de la historia son lo suficientemente claros para estimar su esfuerzo? | 🔴 Bloqueante |
| **S** | **Small** | ¿El alcance cabe dentro de una sola iteración de desarrollo (≤ 5 CFP en COSMIC)? | 🔴 Bloqueante |
| **T** | **Testable** | ¿Los criterios de aceptación son verificables de forma automatizada mediante tests? | 🔴 Bloqueante |

## 2. Formato BDD / Gherkin Obligatorio
Todo criterio de aceptación debe estructurarse con la sintaxis BDD:

```gherkin
Escenario: <Nombre descriptivo del caso de uso o borde>
  Dado <un estado o contexto inicial del sistema>
  Y <una precondición adicional si aplica>
  Cuando <ocurre una acción del usuario o evento del sistema>
  Entonces <el estado resultante observable>
  Y <las aserciones secundarias o códigos HTTP/errores esperados>
```

### Ejemplo Válido para ProyectoHV:
```gherkin
Escenario: Solicitud de acceso con dominio corporativo válido y registros MX
  Dado que un evaluador corporativo ingresa su correo "reclutador@techcorp.com"
  Y el dominio "techcorp.com" posee registros DNS MX válidos
  Cuando el evaluador envía el formulario de solicitud de acceso
  Entonces el sistema genera un token seguro con TTL de 48 horas
  Y publica un evento a RabbitMQ para despacho de Magic Link
  Y retorna una respuesta HTTP 202 Accepted estructurada
```

## 3. Estimación Asistida Dual
1. **COSMIC (ISO/IEC 19761)**: Medir tamaño funcional por movimientos de datos:
   - **E** (Entry): Datos que entran desde el exterior (ej. formulario de email).
   - **X** (Exit): Datos que salen al usuario (ej. confirmación, ProblemDetail).
   - **R** (Read): Datos leídos de base de datos o cache.
   - **W** (Write): Datos persistidos en base de datos o en cola.
   Total CFP = E + X + R + W. Historias con > 6 CFP deben dividirse.
2. **SNAP (IFPUG)**: Evaluar complejidad no funcional:
   - Criptografía / firmas JWT / SHA-256.
   - Consultas DNS externas asíncronas.
   - Políticas RLS dinámicas en base de datos.
