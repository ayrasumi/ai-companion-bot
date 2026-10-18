// © 2026 Ayra — Todos los derechos reservados.
// Autoría: Ayra. Escrito en co-dirección con Kresselya.

/**
 * deploy-commands.js — registra los comandos de barra en Discord.
 *
 * Ejecuta: npm run deploy
 *
 * Si DISCORD_GUILD_ID está definido, los comandos aparecen al instante
 * en ese servidor. Si no, se registran globalmente (hasta 1 hora).
 */

import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('Faltan DISCORD_TOKEN o DISCORD_CLIENT_ID en el .env');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Habla con el bot')
    .addStringOption((o) =>
      o.setName('mensaje').setDescription('Lo que quieres decirle').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('remember')
    .setDescription('Pídele que recuerde algo sobre ti')
    .addStringOption((o) =>
      o.setName('dato').setDescription('El dato a recordar').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('forget')
    .setDescription('Borra todo lo que el bot sabe de ti'),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Cuánto recuerda de ti'),
].map((c) => c.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

try {
  const route = DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID)
    : Routes.applicationCommands(DISCORD_CLIENT_ID);

  await rest.put(route, { body: commands });

  console.log(
    DISCORD_GUILD_ID
      ? `Comandos registrados en el servidor ${DISCORD_GUILD_ID}.`
      : 'Comandos registrados globalmente (puede tardar hasta 1 hora).'
  );
} catch (err) {
  console.error('Error registrando comandos:', err);
  process.exit(1);
}
