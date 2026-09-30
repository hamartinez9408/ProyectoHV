# ADR-003: Verificación Asíncrona de Registros DNS MX con RabbitMQ para Correos Corporativos

> **Fase:** 2 · Diseño  
> **Estado:** Aceptado  
>
> **Decisión humana**
> - **Qué decidió Harold:** Desacoplar la validación de dominios de correo corporativo del ciclo de solicitud HTTP; verificar la existencia real de servidores de correo (registros DNS MX) de forma asíncrona mediante eventos en RabbitMQ antes de ordenar el despacho de cualquier Magic Link, protegiendo la cuota gratuita mensual de envíos SMTP.
> - **Qué ejecutó la IA:** Modelado del flujo de eventos asíncronos (`access.requested` -> `access.dns.validated`), especificación del adaptador `DnsJavaResolverAdapter` con cache local en Redis y respuesta HTTP 202 Accepted.
> - **Riesgo técnico asumido conscientemente:** El usuario experimenta una pequeña latencia asíncrona (1 a 3 segundos) entre el clic en el formulario y el envío efectivo del correo mientras se resuelven los registros DNS.
> - **Alternativas descartadas:** Resolución DNS síncrona en el hilo HTTP del controlador (puede tardar de 5 a 10 segundos ante DNS caídos o lentos, agotando los hilos del servidor Tomcat); validación sintáctica simple por expresiones regulares sin consulta DNS (permite que bots inyecten dominios ficticios agotando la cuota de 3,000 correos/mes de Resend en horas).

---

## 1. Contexto

Para evitar que curiosos o bots agoten la cuota de la capa gratuita del proveedor de correos transaccionales (Resend permite 3,000 correos/mes), el sistema exige que el evaluador ingrese un correo con dominio corporativo legítimo.

Sin embargo, las consultas a servidores DNS en internet para verificar registros MX están sujetas a fluctuaciones de red, latencias variables y timeouts de hasta 5–10 segundos. Ejecutar estas consultas de forma síncrona en el hilo de la petición HTTP provocaría saturación del pool de conexiones de Tomcat y una experiencia de usuario deficiente.

---

## 2. Alternativas Evaluadas

### Alternativa 1: Validación Síncrona en el Controlador REST
- **Ventajas:** Flujo lineal simple; el usuario recibe de inmediato la confirmación de si el dominio es válido.
- **Desventajas:** Hilos de Tomcat bloqueados esperando respuestas de sockets UDP/TCP hacia servidores DNS raíz; vulnerable a ataques de agotamiento de hilos (Slowloris/DoS) si un atacante envía peticiones con dominios cuyos DNS no responden.

### Alternativa 2: Validación Únicamente Sintáctica (Regex / RFC 5322)
- **Ventajas:** Ejecución en microsegundos en memoria sin tráfico de red.
- **Desventajas:** No valida si el dominio existe o tiene buzón; permite que atacantes envíen miles de correos a `test@dominio-inventado-999.xyz`, provocando miles de rebotes duros (*hard bounces*) que arruinan la reputación del dominio remitente y agotan la cuota mensual de Resend.

### Alternativa 3: Procesamiento Asíncrono con RabbitMQ y Cache en Redis — ELEGIDA
- **Ventajas:** El endpoint HTTP responde en < 50 ms con `202 Accepted`; la consulta DNS se delega a un consumidor en RabbitMQ con límite de concurrencia; los dominios ya validados se guardan en cache en Redis (TTL 24 h); el correo solo se envía si los registros MX están confirmados.
- **Desventajas:** Requiere gestionar un broker de mensajería (RabbitMQ) en la red Docker interna.

---

## 3. Decisión

Se adopta un **patrón de verificación asíncrona dirigida por eventos**:

1. **Recepción Rápida:** `AccessRestController` valida el formato sintáctico y descarta dominios en lista negra en memoria (`gmail.com`, `hotmail.com`, etc.).
2. **Persistencia Inicial:** Registra la solicitud en `access.requests` con estado `PENDING`.
3. **Publicación AMQP:** Publica `AccessRequestedEvent` en el exchange `access.events` de RabbitMQ y responde `202 Accepted`.
4. **Consumo y Resolución DNS:** El consumidor `DnsVerificationListener`:
   - Revisa si el dominio está en Redis (`dns:cache:{domain}`).
   - Si no está, consulta registros MX usando la biblioteca `dnsjava` con un timeout estricto de 3.0 segundos.
   - Si no tiene registros MX, actualiza el estado a `MX_INVALID` y audita el evento en MongoDB.
   - Si tiene registros MX, actualiza a `MX_VALID`, genera el grant en PostgreSQL y despacha el correo transaccional vía Resend.

---

## 4. Consecuencias

### Positivas
- Resuelve el vector de ataque **S-01** y mitiga el riesgo DoS **D-01** del modelo STRIDE.
- Los hilos del microservicio HTTP permanecen libres y receptivos.
- Cero rebotes de correo por dominios inexistentes, protegiendo la reputación del dominio emisor.

### Negativas / Deuda Técnica Aceptada
- El frontend debe manejar un estado de espera transitorio (`PENDING_VALIDATION`) mientras el mensaje se procesa en el broker.
