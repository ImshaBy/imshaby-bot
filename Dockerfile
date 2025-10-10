FROM node:18.19.0 AS build
ARG NODE_ENV=production
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt/app
COPY ./package.json ./yarn.lock ./
ENV PATH=/opt/app/node_modules/.bin:$PATH
RUN yarn config set network-timeout 600000 -g && yarn install --frozen-lockfile
COPY ./ .
RUN yarn build:qa

FROM node:18.19.0
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt/app
COPY --from=build /opt/app/node_modules ./node_modules
ENV PATH=/opt/app/node_modules/.bin:$PATH
COPY --from=build /opt/app ./
EXPOSE 80
CMD ["yarn", "start:prod"]
