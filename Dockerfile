FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ bash && \
    corepack enable && \
    yarn add typescript --dev

COPY package.json yarn.lock ./
RUN yarn config set network-timeout 600000 -g && \
    yarn install --frozen-lockfile && \
    yarn build:qa

COPY . .

ENV NODE_ENV=dev
ENV PATH=/app/node_modules/.bin:$PATH

EXPOSE 80
CMD ["yarn", "serve"]
