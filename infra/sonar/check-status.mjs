#!/usr/bin/env node
/**
 * @file check-status.mjs
 * @description Verifica el estado del servidor SonarQube local.
 */

const SONAR_URL = process.env.SONAR_HOST_URL || 'http://localhost:9000';

async function checkSonarStatus() {
  const url = `${SONAR_URL}/api/system/status`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`⚠️ SonarQube respondió con código HTTP ${res.status}: ${res.statusText}`);
      process.exitCode = 1;
      return;
    }
    const data = await res.json();
    console.log(`\n✅ SonarQube responde en: ${SONAR_URL}`);
    console.log(`📊 Estado del sistema: ${data.status}`);
    console.log(`📦 Versión: ${data.version || 'desconocida'}`);

    if (data.status === 'UP') {
      console.log('🚀 El servidor está completamente listo para recibir análisis.\n');
    } else {
      console.log(`⏳ El servidor está en estado '${data.status}'. Espera unos instantes para que termine de inicializar.\n`);
    }
  } catch (err) {
    console.error(`\n❌ No se pudo conectar a SonarQube en ${SONAR_URL}.`);
    console.error(`   Causa: ${err.message}`);
    console.error(`   Asegúrate de que el contenedor esté corriendo con:\n   > npm run sonar:up\n`);
    process.exitCode = 1;
  }
}

checkSonarStatus();
