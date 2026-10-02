#!/usr/bin/env node
/**
 * @file check-status.mjs
 * @description Verifica si Jenkins Controller está arriba y respondiendo en el puerto configurado.
 */

const JENKINS_URL = process.env.JENKINS_URL || 'http://localhost:8088';

async function checkStatus() {
  console.log(`[jenkins-status] Comprobando disponibilidad de Jenkins en ${JENKINS_URL}...`);
  try {
    const res = await fetch(`${JENKINS_URL}/api/json`);
    if (res.ok) {
      console.log(`✅ [jenkins-status] Jenkins Controller está ACTIVO y respondiendo (HTTP ${res.status}).`);
      console.log(`   🔗 URL de acceso: ${JENKINS_URL}`);
      process.exit(0);
    } else {
      console.log(`⚠️ [jenkins-status] Jenkins respondió con código HTTP ${res.status}. Posible inicialización en curso.`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ [jenkins-status] Jenkins no está disponible en ${JENKINS_URL}: ${err.message}`);
    console.error('   Para iniciarlo, ejecuta: npm run jenkins:up');
    process.exit(1);
  }
}

checkStatus();
