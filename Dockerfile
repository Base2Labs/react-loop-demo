FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

COPY . .
RUN npm run build --workspace client

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npx", "tsx", "server/src/index.ts"]
