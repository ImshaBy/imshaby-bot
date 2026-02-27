FROM node:18-alpine

WORKDIR /app

ARG BUILD_ENV=production
ENV NODE_ENV=$BUILD_ENV
ENV PATH=/app/node_modules/.bin:$PATH

RUN apk add --no-cache python3 make g++ bash && \
    corepack enable && \
    yarn add typescript --dev

COPY package.json yarn.lock ./
RUN yarn config set network-timeout 600000 -g && \
    yarn install --frozen-lockfile

COPY . .

EXPOSE 18080
ENTRYPOINT ["/app/entrypoint.sh"]
