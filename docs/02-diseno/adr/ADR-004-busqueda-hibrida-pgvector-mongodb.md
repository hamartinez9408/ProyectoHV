# ADR-004: Búsqueda Semántica Híbrida con pgvector y Desacoplamiento de Auditoría en MongoDB Atlas

> **Fase:** 2 · Diseño  
> **Estado:** Aceptado  
>
> **Decisión humana**
> - **Qué decidió Harold:** Dotar al portafolio de capacidades modernas de búsqueda semántica (vectorial) para permitir a reclutadores consultar conceptos técnicos, ADRs y experiencias por intención en lenguaje natural; utilizar la extensión `pgvector` en Supabase; y desacoplar completamente el registro de auditoría forense hacia una base documental independiente (MongoDB Atlas M0 Free) con retención de 90 días por TTL index.
> - **Qué ejecutó la IA:** Especificación de la tabla `content.knowledge_vectors` con índice HNSW sobre distancia coseno, diseño del pipeline de embeddings (1536 dimensiones) y esquema documental para eventos inmutables en MongoDB.
> - **Riesgo técnico asumido conscientemente:** La generación de embeddings vectoriales requiere un paso previo en el pipeline de contenido o invocación a un modelo de embeddings durante la indexación; las consultas vectoriales se aceleran con HNSW pero consumen memoria compartida en PostgreSQL.
> - **Alternativas descartadas:** Desplegar un clúster de Elasticsearch u OpenSearch en la VM Oracle (descartado porque requiere > 2–4 GB de RAM dedicados exclusivamente a la JVM de Lucene, saturando la máquina de 12 GB); almacenar la auditoría en tablas de PostgreSQL (expuesta a manipulación si se produce una brecha en la capa relacional y compite por I/O con las consultas del sitio).

---

## 1. Contexto

Un portafolio técnico para un Líder Técnico debe demostrar dominio práctico de las arquitecturas de inteligencia artificial generativa y recuperación de información (RAG). Los motores de búsqueda léxica tradicionales basados en coincidencia de subcadenas (`ILIKE` o `tsvector` básico) fallan cuando un evaluador busca por conceptos semánticos abstractos (ej. buscar *"arquitectura tolerante a fallos"* debería recuperar experiencias con *"circuit breaker, RabbitMQ y réplicas de contingencia"*).

Adicionalmente, el sistema requiere registrar eventos de acceso, descargas y excepciones para cumplir con auditorías de seguridad y la Ley 1581 (Habeas Data). Mezclar estos logs en la base relacional principal degrada el rendimiento y debilita el aislamiento forense.

---

## 2. Alternativas Evaluadas

### Alternativa 1: Despliegue de Elasticsearch / OpenSearch en VM Oracle
- **Ventajas:** Potencia industrial en búsqueda全文 y agregaciones.
- **Desventajas:** Consumo masivo de memoria RAM (mínimo 2 a 4 GB para el proceso Java de ES); overhead de mantenimiento de índices y alta complejidad operativa en una VM de 12 GB compartida con 3 microservicios.

### Alternativa 2: Búsqueda Léxica Tradicional con `LIKE` / `ILIKE` en PostgreSQL
- **Ventajas:** Cero infraestructura adicional; costo computacional casi nulo.
- **Desventajas:** Incapacidad de comprender sinónimos, contexto o intenciones en lenguaje natural; experiencia de búsqueda rígida y obsoleta.

### Alternativa 3: Búsqueda Vectorial Híbrida con `pgvector` en Supabase + MongoDB Atlas para Auditoría — ELEGIDA
- **Ventajas:**
  - `pgvector` aprovecha la misma instancia de PostgreSQL gestionada por Supabase, sin consumir RAM en la VM Oracle.
  - El índice HNSW (`vector_cosine_ops`) proporciona búsquedas aproximadas de vecinos cercanos en < 15 ms.
  - MongoDB Atlas (capa Always Free M0) proporciona un almacén append-only especializado en documentos JSON, con índices TTL automáticos que purgan eventos viejos a los 90 días sin requerir scripts cron.
- **Desventajas:** Los vectores de 1536 floats requieren almacenamiento adicional en Postgres (~6 KB por chunk).

---

## 3. Decisión

Se adopta **`pgvector` en PostgreSQL** para la búsqueda semántica y **MongoDB Atlas** para el registro forense:

1. **Esquema Vectorial:** Tabla `content.knowledge_vectors` particionada lógicamente por `is_private` y protegida por RLS.
2. **Índice HNSW:**
   ```sql
   CREATE INDEX idx_knowledge_vectors_hnsw 
   ON content.knowledge_vectors 
   USING hnsw (embedding vector_cosine_ops)
   WITH (m = 16, ef_construction = 64);
   ```
3. **Auditoría Forense en MongoDB:**
   - La colección `audit_events` recibe documentos inmutables mediante inserciones no bloqueantes (`async` o vía RabbitMQ).
   - Índice TTL de expiración a 90 días:
     ```javascript
     db.audit_events.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 7776000 });
     ```

---

## 4. Consecuencias

### Positivas
- Resuelve el requerimiento no funcional **RNF-09** (purga a 90 días de la Ley 1581) de forma completamente nativa y desatendida mediante el índice TTL de MongoDB.
- El microservicio `search-service` ejecuta búsquedas semánticas de alto nivel con un consumo de recursos mínimo (0.40 OCPU / 1024 MB RAM).
- Aislamiento forense: una brecha en la aplicación no permite borrar ni modificar los registros históricos de auditoría en MongoDB Atlas.

### Negativas / Deuda Técnica Aceptada
- El pipeline de despliegue de contenido debe calcular los embeddings vectoriales antes de insertarlos en Supabase.
