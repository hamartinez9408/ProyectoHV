# ADR-001: Adoptar Arquitectura Hexagonal (Ports & Adapters) en Microservicios Java 21

> **Fase:** 2 · Diseño  
> **Estado:** Aceptado  
>
> **Decisión humana**
> - **Qué decidió Harold:** Exigir Arquitectura Hexagonal estricta para todos los microservicios backend en Java 21 (`access-service`, `cv-service`, `search-service`), garantizando que la lógica de negocio y las reglas de dominio sean 100% agnósticas de frameworks y bases de datos.
> - **Qué ejecutó la IA:** Definición del estándar de empaquetado (`domain`, `application`, `infrastructure`), interfaces de puertos de entrada/salida y contratos de aislamiento.
> - **Riesgo técnico asumido conscientemente:** Mayor número de clases, interfaces y mapeos DTO ↔ Dominio (mayor boilerplate inicial), compensado por una testeabilidad unitaria sin mocks complejos y total desacoplamiento de infraestructura.
> - **Alternativas descartadas:** Arquitectura en capas tradicional Controller-Service-Repository (frecuentemente acopla entidades JPA al controlador y debilita el aislamiento de negocio); arquitectura dirigida por eventos pura (Event Sourcing) que introduce complejidad innecesaria para el volumen del portafolio.

---

## 1. Contexto

ProyectoHV requiere microservicios backend robustos que evidencien competencias de liderazgo técnico senior en el ecosistema Java enterprise. En desarrollos convencionales de Spring Boot, es habitual observar acoplamiento prematuro entre el framework (anotaciones `@RestController`, `@Service`, `@Transactional`), el motor de persistencia (anotaciones JPA `@Entity`, `@Table`) y las reglas del negocio.

Esto produce modelos anémicos y dependencias circulares que dificultan la migración de tecnologías, encarecen las pruebas unitarias y oscurecen la lógica de autorización.

---

## 2. Alternativas Evaluadas

### Alternativa 1: Arquitectura en Capas Tradicional (Controller-Service-Repository)
- **Ventajas:** Rápido desarrollo inicial; estándar ubicuo en tutoriales; menor número de clases.
- **Desventajas:** Fuga constante de conceptos de infraestructura (JPA, HTTP) hacia la capa de negocio; las entidades de base de datos se exponen a menudo directamente a la API; testing unitario dependiente de mocks pesados de Spring.

### Alternativa 2: Arquitectura Hexagonal (Ports & Adapters) — ELEGIDA
- **Ventajas:** Aislamiento total del núcleo (`domain`); el negocio no sabe si corre en Spring Boot, Quarkus o en consola CLI; puertos clarifican los contratos con terceros (DNS, SMTP, Postgres, Mongo); pruebas unitarias puras y ultrarrápidas sin levantar contexto de Spring.
- **Desventajas:** Mayor número de clases y adaptadores; requiere mapeadores explícitos entre modelos de base de datos, DTOs y modelos de dominio.

### Alternativa 3: Event Sourcing y CQRS Completo (Axon Framework)
- **Ventajas:** Reconstrucción temporal de estados e inmutabilidad estricta.
- **Desventajas:** Complejidad accidental desproporcionada para el dominio de portafolio y gestión de accesos; mayor consumo de memoria en la VM ARM.

---

## 3. Decisión

Se adopta **Arquitectura Hexagonal (Ports & Adapters)** para los microservicios en Java 21 bajo la siguiente estructura modular:

```
com.proyectohv.<service>/
├── domain/                  <-- PURE JAVA (Sin Spring, sin JPA)
│   ├── model/               <-- Entidades y Value Objects inmutables (records)
│   ├── exception/           <-- Excepciones puras de dominio
│   └── service/             <-- Servicios de dominio con lógica pura
├── application/             <-- CASOS DE USO
│   ├── port/
│   │   ├── in/              <-- Interfaces de Casos de Uso (Inbound Ports)
│   │   └── out/             <-- Interfaces de Salida a Infraestructura (Outbound Ports)
│   └── usecase/             <-- Implementación orquestadora de los casos de uso
└── infrastructure/          <-- ADAPTADORES CONCRETOS
    ├── adapter/
    │   ├── in/
    │   │   ├── web/         <-- Spring MVC RestControllers, DTOs y ProblemDetail
    │   │   └── amqp/        <-- RabbitMQ Listeners y Consumers
    │   └── out/
    │       ├── persistence/ <-- Spring Data / JdbcClient PostgreSQL Adapters
    │       ├── dns/         <-- DnsJava MX Resolver Adapter
    │       ├── notification/<-- Resend SMTP Adapter
    │       └── audit/       <-- MongoDB Atlas Adapter
    └── config/              <-- Spring Configuration (@Configuration, Bean definitions)
```

---

## 4. Consecuencias

### Positivas
- El núcleo de negocio (`domain`) tiene **cero dependencias externas**, permitiendo que las pruebas unitarias ejecuten en milisegundos.
- Cambiar de proveedor de correo (ej. de Resend a SendGrid o AWS SES) solo requiere escribir un nuevo adaptador en `infrastructure.adapter.out.notification`, sin tocar una sola línea de lógica de negocio.
- Código auto-documentado y alineado con los estándares del skill [`hv-review-code`](../../../.agents/skills/hv-review-code/SKILL.md).

### Negativas / Deuda Técnica Aceptada
- Necesidad de mantener mapeadores (ej. `AccessGrantMapper`) para convertir entre filas relacionales de PostgreSQL y entidades de dominio inmutables.
