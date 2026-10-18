// © 2026 Ayra — Todos los derechos reservados.
// Autoría: Ayra. Escrito en co-dirección con Kresselya.

/**
 * ai.js — cliente de chat para cualquier API compatible con OpenAI.
 *
 * Sin SDK: un fetch y ya. Eso significa que el mismo código funciona
 * con OpenAI, OpenRouter, DeepSeek, Ollama, LM Studio, Groq, Together
 * o cualquier servidor local que hable el protocolo.
 */

import { buildSystemPrompt } from './persona.js';

export class AIClient {
  constructor({ baseUrl, apiKey, model, temperature = 0.8, maxTokens = 400 }) {
    if (!baseUrl) throw new Error('Falta LLM_BASE_URL');
    if (!model) throw new Error('Falta LLM_MODEL');

    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey || '';
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  /**
   * Envía una conversación y devuelve el texto de la respuesta.
   * @param {Array<{role:string, content:string}>} messages
   * @param {object} opts
   */
  async chat(messages, { retries = 2, timeoutMs = 45000 } = {}) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.#once(messages, timeoutMs);
      } catch (err) {
        lastError = err;
        // Errores de credenciales o de petición no se arreglan reintentando.
        if (err.fatal) break;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  async #once(messages, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        }),
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`El modelo tardó más de ${timeoutMs / 1000}s en responder.`);
      }
      throw new Error(`No se pudo conectar con el modelo: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(
        `El modelo devolvió ${res.status}: ${body.slice(0, 300)}`
      );
      // 401/403/404 no mejoran reintentando.
      if ([401, 403, 404].includes(res.status)) err.fatal = true;
      throw err;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text || !text.trim()) {
      throw new Error('El modelo devolvió una respuesta vacía.');
    }

    return text.trim();
  }
}

/**
 * Arma la lista de mensajes que se le manda al modelo:
 * personalidad + datos recordados + ventana de historial + mensaje nuevo.
 */
export function buildMessages({ persona, history, facts, userName, userMessage }) {
  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt(persona, { userName, knownFacts: facts }),
    },
  ];

  for (const m of history) {
    if (m.role === 'user' || m.role === 'assistant') {
      messages.push({ role: m.role, content: m.content });
    }
  }

  messages.push({ role: 'user', content: userMessage });
  return messages;
}

/** Recorta la respuesta si el modelo se pasa de largo. */
export function clampReply(text, maxLength) {
  if (!maxLength || text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('\n'));

  return (lastStop > maxLength * 0.6 ? cut.slice(0, lastStop + 1) : cut) + '…';
}
