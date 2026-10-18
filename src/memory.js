// © 2026 Ayra — Todos los derechos reservados.
// Autoría: Ayra. Escrito en co-dirección con Kresselya.

/**
 * memory.js — memoria persistente por usuario.
 *
 * Usa node:sqlite (incluido en Node 22+), así que no hay dependencias
 * nativas que compilar. Cada usuario de Discord tiene su propio
 * historial y su propia lista de datos recordados.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export class Memory {
  constructor(dbPath = 'data/memory.db') {
    const full = resolve(process.cwd(), dbPath);
    mkdirSync(dirname(full), { recursive: true });

    this.db = new DatabaseSync(full);
    this.db.exec(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS messages (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id   TEXT    NOT NULL,
        guild_id  TEXT,
        role      TEXT    NOT NULL,
        content   TEXT    NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_user
        ON messages (user_id, id DESC);

      CREATE TABLE IF NOT EXISTS facts (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id   TEXT    NOT NULL,
        fact      TEXT    NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE (user_id, fact)
      );

      CREATE INDEX IF NOT EXISTS idx_facts_user ON facts (user_id);
    `);
  }

  /** Guarda un mensaje del historial. */
  addMessage({ userId, guildId = null, role, content }) {
    const stmt = this.db.prepare(
      `INSERT INTO messages (user_id, guild_id, role, content, created_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    stmt.run(userId, guildId, role, content, Date.now());
  }

  /** Devuelve los últimos N mensajes en orden cronológico. */
  getHistory(userId, limit = 20) {
    const stmt = this.db.prepare(
      `SELECT role, content FROM messages
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT ?`
    );
    return stmt.all(userId, limit).reverse();
  }

  /** Añade un dato permanente sobre el usuario (idempotente). */
  addFact(userId, fact) {
    const clean = String(fact).trim();
    if (clean.length < 3 || clean.length > 300) return false;

    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO facts (user_id, fact, created_at)
       VALUES (?, ?, ?)`
    );
    const res = stmt.run(userId, clean, Date.now());
    return res.changes > 0;
  }

  /** Lista los datos recordados de un usuario. */
  getFacts(userId, limit = 25) {
    const stmt = this.db.prepare(
      `SELECT fact FROM facts WHERE user_id = ? ORDER BY id ASC LIMIT ?`
    );
    return stmt.all(userId, limit).map((r) => r.fact);
  }

  /** Borra todo lo de un usuario (para el comando /forget). */
  forget(userId) {
    this.db.prepare('DELETE FROM messages WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM facts WHERE user_id = ?').run(userId);
  }

  /** Estadísticas simples, útiles para el comando /stats. */
  stats(userId) {
    const msgs = this.db
      .prepare('SELECT COUNT(*) AS n FROM messages WHERE user_id = ?')
      .get(userId);
    const facts = this.db
      .prepare('SELECT COUNT(*) AS n FROM facts WHERE user_id = ?')
      .get(userId);
    return { messages: msgs.n, facts: facts.n };
  }

  close() {
    this.db.close();
  }
}
