#!/bin/sh
set -e

# The db service is already healthy (compose depends_on: service_healthy),
# so migrations can run immediately.
npm run prisma:migrate -w @cinema/server
npm run db:seed -w @cinema/server

exec npm run start -w @cinema/server
