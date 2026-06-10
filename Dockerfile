# Coolify deployment: build with the Dockerfile pack, mount a persistent
# volume at /app/data for the SQLite file, and set ORIGIN to the public URL
# (adapter-node needs it to accept form posts). Optional: RESEND_API_KEY and
# EMAIL_FROM for magic-link sign-in emails — without a key, links are printed
# to the container log instead.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Plain vite build — the feed sync that `npm run build` also runs needs network
# and a writable data dir; the server syncs at boot and hourly anyway.
RUN npx vite build
RUN npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_DIR=/app/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["node", "build"]
