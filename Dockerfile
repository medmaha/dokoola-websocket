FROM node:alpine AS base

WORKDIR /app
COPY package.json ./

# Development deps
FROM base as dev-deps
RUN yarn install

# Production deps
FROM base as prod-deps
RUN yarn install --prod

# Builder 
FROM base as builder

COPY --from=dev-deps /app/node_modules ./node_modules
COPY src ./src
COPY tsconfig.json ./
RUN yarn build

# Final Image
FROM base as final

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist