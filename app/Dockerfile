# Followthrough on one always-on container (spec T5). Keys come from the host's variables, never the image.
FROM node:26-slim
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    DATA_DIR=/data/run \
    TRUST_PROXY=true
COPY package.json package-lock.json ./
# ffmpeg-static downloads the Linux binary here, so the image carries its own ffmpeg.
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
COPY data ./data
EXPOSE 4310
CMD ["node", "src/server.mjs"]
