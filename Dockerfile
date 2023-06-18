FROM node:16.20.0
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt/app
COPY ./package.json ./yarn.lock ./
ENV PATH /opt/app/node_modules/.bin:$PATH
RUN yarn config set network-timeout 600000 -g && yarn install
COPY ./ .
CMD ["yarn", "serve-qa"]