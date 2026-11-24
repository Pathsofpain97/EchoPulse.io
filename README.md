Aca esta la page de mi APP https://echo-pulse-io.vercel.app/ espero que les guste! :D

Este proyecto es un reproductor de Musica sin ningun tipo de fin mas que el de escucharla, no planeo ganar dinero ni lucrame con esto, es un proyecto meramente artistico y para aprender e practicar. Para usar correctamente el mismo es necesario cargarle musica y tolera cualquier archivo MP3. Espero que les guste :D


## Audius discovery

EchoPulse uses Audius read-only endpoints for weekly trending tracks, track search, and streaming. Read-only API requests work without credentials for normal use; an optional public API key can be added to increase rate limits.

1. Copy `.env.example` to `.env.local`.
2. Optionally set `VITE_AUDIUS_API_KEY` to your Audius API key.
3. Never place an Audius API secret in a `VITE_` variable or in frontend code.

The integration uses the official Audius API (`https://api.audius.co/v1`). Tracks marked non-streamable or stream-gated are excluded from the playable results.
