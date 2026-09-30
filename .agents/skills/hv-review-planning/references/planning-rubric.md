# Rúbrica de Auditoría: Fase 1 · Planificación y Viabilidad

## 1. Criterios de Evaluación Obligatorios (Gates)

| # | Dimensión | Criterio de Aceptación | Severidad si Falla |
|---|---|---|---|
| **P-1** | **Línea Base DORA** | Se declaran explícitamente metas y métricas de proceso para las 4 métricas DORA: Lead Time for Changes, Deployment Frequency, Change Failure Rate y Time to Restore. | 🔴 Bloqueante |
| **P-2** | **Modelo de Costos Citado** | Toda cifra de costo está respaldada por una fuente oficial citada y vigente (p. ej., Oracle Cloud Always Free 2 OCPU / 12 GB ARM; Supabase Free con pausa a 7 días y 0 backups; GitHub Actions en repos públicos vs privados). Costo total objetivo: < USD 3/mes. | 🔴 Bloqueante |
| **P-3** | **Decisión Humana Documentada** | Todo documento de viabilidad o roadmap incluye explícitamente la sección: `Decisión humana` (Qué decidió Harold, qué ejecutó la IA y qué riesgo técnico fue asumido conscientemente). | 🔴 Bloqueante |
| **P-4** | **Alineación con la Tesis del Exhibit** | El plan no describe únicamente la construcción de un sitio web, sino la documentación medible del impacto de la adopción intensiva de IA sobre el software delivery. | 🟡 Advertencia |
| **P-5** | **Estrategia DevOps Declarada** | Se define la matriz de calidad de pipelines (Lint -> Unit -> Integration/API -> SonarQube -> CD). | 🔴 Bloqueante |

## 2. Formato del Reporte de Revisión
Todo resultado debe presentarse en el siguiente formato estructurado:

```markdown
# 📋 Reporte de Revisión: Fase 1 · Planificación
- **Artefacto Evaluado:** <nombre del archivo>
- **Veredicto:** [APROBADO | APROBADO CON OBSERVACIONES | RECHAZADO]
- **Auditor:** hv-review-planning

## Evaluación de Criterios
- [x] P-1 Línea Base DORA: Cumple. Detalle: ...
- [x] P-2 Modelo de Costos: Cumple. Costo proyectado: $...
- [x] P-3 Decisión Humana: Cumple.
- [ ] P-4 Alineación Exhibit: Observación: ...

## Hallazgos y Acciones Requeridas
1. <Detalle accionable del hallazgo>
```
