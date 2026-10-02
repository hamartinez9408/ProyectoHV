#!/usr/bin/env node
/**
 * @file run-scanner.mjs
 * @description Ejecuta el análisis de SonarQube Scanner usando Docker
 *              y apuntando al servidor local o remoto configurado.
 */

import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPOSE_FILE = resolve(__dirname, 'docker-compose.yml');
const TOKEN_CACHE_FILE = resolve(__dirname, '.sonar.token');
const SONAR_HOST_URL = process.env.SONAR_HOST_URL || 'http://localhost:9000';

async function waitForSonarReady(maxRetries = 24, delayMs = 5000) {
  process.stdout.write(`🔍 Verificando disponibilidad de SonarQube en ${SONAR_HOST_URL}... `);
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${SONAR_HOST_URL}/api/system/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'UP') {
          console.log('✅ Listo!');
          return true;
        } else {
          process.stdout.write(`[${data.status}] `);
        }
      }
    } catch {
      process.stdout.write('.');
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  console.log('\n❌ SonarQube no respondió a tiempo.');
  return false;
}

async function obtainLocalToken() {
  if (existsSync(TOKEN_CACHE_FILE)) {
    const cached = readFileSync(TOKEN_CACHE_FILE, 'utf-8').trim();
    if (cached) return cached;
  }

  // Probar credenciales conocidas (Accesos/Sonar.txt o admin:admin)
  const candidateCreds = [['admin', 'admin']];
  const accesosFile = resolve(__dirname, '../../Accesos/Sonar.txt');
  if (existsSync(accesosFile)) {
    try {
      const content = readFileSync(accesosFile, 'utf-8');
      const userMatch = content.match(/usuario>\s*(.+)/);
      const passMatch = content.match(/clave>\s*(.+)/);
      if (userMatch && passMatch && userMatch[1] && passMatch[1]) {
        candidateCreds.unshift([userMatch[1].trim(), passMatch[1].trim()]);
      }
    } catch {
      // ignore
    }
  }

  for (const [user, pass] of candidateCreds) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
      const tokenName = `local-scanner-${Date.now()}`;
      const res = await fetch(`${SONAR_HOST_URL}/api/user_tokens/generate?name=${tokenName}&type=USER_TOKEN`, {
        method: 'POST',
        headers: { Authorization: authHeader }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          writeFileSync(TOKEN_CACHE_FILE, data.token, 'utf-8');
          return data.token;
        }
      }
    } catch {
      // Silently continue to next candidate
    }
  }

  return null;
}

async function runScanner() {
  const args = process.argv.slice(2);
  let token = process.env.SONAR_TOKEN;

  for (const arg of args) {
    if (arg.startsWith('--token=')) {
      token = arg.split('=')[1];
    }
  }

  const isReady = await waitForSonarReady();
  if (!isReady) {
    console.error('\n⚠️ Asegúrate de haber iniciado el contenedor con:');
    console.error('   > npm run sonar:up\n');
    process.exitCode = 1;
    return;
  }

  if (!token) {
    token = await obtainLocalToken();
  }

  const composeArgs = [
    'compose',
    '-f', COMPOSE_FILE,
    'run',
    '--rm'
  ];

  if (token) {
    composeArgs.push('-e', `SONAR_TOKEN=${token}`);
  }

  composeArgs.push('sonar-scanner');

  if (token) {
    composeArgs.push(`-Dsonar.token=${token}`);
  }

  console.log('\n🚀 Iniciando análisis de SonarScanner en contenedor...');
  console.log(`📁 Directorio de análisis: /usr/src (mapeado a la raíz del repositorio)\n`);

  const proc = spawn('docker', composeArgs, {
    stdio: 'inherit',
    shell: true
  });

  proc.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Análisis de SonarQube completado exitosamente.');
      console.log(`📊 Consulta los resultados en: ${SONAR_HOST_URL}/dashboard?id=proyectohv\n`);
      process.exitCode = 0;
    } else {
      console.error(`\n❌ SonarScanner finalizó con código de error ${code}.`);
      if (!token) {
        console.warn('💡 Tip: Si SonarQube requiere autenticación, genera un token en la UI de SonarQube y pásalo:');
        console.warn('   npm run sonar:scan -- --token=<TU_TOKEN>');
        console.warn('   O define la variable de entorno SONAR_TOKEN.\n');
      }
      process.exitCode = code || 1;
    }
  });
}

runScanner().catch((err) => {
  console.error('Error al ejecutar el scanner:', err);
  process.exitCode = 1;
});
