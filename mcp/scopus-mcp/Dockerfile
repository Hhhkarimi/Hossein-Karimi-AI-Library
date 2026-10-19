FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev --ignore-scripts

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8790 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright SCOPUS_BROWSER_SANDBOX=false
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN node node_modules/playwright/cli.js install --with-deps chromium \
    && mkdir -p /app/exports && chown node:node /app/exports
USER node
EXPOSE 8790
CMD ["node", "dist/http.js"]
