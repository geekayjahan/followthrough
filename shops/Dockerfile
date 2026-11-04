# Synthetic shop pages for the demo leads. Build context is the repo root.
FROM node:24-slim
WORKDIR /shops
COPY shops/server.mjs ./
COPY app/data/candidate-v1/assets/shops ./pages
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.mjs"]
