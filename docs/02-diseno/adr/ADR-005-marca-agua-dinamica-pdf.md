# ADR-005: Estamping Forense de Marca de Agua Dinámica en Exportación de CV

> **Fase:** 2 · Diseño  
> **Estado:** Aceptado  
>
> **Decisión humana**
> - **Qué decidió Harold:** Proteger la propiedad intelectual de la trayectoria profesional y prevenir filtraciones no autorizadas de las expectativas salariales; exigir que toda descarga del CV en formato PDF desde el nivel privado incorpore una marca de agua forense visible e invisible vinculada unívocamente al evaluador que la solicitó (correo, ID de grant y fecha exacta de descarga); ejecutar la estampación exclusivamente en el backend.
> - **Qué ejecutó la IA:** Diseño del motor de estamping con Apache PDFBox en `cv-service`, inyección de metadatos forenses XMP y registro correlacionado en MongoDB Atlas.
> - **Riesgo técnico asumido conscientemente:** El estamping dinámico añade procesamiento en CPU (~150 a 300 ms por documento) en `cv-service`, mitigado mediante el uso de plantillas base pre-renderizadas en memoria donde solo se inyecta la capa de marca de agua sobre las páginas.
> - **Alternativas descartadas:** Generación estática previa de un único PDF para todos los evaluadores (carece de trazabilidad y expone el documento a difusión descontrolada sin posibilidad de identificar la fuente); inyección de la marca de agua en el navegador con bibliotecas JavaScript como `jsPDF` (fácilmente eludible abriendo las herramientas de desarrollador y eliminando la capa de agua antes de imprimir o guardar).

---

## 1. Contexto

El CV detallado disponible en el nivel privado contiene información estratégica de carrera: expectativas salariales, disponibilidad de contratación, decisiones arquitectónicas sensibles y detalles de diseño técnico.

Si un evaluador o competidor descarga este documento y lo reenvía o filtra a terceros, Harold necesita contar con un mecanismo de disuasión y atribución forense incontestable que pruebe fehacientemente qué usuario y en qué instante exacto descargó esa copia.

---

## 2. Alternativas Evaluadas

### Alternativa 1: Archivo PDF Estático Único en Netlify / S3
- **Ventajas:** Descarga inmediata sin consumo de CPU backend; aprovechamiento de CDN.
- **Desventajas:** Cero atribución. Si el archivo se filtra en redes sociales o foros de reclutamiento, es imposible determinar qué evaluador violó la confidencialidad.

### Alternativa 2: Marca de Agua en el Cliente (JavaScript / Canvas / CSS)
- **Ventajas:** Cero procesamiento en el servidor.
- **Desventajas:** Extremadamente inseguro. Cualquier usuario con conocimientos básicos puede inspeccionar el DOM, eliminar la clase CSS de la marca de agua o deshabilitar el script de Canvas antes de descargar.

### Alternativa 3: Estamping Dinámico en Backend con Apache PDFBox — ELEGIDA
- **Ventajas:** **Inviolable en el cliente.** El servidor toma una plantilla PDF base y le aplica una capa gráfica superpuesta (*overlay*) con texto en diagonal semitransparente que contiene el correo corporativo del evaluador, el identificador único de su grant y la fecha ISO 8601; adicionalmente, inyecta metadatos criptográficos XMP ocultos en la cabecera del archivo binario.
- **Desventajas:** Requiere procesar el documento en tiempo de descarga en `cv-service`.

---

## 3. Decisión

Se adopta **estamping dinámico en el servidor (`cv-service`) utilizando Apache PDFBox**:

1. **Capa Visible (Visual Forensics):**
   - Texto repetido en diagonal con rotación de -45°:
     `"CONFIDENCIAL — Concedido a: [email_corporativo] | Grant: [grant_id] | [fecha_utc]"`
   - Opacidad del 15% (canal alfa 0.15) para no dificultar la lectura del contenido curricular pero resistir capturas de pantalla o impresiones.
2. **Capa Invisible (Metadata Forensics):**
   - Propiedades XMP en el diccionario de información del PDF:
     - `xmp:CreatorTool`: `"ProyectoHV Forensic Watermark Engine v1.0"`
     - `xmp:Identifier`: `grant_id`
     - `xmp:Recipient`: `SHA-256(email)`
3. **Flujo de Ejecución:**
   ```
   [Request GET /api/v1/cv/export/pdf]
            │
            ▼
   [Verificar RLS / Cookie de Sesión]
            │
            ▼
   [Cargar Template PDF Base en Memoria (RAM)]
            │
            ▼
   [Inyectar Capa Watermark con Datos del Grant]
            │
            ▼
   [Registrar Evento CV_DOWNLOADED en MongoDB]
            │
            ▼
   [Stream Binario Directo a Respuesta HTTP 200]
   ```

---

## 4. Consecuencias

### Positivas
- Resuelve directamente la amenaza **R-01 (Repudio)** del modelo STRIDE.
- Alto poder disuasorio: el evaluador sabe que su correo corporativo está visiblemente impreso en cada página del documento.
- Si el documento se filtra, el `grant_id` permite rastrear en MongoDB Atlas la dirección IP, el User-Agent y el historial de navegación exacto del evaluador responsable.

### Negativas / Deuda Técnica Aceptada
- Consumo de ~50 MB de memoria temporal en heap JVM por solicitud de generación concurrente, acotado por el límite de 768 MB RAM de `cv-service`.
