# 🔍 SonarQube Local — ProyectoHV

Entorno local de análisis estático de código para ProyectoHV utilizando Docker.

Permite validar la calidad del código, deuda técnica, cobertura, code smells, bugs y vulnerabilidades de seguridad antes de abrir un Pull Request o enviar cambios a CI.

---

## 🚀 Inicio Rápido

### 1. Iniciar SonarQube
Asegúrate de que Docker Desktop esté en ejecución y corre:
```bash
npm run sonar:up
```
O con Docker Compose directamente:
```bash
docker compose -f infra/sonar/docker-compose.yml up -d
```

### 2. Verificar estado
SonarQube tarda entre 30 y 60 segundos en iniciar la JVM y los servicios internos:
```bash
npm run sonar:status
```
O visita en tu navegador:
👉 **[http://localhost:9000](http://localhost:9000)**

> **Credenciales por defecto:**
> - Usuario: `admin`
> - Contraseña inicial: `admin` (solicitará cambio en el primer inicio de sesión).

### 3. Ejecutar Análisis Local
Para escanear el código del proyecto (frontend en `web/src`, scripts de `pipelines/` y `tools/`):
```bash
npm run sonar:scan
```
Si tu instancia requiere autenticación o tienes un token generado:
```bash
npm run sonar:scan -- --token=<TU_SONAR_TOKEN>
# o definiendo la variable de entorno:
# SONAR_TOKEN=<token> npm run sonar:scan
```

### 4. Configurar Reglas y Quality Gate
Aplica las reglas específicas de ProyectoHV (prohibición de `any`, longitud máx. 40 líneas por método, complejidad ≤ 15 y compuerta de cobertura ≥ 75%):
```bash
npm run sonar:rules
```

### 5. Ver los Resultados
Abre [http://localhost:9000/dashboard?id=proyectohv](http://localhost:9000/dashboard?id=proyectohv) para revisar el Quality Gate, code smells, duplicación y cobertura.

### 6. Detener el Contenedor
Cuando no lo estés usando, puedes apagar el contenedor para liberar recursos de tu máquina:
```bash
npm run sonar:down
```
Los datos, análisis previos y configuraciones quedan guardados en los volúmenes persistentes de Docker.

---

## 🛡️ Reglas y Quality Gate (`ProyectoHV-QualityGate`)

El Quality Gate bloquea la aprobación de código que no cumpla con los siguientes criterios:

- **Cobertura de Código**: **≥ 75%** en código nuevo (`new_coverage`), cobertura global (`coverage`) y ramas (`branch_coverage`).
- **Nuevas Infracciones**: `0` (filosofía *Clean as You Code*).
- **Duplicación de Código**: `< 3%`.
- **Hotspots de Seguridad**: `100%` revisados.

### Perfiles de Calidad:
- **`ProyectoHV-TypeScript`**: Prohíbe tipo `any`, métodos > 40 líneas, complejidad > 15, `console.log` y archivos > 300 líneas.
- **`ProyectoHV-JavaScript`**: Aplica límites de SRP (40 líneas) y complejidad cognitiva para scripts de build y pipelines.
- **`ProyectoHV-Java`**: Prohíbe `e.printStackTrace()`, `System.out`, catch genéricos de `Exception` y métodos > 40 líneas.

---

## 🛠️ Componentes y Configuración

- **`infra/sonar/docker-compose.yml`**: Orquesta el servicio de SonarQube (`sonarqube:community` v26) y el runner del scanner (`sonarsource/sonar-scanner-cli`).
- **`sonar-project.properties`**: Define la clave del proyecto (`proyectohv`), las rutas fuentes (`web/src,pipelines,tools`), exclusiones y rutas de reportes de cobertura (`web/coverage/lcov.info` y `services/*/target/site/jacoco/jacoco.xml`).
- **`infra/sonar/configure-quality-profiles.mjs`**: Script que sincroniza y activa las reglas y condiciones de Quality Gate en SonarQube.
- **`infra/sonar/run-scanner.mjs`**: Runner de Node que valida la salud del servicio y ejecuta el contenedor del escáner con autenticación automática.
- **Volúmenes persistentes**:
  - `proyectohv_sonarqube_data`: Base de datos embebida y configuraciones.
  - `proyectohv_sonarqube_extensions`: Plugins instalados.
  - `proyectohv_sonarqube_logs`: Logs de Elasticsearch, Web y Compute Engine.
