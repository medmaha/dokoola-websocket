FROM node:alpine AS base
WORKDIR /app
COPY package.json ./

# Development deps
FROM base AS dev-deps
RUN yarn install

# Production deps
FROM base AS prod-deps
RUN yarn install --prod

# Builder 
FROM base AS builder
COPY --from=dev-deps /app/node_modules ./node_modules
COPY src ./src
COPY tsconfig.json ./
RUN yarn build

# Final Image
FROM base AS final
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# global env across build images
COPY .env.prod ./.env

# Expose port
EXPOSE 5500

CMD [ "node", "dist/server.js" ]
