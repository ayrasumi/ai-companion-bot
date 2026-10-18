# AI Companion Bot

**English** · [Español](README.es.md)

A Discord bot with real AI: **persistent per-user memory** and a **fully configurable personality**.
Works with any OpenAI-compatible model (OpenAI, OpenRouter, DeepSeek, Groq, Ollama, LM Studio…).

> Not a moderation bot with an `/ask` command bolted on.
> It remembers each person, keeps context, and speaks in whatever tone you define.

**Written by Ayra.** See [`CREDITS.md`](CREDITS.md) for full authorship.

---

## What it does

| Feature | Detail |
|---|---|
| **Per-user memory** | Every person gets their own history and stored facts. The bot uses them without being told twice. |
| **Personality in JSON** | Change name, tone, greeting and rules without touching code. |
| **Any model** | One config file. Cloud models or a local one — same code. |
| **Slash commands** | `/chat`, `/remember`, `/forget`, `/stats` — native Discord UI. |
| **Rate limiting** | Per-user cap plus a lock on concurrent requests. It holds up when a server gets busy. |
| **Privacy** | `/forget` genuinely deletes a user's data from the database. |
| **No native dependencies** | Uses the SQLite built into Node 22+. Nothing to compile. |

---

## Install

```bash
npm install
cp .env.example .env      # fill in your keys
npm run deploy            # register slash commands
npm start
```

Requirements: **Node 22+** and a Discord bot token.

---

## Model configuration

Point `.env` anywhere you like:

```ini
# OpenAI
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# OpenRouter
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=openrouter/auto

# DeepSeek
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat

# Ollama (local, free, offline)
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.1
```

---

## Personality

Everything lives in `config/persona.json`:

```json
{
  "name": "Ayra",
  "systemPrompt": "You are Ayra, an assistant with a personality of her own…",
  "greeting": "I'm here. What do you need?",
  "maxLength": 1800,
  "temperature": 0.8
}
```

Change the `systemPrompt` and you have a different character. No code changes.

---

## Test without Discord

```bash
npm run demo
```

Verifies memory, history and the model response. No server or token required.

Real output:

```
────────────────────────────────────────────────────────────────
3. Model response
────────────────────────────────────────────────────────────────
   user     Hey, do you remember me?
   thinking…
   bot      Of course, Dani. You've been here since March and
            Fridays are your roleplay nights; selective memory,
            but with style.
   1812 ms · gpt-5.6-luna
────────────────────────────────────────────────────────────────
   Memory: OK   History: OK   Model: OK
```

---

## Structure

```
src/
  index.js            startup, events, commands, rate limiting
  ai.js               LLM client + message assembly
  memory.js           SQLite: per-user history and facts
  persona.js          personality loading and validation
  deploy-commands.js  slash command registration
config/persona.json   editable personality
demo.js               local test, no Discord needed
```

---

## Running cost

The bot itself costs nothing. The only cost is the model:

- **Local model** (Ollama/LM Studio): $0
- **Cloud model**: depends on provider and actual usage
- **Hosting**: a small VPS is enough; it also runs on a home PC

---

## License

**Ayra Source License 1.0** — free for personal and educational use;
commercial use requires permission. Full text in [`LICENSE`](LICENSE).

© 2026 Ayra. All rights reserved.
