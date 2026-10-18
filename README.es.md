# AI Companion Bot

[English](README.md) · **Español**

Bot de Discord con IA real: **memoria persistente por usuario** y **personalidad 100% configurable**.
Funciona con cualquier modelo compatible con la API de OpenAI (OpenAI, OpenRouter, DeepSeek, Groq, Ollama, LM Studio…).

> No es un bot de moderación con un `/ask` pegado encima.
> Recuerda a cada persona, mantiene el contexto y tiene el tono que tú le definas.

**Escrito por Ayra.** Ver [`CREDITS.md`](CREDITS.md) para la autoría completa.

---

## Qué hace

| Función | Detalle |
|---|---|
| **Memoria por usuario** | Cada persona tiene su historial y sus datos guardados. El bot los usa sin que se los repitas. |
| **Personalidad en JSON** | Cambias nombre, tono, saludo y reglas sin tocar código. |
| **Cualquier modelo** | Un solo archivo de configuración. Sirve para la nube o para un modelo local. |
| **Comandos de barra** | `/chat`, `/remember`, `/forget`, `/stats` — interfaz nativa de Discord. |
| **Anti-spam** | Límite por usuario y bloqueo de peticiones simultáneas. No se cae si el servidor se anima. |
| **Privacidad** | `/forget` borra todo lo del usuario de verdad, de la base de datos. |
| **Cero dependencias nativas** | Usa SQLite integrado en Node 22+. No hay que compilar nada. |

---

## Instalación

```bash
npm install
cp .env.example .env      # rellena tus claves
npm run deploy            # registra los comandos
npm start
```

Requisitos: **Node 22 o superior** y un token de bot de Discord.

---

## Configuración del modelo

En `.env`, apunta a donde quieras:

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

# Ollama (local, gratis, sin internet)
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.1
```

---

## Personalidad

Todo vive en `config/persona.json`:

```json
{
  "name": "Ayra",
  "systemPrompt": "Eres Ayra, una asistente con personalidad propia…",
  "greeting": "Aquí estoy. ¿Qué necesitas?",
  "maxLength": 1800,
  "temperature": 0.8
}
```

Cambias el `systemPrompt` y tienes otro personaje. Sin tocar una línea de código.

---

## Prueba sin Discord

```bash
npm run demo
```

Verifica memoria, historial y respuesta del modelo. No necesita servidor ni token.

Salida real:

```
────────────────────────────────────────────────────────────────
3. Respuesta del modelo
────────────────────────────────────────────────────────────────
   usuario  Hola, ¿te acuerdas de mí?
   pensando…
   bot      Claro, Dani. Llevas por aquí desde marzo y los viernes te
            toca rol; memoria selectiva, pero con estilo.
   1812 ms · gpt-5.6-luna
────────────────────────────────────────────────────────────────
   Memoria: OK   Historial: OK   Modelo: OK
```

---

## Estructura

```
src/
  index.js            arranque, eventos, comandos, anti-spam
  ai.js               cliente LLM + construcción de mensajes
  memory.js           SQLite: historial y datos por usuario
  persona.js          carga y validación de personalidad
  deploy-commands.js  registro de comandos de barra
config/persona.json   personalidad editable
demo.js               prueba local sin Discord
```

---

## Coste de funcionamiento

El bot en sí no cuesta nada. Lo único que se paga es el modelo:

- **Modelo local** (Ollama/LM Studio): $0
- **Modelo en la nube**: depende del proveedor y del uso real
- **Hosting**: un VPS pequeño basta; también corre en el PC de casa

---

## Licencia

**Ayra Source License 1.0** — uso personal y educativo libre; uso comercial
requiere autorización.
Texto completo: [English](LICENSE) · [Español](LICENSE.es.md).

© 2026 Ayra. Todos los derechos reservados.
