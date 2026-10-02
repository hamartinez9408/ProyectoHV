#!/usr/bin/env node
/**
 * @file sonar-gate.mjs
 * @description Verifica el estado del Quality Gate de SonarQube para ProyectoHV.
 *              Puede ejecutarse en local o en CI/CD como compuerta bloqueante.
 *
 * Salida:
 *   Exit 0: Quality Gate en estado OK / PASSED
 *   Exit 1: Quality Gate en estado ERROR / WARN o servicio no disponible
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SONAR_HOST_URL = process.env.SONAR_HOST_URL || 'http://localhost:9000';
const DEFAULT_PROJECT_KEY = SONAR_HOST_URL.includes('sonarcloud.io')
  ? 'hamartinez9408_ProyectoHV'
  : 'proyectohv';
const PROJECT_KEY = process.env.SONAR_PROJECT_KEY || DEFAULT_PROJECT_KEY;
const TOKEN_CACHE_FILE = resolve(__dirname, '../../infra/sonar/.sonar.token');

async function getAuthHeader() {
  let token = process.env.SONAR_TOKEN;

  if (!token && existsSync(TOKEN_CACHE_FILE)) {
    try {
      token = readFileSync(TOKEN_CACHE_FILE, 'utf-8').trim();
    } catch {
      // Ignorar error de lectura
    }
  }

  if (token) {
    return 'Basic ' + Buffer.from(`${token}:`).toString('base64');
  }

  // Si no hay token, intentar credenciales por defecto o anónimo
  return null;
}

async function checkQualityGate() {
  console.log(`[sonar-gate] Evaluando Quality Gate para el proyecto "${PROJECT_KEY}" en ${SONAR_HOST_URL}...`);

  const authHeader = await getAuthHeader();
  const headers = { 'Accept': 'application/json' };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const url = `${SONAR_HOST_URL}/api/qualitygates/project_status?projectKey=${encodeURIComponent(PROJECT_KEY)}`;

  try {
    const res = await fetch(url, { headers });

    if (!res.ok) {
      if (res.status === 404) {
        console.error(`❌ [sonar-gate] El proyecto "${PROJECT_KEY}" no ha sido analizado todavía en SonarQube.`);
        console.error('   Ejecuta primero un análisis con: npm run sonar:scan');
        process.exit(1);
      }
      if (res.status === 401 || res.status === 403) {
        console.error(`❌ [sonar-gate] Error de autenticación (${res.status}) consultando SonarQube.`);
        console.error('   Define la variable SONAR_TOKEN con un token válido.');
        process.exit(1);
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const status = data?.projectStatus?.status;
    const conditions = data?.projectStatus?.conditions || [];

    console.log(`[sonar-gate] Estado del Quality Gate: ${status}`);

    if (status === 'OK') {
      console.log('✅ [sonar-gate] Quality Gate superado satisfactoriamente.');
      for (const cond of conditions) {
        console.log(`   · [OK] ${cond.metricKey}: valor actual ${cond.actualValue} (umbral: ${cond.errorThreshold})`);
      }
      process.exitCode = 0;
      return;
    } else {
      console.error(`\n⛔ [sonar-gate] El Quality Gate FALLÓ (Estado: ${status}).`);
      for (const cond of conditions) {
        const condStatus = cond.status === 'OK' ? '✅' : '❌';
        console.error(`   ${condStatus} ${cond.metricKey}: actual ${cond.actualValue || 'N/A'}, umbral de error: ${cond.errorThreshold}`);
      }
      console.error('\n   El merge está BLOQUEADO hasta resolver los problemas de calidad señalados.');
      process.exitCode = 1;
      return;
    }
  } catch (err) {
    console.error(`❌ [sonar-gate] No se pudo conectar a SonarQube en ${SONAR_HOST_URL}: ${err.message}`);
    console.error('   Verifica que SonarQube esté en ejecución (npm run sonar:up) o que SONAR_HOST_URL sea correcta.');
    process.exitCode = 1;
    return;
  }
}

checkQualityGate();
