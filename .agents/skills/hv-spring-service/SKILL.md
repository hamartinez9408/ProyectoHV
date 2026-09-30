---
name: hv-spring-service
description: Runbook and development guide for Java 21 Spring Boot microservices in services/ (access-service, cv-service, search-service). Covers Clean/Hexagonal Architecture, Jakarta Validation, DNS MX validation, RabbitMQ messaging, Redis caching, and JUnit 5/Mockito test suites. Use when scaffolding, coding, or testing backend microservices.
---

# HV-SPRING-SERVICE — Guía de Desarrollo Backend Java 21 Spring Boot

Este skill estandariza el desarrollo de los microservicios en `services/`.

## Microservicios del Proyecto
1. **`services/access`**:
   - Emisión y validación de Magic Links (JWT firmado / token criptográfico SHA-256).
   - Verificación de dominio corporativo comprobando registros MX en DNS.
   - Control de TTL (48 h) y máximo 2 extensiones automáticas con cooldown de 24 h.
   - Emisión de eventos a RabbitMQ para auditoría y notificaciones.
2. **`services/cv`**:
   - Entrega estructurada de trayectoria y experiencia para el portal privado.
3. **`services/search`**:
   - Integración con pgvector para búsqueda semántica de habilidades, tecnologías y proyectos.

## Procedimientos de Desarrollo
1. **Modelado Hexagonal**: Seguir la estructura descrita en [clean-spring-template.md](./references/clean-spring-template.md).
2. **Inmutabilidad**: Utilizar `records` de Java 21 para DTOs y Value Objects.
3. **Pruebas Unitarias**:
   - Usar JUnit 5 y Mockito.
   - Probar casos de borde: expiración de TTL, dominios inválidos sin MX, tokens reutilizados o manipulados.
4. **Ejecución de Pruebas**:
   ```bash
   ./mvnw test -pl services/access
   ```
