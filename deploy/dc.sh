#!/usr/bin/env bash
# docker compose «Опоры» с обоими файлами настроек: .env (из GitHub) и server.env (ключи, созданные на сервере).
cd /opt/opora && exec docker compose --env-file .env --env-file server.env "$@"
