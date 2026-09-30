---
name: hv-diagram-archify
description: Generate standalone, interactive HTML/SVG architecture, sequence, and workflow diagrams for ProyectoHV exhibits using the Archify engine. Use when creating visual exhibits, HLD diagrams, access-flow sequence diagrams, or CI/CD pipelines to display on the web portfolio or documentation.
---

# HV-DIAGRAM-ARCHIFY — Generación de Diagramas para Exhibits Técnicos

Este skill conecta la potencia del motor **Archify** (ubicado en `~/.zcode/skills/archify`) para generar diagramas arquitectónicos y de flujo autocontenidos, interactivos y con soporte de temas claro/oscuro para los exhibits de ProyectoHV.

## Casos de Uso en ProyectoHV
1. **Flujo de Acceso Magic Link 48h**: Diagrama de secuencia (`sequence`) que ilustra la interacción entre usuario, frontend Next.js, access-service Java, validación DNS MX, RabbitMQ y notificador Lambda.
2. **Topología de Infraestructura C4**: Diagrama de arquitectura (`architecture`) que muestra la VM Oracle Cloud (2 OCPU / 12 GB), contenedores Docker, Supabase Postgres y MongoDB Atlas.
3. **Pipeline CI/CD**: Diagrama de flujo (`workflow`) con los 4 gates de calidad y despliegue a GHCR y VM.

## Flujo de Trabajo
1. Redactar la especificación en JSON según el esquema de Archify (`architecture`, `sequence`, o `workflow`).
2. Validar la especificación con calidad showcase:
   ```bash
   node C:\Users\harol\.zcode\skills\archify\bin\archify.mjs validate <tipo> <especificacion.json> --quality showcase --json
   ```
3. Generar el artefacto HTML autónomo:
   ```bash
   node C:\Users\harol\.zcode\skills\archify\bin\archify.mjs deliver <tipo> <especificacion.json> <salida.html> --quality showcase --json
   ```
