FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=3000 BIND_HOST=0.0.0.0
EXPOSE 3000
CMD ["node", "server/index.js"]
