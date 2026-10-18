// © 2026 Ayra — Todos los derechos reservados.
// Autoría: Ayra. Escrito en co-dirección con Kresselya.

/**
 * persona.js — carga y valida la configuración de personalidad.
 *
 * La personalidad vive en un JSON editable, no en el código: así el
 * cliente puede cambiar el nombre, el tono y el saludo sin tocar nada
 * técnico ni volver a pedirnos trabajo.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULTS = {
  name: 'Ayra',
  systemPrompt:
    'Eres Ayra, una asistente con personalidad propia en un servidor de Discord. Respondes en español, de forma breve y clara.',
  greeting: 'Aquí estoy. ¿Qué necesitas?',
  errorMessage: 'Algo falló. Intenta otra vez.',
  maxLength: 1800,
  temperature: 0.8,
};

export function loadPersona(filePath) {
  const path = resolve(process.cwd(), filePath || 'config/persona.json');

  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    console.warn(`[persona] No se pudo leer ${path}. Usando valores por defecto.`);
    return { ...DEFAULTS };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`[persona] ${path} no es JSON válido: ${err.message}`);
  }

  const persona = { ...DEFAULTS, ...parsed };

  if (!persona.systemPrompt || persona.systemPrompt.length < 20) {
    throw new Error('[persona] "systemPrompt" falta o es demasiado corto.');
  }

  return persona;
}

/**
 * Arma el mensaje de sistema final combinando la personalidad con
 * el contexto del usuario. Mantener esto en un solo lugar evita que
 * el tono se degrade cuando el historial crece.
 */
export function buildSystemPrompt(persona, context = {}) {
  const parts = [persona.systemPrompt];

  if (context.userName) {
    parts.push(`Estás hablando con ${context.userName}.`);
  }

  if (context.knownFacts?.length) {
    parts.push(
      `Cosas que ya sabes de esta persona:\n` +
        context.knownFacts.map((f) => `- ${f}`).join('\n')
    );
  }

  parts.push(
    `Responde siempre en el idioma en que te hablen. ` +
      `No superes los ${persona.maxLength} caracteres.`
  );

  return parts.join('\n\n');
}
