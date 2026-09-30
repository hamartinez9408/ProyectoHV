---
name: hv-career-pipeline
description: Pipeline to parse, sanitize, and validate career data from C:\Personal\Gestion\profile\perfil-maestro.md into content/public.json and private Supabase records. Use when generating, updating, or validating career profile data, trajectory, skills, or achievements for the portfolio.
---

# HV-CAREER-PIPELINE — Pipeline de Datos de Carrera

Este skill automatiza y gobierna la ingestión de datos de carrera profesional asegurando cumplimiento con las reglas de privacidad y confidencialidad.

## Fuente de Verdad
La única fuente de verdad es:
`C:\Personal\Gestion\profile\perfil-maestro.md`

## Procedimiento de Transformación

1. **Lectura de la Fuente**:
   Leer las secciones de `perfil-maestro.md` (resumen, experiencia laboral, educación, proyectos, habilidades técnicas).

2. **Sanitización y Anonimización (Regla #0 y Lista Negra)**:
   - Eliminar cédula, fecha/año de nacimiento, edad, estado civil, dirección y foto.
   - Reemplazar los nombres de clientes por su descripción de sector. El mapa
     concreto vive en `.agents/rules/private/sector-map.txt` (gitignored), porque
     este repositorio es público y **el mapa desanonimiza el contenido**.

   - Omitir métricas confidenciales del producto SophieX.

3. **Generación de Salida**:
   - `content/public.json`: Commiteado en el repositorio para el nivel público.
   - Scripts SQL de semilla en `supabase/` para datos accesibles únicamente mediante autenticación con magic link (TTL 48h).

4. **Validación Determinista**:
   Ejecutar siempre el validador:
   ```bash
   node .agents/skills/hv-career-pipeline/scripts/validate-career-data.mjs content/public.json
   ```
