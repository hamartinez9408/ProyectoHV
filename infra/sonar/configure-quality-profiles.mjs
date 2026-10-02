#!/usr/bin/env node
/**
 * @file configure-quality-profiles.mjs
 * @description Configura y aplica las reglas de validación estática y el Quality Gate
 *              de ProyectoHV en SonarQube según los estándares de arquitectura y código limpio.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SONAR_HOST_URL = process.env.SONAR_HOST_URL || 'http://localhost:9000';
const ACCESOS_FILE = resolve(__dirname, '../../Accesos/Sonar.txt');
const PROJECT_KEY = 'proyectohv';

function getCredentials() {
  let user = 'admin';
  let pass = 'Prometeo001*';

  if (existsSync(ACCESOS_FILE)) {
    try {
      const content = readFileSync(ACCESOS_FILE, 'utf-8');
      const uMatch = content.match(/usuario>\s*(.+)/);
      const pMatch = content.match(/clave>\s*(.+)/);
      if (uMatch?.[1]) user = uMatch[1].trim();
      if (pMatch?.[1]) pass = pMatch[1].trim();
    } catch {
      // Fallback a defaults
    }
  }

  return { user, pass, authHeader: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64') };
}

const { authHeader } = getCredentials();

async function api(path, options = {}) {
  const url = `${SONAR_HOST_URL}${path}`;
  const headers = {
    Authorization: authHeader,
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  return res;
}

async function getExistingProfiles() {
  const res = await api('/api/qualityprofiles/search');
  if (!res.ok) throw new Error(`Error al listar perfiles: ${res.statusText}`);
  const data = await res.json();
  return data.profiles;
}

async function ensureProfile(language, targetProfileName, baseProfileName = 'Sonar way') {
  const profiles = await getExistingProfiles();
  let existing = profiles.find((p) => p.language === language && p.name === targetProfileName);

  if (existing) {
    console.log(`  ℹ️ Perfil '${targetProfileName}' (${language}) ya existe.`);
    return existing;
  }

  const base = profiles.find((p) => p.language === language && p.name === baseProfileName);
  if (!base) {
    throw new Error(`No se encontró el perfil base '${baseProfileName}' para ${language}`);
  }

  console.log(`  ➕ Creando copia de '${baseProfileName}' -> '${targetProfileName}' (${language})...`);
  const res = await api(`/api/qualityprofiles/copy?fromKey=${base.key}&toName=${encodeURIComponent(targetProfileName)}`, {
    method: 'POST'
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fallo al copiar perfil: ${res.status} ${text}`);
  }

  const created = await res.json();
  return created;
}

async function activateRule(profileKey, ruleKey, severity, params = null) {
  let body = `key=${encodeURIComponent(profileKey)}&rule=${encodeURIComponent(ruleKey)}&severity=${severity}`;
  if (params) {
    body += `&params=${encodeURIComponent(params)}`;
  }

  const res = await api('/api/qualityprofiles/activate_rule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (res.status === 204 || res.status === 200) {
    console.log(`    ✅ Regla [${ruleKey}] activada (${severity}${params ? `, params: ${params}` : ''})`);
  } else {
    const text = await res.text();
    console.warn(`    ⚠️ No se pudo activar regla [${ruleKey}]: ${res.status} ${text}`);
  }
}

async function configureTypeScript(profile) {
  console.log('\n📘 Configurando Reglas de Validación TypeScript (Next.js / Frontend)...');
  
  // 1. Prohibición estricta de 'any'
  await activateRule(profile.key, 'typescript:S4204', 'BLOCKER');

  // 2. Funciones: Máximo 40 líneas de código (SRP)
  await activateRule(profile.key, 'typescript:S138', 'CRITICAL', 'max=40');

  // 3. Archivos / Clases: Máximo 300 líneas de código
  await activateRule(profile.key, 'typescript:S104', 'CRITICAL', 'maximum=300');

  // 4. Parámetros por función: Máximo 4 parámetros
  await activateRule(profile.key, 'typescript:S107', 'MAJOR', 'maximumFunctionParameters=4');

  // 5. Prohibición de console.log en código de producción
  await activateRule(profile.key, 'typescript:S106', 'MAJOR');

  // 6. Complejidad Cognitiva <= 15
  await activateRule(profile.key, 'typescript:S3776', 'CRITICAL', 'threshold=15');

  // 7. No operadores ternarios anidados
  await activateRule(profile.key, 'typescript:S3358', 'MAJOR');

  // 8. Limpieza de imports no utilizados
  await activateRule(profile.key, 'typescript:S1128', 'MINOR');

  // Establecer como default y vincular al proyecto
  await api(`/api/qualityprofiles/set_default?language=ts&qualityProfile=${encodeURIComponent(profile.name)}`, { method: 'POST' });
  await api(`/api/qualityprofiles/add_project?language=ts&qualityProfile=${encodeURIComponent(profile.name)}&project=${PROJECT_KEY}`, { method: 'POST' });
  console.log(`  ⭐ Perfil '${profile.name}' configurado como predeterminado para TypeScript.`);
}

async function configureJavaScript(profile) {
  console.log('\n📙 Configurando Reglas de Validación JavaScript (Tooling / Pipelines)...');

  // 1. Funciones: Máximo 40 líneas
  await activateRule(profile.key, 'javascript:S138', 'CRITICAL', 'max=40');

  // 2. Archivos: Máximo 300 líneas
  await activateRule(profile.key, 'javascript:S104', 'CRITICAL', 'maximum=300');

  // 3. Parámetros: Máximo 4
  await activateRule(profile.key, 'javascript:S107', 'MAJOR', 'maximumFunctionParameters=4');

  // 4. Prohibición de console.log directo en módulos no permitidos
  await activateRule(profile.key, 'javascript:S106', 'MAJOR');

  // 5. Complejidad Cognitiva <= 15
  await activateRule(profile.key, 'javascript:S3776', 'CRITICAL', 'threshold=15');

  // 6. No operadores ternarios anidados
  await activateRule(profile.key, 'javascript:S3358', 'MAJOR');

  // 7. Limpieza de imports no utilizados
  await activateRule(profile.key, 'javascript:S1128', 'MINOR');

  // Establecer como default y vincular al proyecto
  await api(`/api/qualityprofiles/set_default?language=js&qualityProfile=${encodeURIComponent(profile.name)}`, { method: 'POST' });
  await api(`/api/qualityprofiles/add_project?language=js&qualityProfile=${encodeURIComponent(profile.name)}&project=${PROJECT_KEY}`, { method: 'POST' });
  console.log(`  ⭐ Perfil '${profile.name}' configurado como predeterminado para JavaScript.`);
}

async function configureJava(profile) {
  console.log('\n☕ Configurando Reglas de Validación Java (Spring Boot / Microservicios)...');

  // 1. Métodos: Máximo 40 líneas
  await activateRule(profile.key, 'java:S138', 'CRITICAL', 'max=40');

  // 2. Archivos / Clases: Máximo 300 líneas
  await activateRule(profile.key, 'java:S104', 'CRITICAL', 'maximum=300');

  // 3. Parámetros por método: Máximo 4
  await activateRule(profile.key, 'java:S107', 'MAJOR', 'max=4');

  // 4. Prohibición de System.out y System.err (Usar Logger)
  await activateRule(profile.key, 'java:S106', 'MAJOR');

  // 5. Prohibición de printStackTrace() en producción
  await activateRule(profile.key, 'java:S4507', 'BLOCKER');

  // 6. Prohibición de catch genérico de Exception
  await activateRule(profile.key, 'java:S2221', 'CRITICAL');

  // 7. Prohibición de throw genérico de RuntimeException / Exception
  await activateRule(profile.key, 'java:S112', 'CRITICAL');

  // 8. Complejidad Cognitiva <= 15
  await activateRule(profile.key, 'java:S3776', 'CRITICAL', 'threshold=15');

  // 9. Tests deben tener aserciones
  await activateRule(profile.key, 'java:S2699', 'CRITICAL');

  // Establecer como default y vincular al proyecto
  await api(`/api/qualityprofiles/set_default?language=java&qualityProfile=${encodeURIComponent(profile.name)}`, { method: 'POST' });
  await api(`/api/qualityprofiles/add_project?language=java&qualityProfile=${encodeURIComponent(profile.name)}&project=${PROJECT_KEY}`, { method: 'POST' });
  console.log(`  ⭐ Perfil '${profile.name}' configurado como predeterminado para Java.`);
}

async function ensureGateCondition(gateName, metric, op, error) {
  const showRes = await api(`/api/qualitygates/show?name=${encodeURIComponent(gateName)}`);
  const showData = await showRes.json();
  const existingCond = showData.conditions.find((c) => c.metric === metric);

  if (!existingCond) {
    const res = await api(`/api/qualitygates/create_condition?gateName=${encodeURIComponent(gateName)}&metric=${metric}&op=${op}&error=${error}`, { method: 'POST' });
    if (res.ok) {
      console.log(`    ✅ Condición agregada: [${metric}] ${op} ${error}%`);
    } else {
      const txt = await res.text();
      console.warn(`    ⚠️ No se pudo agregar condición [${metric}]: ${res.status} ${txt}`);
    }
  } else if (existingCond.error !== String(error) || existingCond.op !== op) {
    const res = await api(`/api/qualitygates/update_condition?id=${existingCond.id}&metric=${metric}&op=${op}&error=${error}`, { method: 'POST' });
    if (res.ok) {
      console.log(`    🔄 Condición actualizada: [${metric}] ${op} ${error}%`);
    }
  } else {
    console.log(`    ℹ️ Condición [${metric}] ya configurada en ${op} ${error}%.`);
  }
}

async function configureQualityGate() {
  console.log('\n🛡️ Configurando Quality Gate de ProyectoHV...');
  const gateName = 'ProyectoHV-QualityGate';

  const listRes = await api('/api/qualitygates/list');
  const data = await listRes.json();
  const existing = data.qualitygates.find((g) => g.name === gateName);

  if (!existing) {
    console.log(`  ➕ Creando Quality Gate '${gateName}'...`);
    await api(`/api/qualitygates/create?name=${encodeURIComponent(gateName)}`, { method: 'POST' });
  } else {
    console.log(`  ℹ️ Quality Gate '${gateName}' ya existe.`);
  }

  // 1. Condiciones de calidad y seguridad deterministas (vigentes desde Slice 1)
  await ensureGateCondition(gateName, 'new_bugs', 'GT', 0);
  await ensureGateCondition(gateName, 'new_vulnerabilities', 'GT', 0);
  await ensureGateCondition(gateName, 'duplicated_lines_density', 'GT', 3.0);

  // 2. Cobertura: Se formaliza en Slice 4 con la suite de pruebas unitarias/E2E
  if (process.env.ENABLE_COVERAGE_GATE === 'true') {
    await ensureGateCondition(gateName, 'new_coverage', 'LT', 75);
    console.log('  🔒 Compuerta de cobertura activa (>= 75%).');
  } else {
    console.log('  ℹ️ Compuerta de cobertura diferida al Slice 4 (Fase 4: Pruebas y QA).');
  }

  // Asociar como default del sistema y vincular al proyecto
  await api(`/api/qualitygates/set_as_default?name=${encodeURIComponent(gateName)}`, { method: 'POST' });
  await api(`/api/qualitygates/select?gateName=${encodeURIComponent(gateName)}&projectKey=${PROJECT_KEY}`, { method: 'POST' });
  console.log(`  ⭐ Quality Gate '${gateName}' fijado como predeterminado para '${PROJECT_KEY}'.`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎯 Configuración de Perfiles de Calidad y Reglas en SonarQube');
  console.log('═══════════════════════════════════════════════════════════════');

  try {
    const tsProfile = await ensureProfile('ts', 'ProyectoHV-TypeScript');
    await configureTypeScript(tsProfile);

    const jsProfile = await ensureProfile('js', 'ProyectoHV-JavaScript');
    await configureJavaScript(jsProfile);

    const javaProfile = await ensureProfile('java', 'ProyectoHV-Java');
    await configureJava(javaProfile);

    await configureQualityGate();

    console.log('\n✅ Todas las reglas de validación han sido aplicadas con éxito en SonarQube.');
    console.log('🚀 Puedes ejecutar un nuevo escaneo con: npm run sonar:scan\n');
  } catch (err) {
    console.error('\n❌ Error al configurar perfiles de calidad:', err.message);
    process.exitCode = 1;
  }
}

main();
