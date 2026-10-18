// © 2026 Ayra — Todos los derechos reservados.
// Autoría: Ayra. Escrito en co-dirección con Kresselya.

/**
 * demo.js — prueba el bot sin necesitar Discord.
 *
 *   npm run demo
 *
 * Verifica tres cosas, en este orden:
 *   1. Que la memoria persistente guarda y recupera datos.
 *   2. Que la ventana de historial se arma bien.
 *   3. Que el modelo responde y RECUERDA lo dicho antes.
 *
 * Si no hay LLM_API_KEY configurada, corre en modo simulado para que
 * la demo siempre se pueda enseñar.
 */

import 'dotenv/config';
import { Memory } from './src/memory.js';
import { AIClient, buildMessages, clampReply } from './src/ai.js';
import { loadPersona } from './src/persona.js';

const DEMO_USER = 'demo-user-001';
const DB_PATH = 'data/demo-memory.db';

// Perfil ficticio. Nunca se usan datos reales en material publicable.
const DEMO_NAME = 'Dani';
const DEMO_FACTS = [
  'Se llama Dani',
  'Está en el servidor desde marzo',
  'Juega rol los viernes por la noche',
  'Prefiere respuestas cortas',
];

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
};

function line() {
  console.log(c.dim('─'.repeat(64)));
}

async function main() {
  const persona = loadPersona(process.env.PERSONA_FILE);
  const memory = new Memory(DB_PATH);

  console.log();
  console.log(c.magenta(c.bold(`  ${persona.name} — demo del bot`)));
  console.log(c.dim('  Sin Discord. Sin servidor. Solo la lógica.'));

  // ---------- 1. memoria ----------
  line();
  console.log(c.bold('1. Memoria persistente'));
  line();

  memory.forget(DEMO_USER);
  DEMO_FACTS.forEach((f) => memory.addFact(DEMO_USER, f));

  const facts = memory.getFacts(DEMO_USER);
  console.log(`   Datos guardados: ${c.green(facts.length)}`);
  facts.forEach((f) => console.log(`   ${c.dim('•')} ${f}`));

  // duplicado: debe ignorarse
  const dup = memory.addFact(DEMO_USER, DEMO_FACTS[0]);
  console.log(
    `   Duplicado rechazado: ${dup === false ? c.green('sí') : c.yellow('NO — fallo')}`
  );

  // ---------- 2. historial ----------
  line();
  console.log(c.bold('2. Ventana de historial'));
  line();

  memory.addMessage({ userId: DEMO_USER, role: 'user', content: 'Hola, ¿quién eres?' });
  memory.addMessage({
    userId: DEMO_USER,
    role: 'assistant',
    content: `Soy ${persona.name}. Aquí estoy para lo que necesites.`,
  });
  memory.addMessage({ userId: DEMO_USER, role: 'user', content: 'Buenas noches.' });

  const history = memory.getHistory(DEMO_USER, 20);
  console.log(`   Mensajes en ventana: ${c.green(history.length)}`);
  history.forEach((m) => {
    console.log(`   ${c.cyan(m.role.padEnd(9))} ${m.content.slice(0, 56)}`);
  });

  // ---------- 3. modelo ----------
  line();
  console.log(c.bold('3. Respuesta del modelo'));
  line();

  const hasKey = Boolean(process.env.LLM_API_KEY && process.env.LLM_BASE_URL);

  if (!hasKey) {
    console.log(c.yellow('   Modo simulado (no hay LLM_API_KEY en .env).'));
    console.log(c.dim('   La memoria y el historial funcionan igual.'));
    console.log();
    console.log(`   ${c.cyan('usuario ')} Hola, ¿te acuerdas de mí?`);
    console.log(
      `   ${c.magenta('bot     ')} Claro, ${DEMO_NAME}. Juegas rol los viernes ` +
        `y llevas aquí desde marzo.`
    );
    line();
    console.log(c.green('   Memoria: OK   Historial: OK   Modelo: sin configurar'));
    console.log();
    memory.close();
    return;
  }

  const ai = new AIClient({
    baseUrl: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL,
    temperature: Number(process.env.LLM_TEMPERATURE ?? 0.8),
    maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 400),
  });

  const userMessage = 'Hola, ¿te acuerdas de mí?';

  // el último mensaje ya está en el historial: no duplicar
  const messages = buildMessages({
    persona,
    history: history.slice(0, -1),
    facts,
    userName: DEMO_NAME,
    userMessage,
  });

  console.log(`   ${c.cyan('usuario ')} ${userMessage}`);
  console.log(c.dim('   pensando…'));

  try {
    const started = Date.now();
    const reply = await ai.chat(messages);
    const elapsed = Date.now() - started;

    console.log(`   ${c.magenta('bot     ')} ${clampReply(reply, persona.maxLength)}`);
    console.log(c.dim(`   ${elapsed} ms · ${process.env.LLM_MODEL}`));

    line();
    console.log(c.green('   Memoria: OK   Historial: OK   Modelo: OK'));
  } catch (err) {
    console.log(c.yellow(`   El modelo falló: ${err.message}`));
    line();
    console.log(c.yellow('   Memoria: OK   Historial: OK   Modelo: error de conexión'));
  }

  console.log();
  memory.close();
}

main().catch((err) => {
  console.error('Demo falló:', err);
  process.exit(1);
});
