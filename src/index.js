// © 2026 Ayra — Todos los derechos reservados.
// Autoría: Ayra. Escrito en co-dirección con Kresselya.

/**
 * index.js — arranque del bot de Discord.
 */

import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  MessageFlags,
} from 'discord.js';

import { Memory } from './memory.js';
import { AIClient, buildMessages, clampReply } from './ai.js';
import { loadPersona } from './persona.js';

// ---------- configuración ----------
const {
  DISCORD_TOKEN,
  LLM_BASE_URL,
  LLM_API_KEY,
  LLM_MODEL,
  LLM_TEMPERATURE,
  LLM_MAX_TOKENS,
  HISTORY_WINDOW,
  PERSONA_FILE,
  DATABASE_PATH,
} = process.env;

if (!DISCORD_TOKEN) {
  console.error('Falta DISCORD_TOKEN en el archivo .env');
  process.exit(1);
}
if (!LLM_BASE_URL || !LLM_MODEL) {
  console.error('Faltan LLM_BASE_URL o LLM_MODEL en el archivo .env');
  process.exit(1);
}

const persona = loadPersona(PERSONA_FILE);
const memory = new Memory(DATABASE_PATH || 'data/memory.db');
const ai = new AIClient({
  baseUrl: LLM_BASE_URL,
  apiKey: LLM_API_KEY,
  model: LLM_MODEL,
  temperature: Number(LLM_TEMPERATURE ?? persona.temperature ?? 0.8),
  maxTokens: Number(LLM_MAX_TOKENS ?? 400),
});

const historyWindow = Number(HISTORY_WINDOW ?? 20);

// ---------- anti-spam simple ----------
// Un usuario no puede lanzar más de N peticiones por minuto.
const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 60_000;
const buckets = new Map();

function isRateLimited(userId) {
  const now = Date.now();
  const hits = (buckets.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);

  if (hits.length >= RATE_LIMIT) {
    buckets.set(userId, hits);
    return true;
  }

  hits.push(now);
  buckets.set(userId, hits);
  return false;
}

// Evita que dos mensajes del mismo usuario se procesen a la vez
// y se pisen el historial.
const locks = new Set();

// ---------- lógica central ----------
async function respond({ userId, guildId, userName, userMessage }) {
  memory.addMessage({ userId, guildId, role: 'user', content: userMessage });

  const history = memory.getHistory(userId, historyWindow);
  const facts = memory.getFacts(userId);

  const messages = buildMessages({
    persona,
    // el último mensaje ya está guardado, no lo dupliques
    history: history.slice(0, -1),
    facts,
    userName,
    userMessage,
  });

  const reply = await ai.chat(messages);
  const final = clampReply(reply, persona.maxLength);

  memory.addMessage({ userId, guildId, role: 'assistant', content: final });
  return final;
}

// ---------- cliente ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, (c) => {
  console.log(`[bot] Conectado como ${c.user.tag}`);
  console.log(`[bot] Modelo: ${LLM_MODEL} en ${LLM_BASE_URL}`);
  console.log(`[bot] Personalidad: ${persona.name}`);
});

// --- mensajes: responde a menciones y a DMs ---
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const mentioned = message.mentions.has(client.user);
  const isDM = !message.guild;

  if (!mentioned && !isDM) return;

  const userMessage = message.content
    .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
    .trim();

  if (!userMessage) {
    return message.reply(persona.greeting);
  }

  if (isRateLimited(message.author.id)) {
    return message.reply('Vas muy rápido. Dame un minuto y seguimos.');
  }

  if (locks.has(message.author.id)) {
    return message.reply('Todavía estoy con tu mensaje anterior.');
  }

  locks.add(message.author.id);

  try {
    await message.channel.sendTyping();

    const reply = await respond({
      userId: message.author.id,
      guildId: message.guild?.id ?? null,
      userName: message.member?.displayName || message.author.username,
      userMessage,
    });

    // Discord corta en 2000 caracteres: parte si hace falta.
    for (const chunk of chunkText(reply, 1900)) {
      await message.reply(chunk);
    }
  } catch (err) {
    console.error('[bot] Error respondiendo:', err.message);
    await message.reply(persona.errorMessage).catch(() => {});
  } finally {
    locks.delete(message.author.id);
  }
});

// --- comandos de barra ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;

  try {
    // /chat
    if (commandName === 'chat') {
      const text = interaction.options.getString('mensaje', true);

      if (isRateLimited(user.id)) {
        return interaction.reply({
          content: 'Vas muy rápido. Dame un minuto y seguimos.',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply();

      const reply = await respond({
        userId: user.id,
        guildId: interaction.guildId,
        userName: interaction.member?.displayName || user.username,
        userMessage: text,
      });

      return interaction.editReply(chunkText(reply, 1900)[0]);
    }

    // /remember
    if (commandName === 'remember') {
      const fact = interaction.options.getString('dato', true);
      const ok = memory.addFact(user.id, fact);

      return interaction.reply({
        content: ok ? 'Anotado.' : 'Eso ya lo tenía anotado.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // /forget
    if (commandName === 'forget') {
      memory.forget(user.id);
      return interaction.reply({
        content: 'Listo. Borré todo lo que tenía de ti.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // /stats
    if (commandName === 'stats') {
      const s = memory.stats(user.id);
      return interaction.reply({
        content: `Mensajes: ${s.messages}\nDatos guardados: ${s.facts}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (err) {
    console.error(`[bot] Error en /${commandName}:`, err.message);

    const payload = { content: persona.errorMessage, flags: MessageFlags.Ephemeral };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

// ---------- utilidades ----------
function chunkText(text, size) {
  if (text.length <= size) return [text];

  const chunks = [];
  let rest = text;

  while (rest.length > size) {
    let cut = rest.lastIndexOf('\n', size);
    if (cut < size * 0.5) cut = rest.lastIndexOf(' ', size);
    if (cut < size * 0.5) cut = size;

    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) chunks.push(rest);
  return chunks;
}

// ---------- apagado limpio ----------
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log('\n[bot] Cerrando…');
    memory.close();
    client.destroy();
    process.exit(0);
  });
}

client.login(DISCORD_TOKEN);
