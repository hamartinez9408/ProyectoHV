# Checklist de DevOps: CI/CD, Docker, Seguridad y Observabilidad

## 1. Gates Bloqueantes de Pipeline CI/CD

El pipeline de GitHub Actions debe fallar inmediatamente y bloquear el despliegue ante cualquiera de estas condiciones:
- [ ] **Gate 0: Guardrails deterministas** (`run-guardrails.mjs` falla si hay referencias a clientes de Stefanini, datos de lista negra o tipo `any`).
- [ ] **Gate 1: Compilación y Tipado** (`tsc --noEmit` o `mvn compile` falla).
- [ ] **Gate 2: Pruebas Unitarias y Cobertura** (`mvn test` o `npm test` con cobertura < 80% líneas).
- [ ] **Gate 3: Análisis Estático** (SonarQube detecta code smells de severidad alta, bugs o vulnerabilidades de seguridad).
- [ ] **Gate 4: Verificación de Fuga de Secretos** (TruffleHog / GitGuardian detecta tokens o claves privadas).

## 2. Estándar de Seguridad en Dockerfiles

```dockerfile
# Multi-stage build para microservicios Spring Boot
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline -B
COPY src src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

### Reglas de Auditoría Docker:
- [ ] Multi-stage build para mantener la imagen final libre de herramientas de compilación.
- [ ] Ejecución explícita bajo un usuario sin privilegios (`USER appuser`).
- [ ] Variables de memoria en contenedores configuradas (`-XX:+UseContainerSupport`).
- [ ] Cero secretos o tokens inyectados mediante `ARG` o `ENV` en el build de la imagen.

## 3. Plan de Rollback Automatizado
- El pipeline CD debe incorporar un mecanismo de rollback probado que pueda revertir al commit/imagen anterior en **< 3 minutos**.
- Se debe haber ejecutado al menos un simulacro de fallo provocado para validar que el rollback automático funciona en la práctica.

## 4. Observabilidad y Monitoreo (Fase 6)
- **Trazabilidad Distribuida**: Generación y propagación de `X-Correlation-ID` en cada petición HTTP y mensaje de RabbitMQ.
- **Formato de Logs**: Salida a consola en formato JSON estructurado (timestamp, level, correlationId, service, message).
- **Métricas DORA en Vivo**: Registro automatizado de cada despliegue exitoso o fallido para alimentar el dashboard de métricas del portafolio.
- **Detección de Desviación (`spec-drift`)**: Verificación periódica de que los contratos OpenAPI y las tablas de base de datos coincidan con los ADRs aprobados.
