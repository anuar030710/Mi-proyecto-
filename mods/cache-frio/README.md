# cache-frio

Mod para Claude Code que avisa cuando la caché de prompts está a punto de enfriarse y cuando ya se enfrió.

- Cada respuesta del modelo en la conversación principal reinicia la cuenta. Usa la duración que informa la API (5 minutos o 1 hora); al principio supone 5 minutos.
- **Aviso previo:** 5 minutos antes (caché de 1 h) o 1 minuto antes (caché de 5 min).
- **Al enfriarse:** aviso de que el próximo mensaje volverá a escribir todo el contexto en la caché.
- Avisa con notificación nativa (la app la lanza aunque no estés mirando la sesión) y con un aviso dentro de la sesión.
- Línea de estado: `🔥 caché caliente · 42 min` / `🧊 caché fría`.
- Comando `/cache`: muestra cuánto le queda.

## Instalar

En la línea de comandos de una sesión de Claude Code en el terminal:

```
/plugin install cache-frio --marketplace anuar030710/Mi-proyecto-
```

Responde `y` para añadir el marketplace y elige el ámbito.

Desde una shell:

```
claude plugin install cache-frio --marketplace anuar030710/Mi-proyecto-
```

En la app de escritorio: pulsa **+** junto a la caja del prompt → Plugins → Add marketplace con `anuar030710/Mi-proyecto-` → Add plugin.

## Probar

```
claude plugin test mods/cache-frio
```
