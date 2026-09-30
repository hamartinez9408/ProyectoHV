#!/usr/bin/env node
// check-code-metrics.mjs — Analizador estático de métricas de código para ProyectoHV
import { readFileSync, existsSync } from 'node:fs';

const targetFiles = process.argv.slice(2);

if (targetFiles.length === 0) {
  console.log('Uso: node check-code-metrics.mjs <archivo1> <archivo2> ...');
  process.exit(0);
}

let hasBlockingErrors = false;
let warningCount = 0;

for (const file of targetFiles) {
  if (!existsSync(file)) continue;

  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const totalLines = lines.length;

  console.log(`\n🔍 Analizando: ${file} (${totalLines} líneas)`);

  // 1. Verificar longitud de la clase / archivo
  if (totalLines > 300) {
    console.error(`  🔴 [LONGITUD CLASE] El archivo tiene ${totalLines} líneas (Límite máximo recomendado: 300 líneas). Evalúa dividir responsabilidades (SRP).`);
    hasBlockingErrors = true;
  } else if (totalLines > 200) {
    console.warn(`  🟡 [ALERTA CLASE] El archivo supera las 200 líneas (${totalLines}). Vigilar acoplamiento.`);
    warningCount++;
  }

  // 2. Análisis por líneas para Java
  if (file.endsWith('.java')) {
    let inMethod = false;
    let methodStart = 0;
    let methodName = '';
    let braceCount = 0;

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Detección de prints o stack traces prohibidos
      if (/e\.printStackTrace\(\)/.test(trimmed)) {
        console.error(`  🔴 [ERROR EXCEPCIÓN] Línea ${lineNum}: Prohibido 'e.printStackTrace()'. Usa logging estructurado (log.error).`);
        hasBlockingErrors = true;
      }
      if (/System\.(out|err)\.print/.test(trimmed)) {
        console.error(`  🔴 [ERROR LOG] Línea ${lineNum}: Prohibido 'System.out.println'. Usa Logger.`);
        hasBlockingErrors = true;
      }

      // Detección de catch genérico o vacío
      if (/catch\s*\(\s*Exception\s+[a-zA-Z0-9_]+\s*\)/.test(trimmed) && !trimmed.includes('// @allow-generic-catch')) {
        console.warn(`  🟡 [ALERTA EXCEPCIÓN] Línea ${lineNum}: Captura genérica de 'Exception'. Procura capturar tipos específicos o dejar que suba a @RestControllerAdvice.`);
        warningCount++;
      }

      // Detección aproximada de longitud de métodos
      if (!inMethod && /^\s*(public|protected|private|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*(\{|throws\b)/.test(line)) {
        inMethod = true;
        methodStart = lineNum;
        const match = line.match(/\s+(\w+)\s*\(/);
        methodName = match ? match[1] : 'metodo';
        braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      } else if (inMethod) {
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        if (braceCount <= 0) {
          const methodLength = lineNum - methodStart + 1;
          if (methodLength > 40) {
            console.error(`  🔴 [LONGITUD MÉTODO] '${methodName}' (líneas ${methodStart}-${lineNum}): ${methodLength} líneas. (Límite: 40 líneas). DEBE dividirse.`);
            hasBlockingErrors = true;
          } else if (methodLength > 20) {
            console.warn(`  🟡 [ALERTA MÉTODO] '${methodName}' (líneas ${methodStart}-${lineNum}): ${methodLength} líneas. Ideal: 5-20 líneas.`);
            warningCount++;
          }
          inMethod = false;
        }
      }
    });
  }

  // 3. Análisis para TypeScript / React
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      if (/:\s*any\b/.test(trimmed) && !trimmed.includes('// @allow-any')) {
        console.error(`  🔴 [ERROR TYPESCRIPT] Línea ${lineNum}: Uso de 'any'. Reemplazar por 'unknown' o tipo genérico.`);
        hasBlockingErrors = true;
      }
      if (/console\.log\(/.test(trimmed) && !trimmed.includes('// allow-console')) {
        console.warn(`  🟡 [ALERTA LOG] Línea ${lineNum}: 'console.log' detectado.`);
        warningCount++;
      }
    });
  }
}

console.log('\n----------------------------------------');
if (hasBlockingErrors) {
  console.error(`⛔ Falló la revisión de métricas y calidad de código (${warningCount} advertencias).`);
  process.exit(1);
} else {
  console.log(`✅ Revisión completada con éxito (${warningCount} advertencia(s)).`);
  process.exit(0);
}
