# Checklist de Pruebas: Cobertura, Calidad de Aserciones y Casos de Borde

## 1. Pirámide de Pruebas para ProyectoHV

```
        /   E2E Tests   \         (Playwright: Flujo completo de solicitud, magic link y portal privado)
       /─────────────────\
      / Integration Tests \       (Testcontainers: PostgreSQL real + RabbitMQ real + WireMock para DNS)
     /─────────────────────\
    /     Unit Tests        \     (JUnit 5 + Mockito + AssertJ para Java / Vitest para Frontend)
   /─────────────────────────\
```

## 2. Gates de Cobertura Obligatorios

| Métrica | Umbral Mínimo | Alcance |
|---|---|---|
| **Line Coverage** | **≥ 80%** | Paquetes de dominio y aplicación en microservicios Java (`services/**`) y librerías clave en frontend (`web/**`). |
| **Branch Coverage** | **≥ 75%** | Lógica condicional, validaciones de seguridad, bifurcaciones de TTL y manejo de errores. |

## 3. Matriz de Casos de Borde Obligatorios (Flujo de Acceso)

Toda suite de pruebas del `access-service` DEBE probar explícitamente:
1. **Expiración de TTL**:
   - Token válido a $47\text{h} 59\text{m}$.
   - Token rechazado a $48\text{h} 00\text{m} 01\text{s}$ arrojando `MagicLinkExpiradoException` con respuesta HTTP 410 / ProblemDetail.
2. **Límite de Extensiones**:
   - Extensión 1 permitida si han pasado > 24 h de cooldown.
   - Extensión 2 permitida.
   - Extensión 3 **bloqueada** (tope alcanzado).
   - Intento de extensión dentro del cooldown de 24 h rechazado.
3. **Validación de Dominio y DNS MX**:
   - Dominio corporativo con MX válido -> Genera token y evento RabbitMQ.
   - Dominio público no corporativo (gmail.com, hotmail.com, etc.) -> Rechazado o requiere flujo de aprobación manual.
   - Dominio con servidor DNS inalcanzable o sin registros MX -> Arroja `DominioSinRegistrosMxException` con HTTP 422.
4. **Resistencia a Replay y Brute-Force**:
   - Intento de reusar un token de magic link de un solo uso -> Rechazado inmediatamente.
   - Intento de adivinar tokens -> Rate limit activado tras 5 intentos fallidos por IP.

## 4. Higiene y Calidad de Aserciones
- **Prohibido**: Tests sin aserciones (`assertNotNull` o `assertEquals`).
- **Prohibido**: "Tautologías de mock" (probar únicamente que un mock devolvió lo que el propio test le dijo que devolviera, sin validar transformaciones de datos ni lógica de negocio).
- **Aserciones Robustas**: Usar AssertJ: `assertThat(resultado).isNotNull().satisfies(...)`.
