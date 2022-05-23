require('dotenv').config();
import Telegraf from 'telegraf';
import logger from './util/logger';
import cron from 'node-cron';
import axios from 'axios';

import jwt from 'express-jwt';
import jwtAuthz from 'express-jwt-authz';
import jwksRsa from 'jwks-rsa';

const checkScopes = jwtAuthz([ 'read:messages' ]);
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import i18nextMiddleware from 'i18next-express-middleware';

i18next
 .use(Backend)
 .use(i18nextMiddleware.LanguageDetector)
 .init({
 backend: {
 loadPath: __dirname + '/locales/{{lng}}-hook.json',
 },
 detection: {
  lookupQuerystring: 'lng',
  order: ['querystring', 'cookie'],
  caches: ['cookie']
 },
 fallbackLng: 'en',
 preload: ['en', 'ru']
 });

// Authorization middleware.When used, the
// Access Token must exist and be verified against
// the Auth0 JSON Web Key Set
const checkJwt = jwt({
  // Dynamically provide a signing key
  // based on the kid in the header and
  // the signing keys provided by the JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  audience: `${process.env.AUTH0_AUDIENCE}`,
  issuer: `https://${process.env.AUTH0_ISSUER_BASE_URL}/`,
  algorithms: ['RS256']
});


import { checkNeeedToUpdateParishes, notifyGroupChatAboutParishChange } from './util/notifier';

import { botTelegram } from './bot';
import express from 'express';
import { SessionContext } from 'telegraf-context';

logger.info(undefined, `Starting at ENV: ${process.env.NODE_ENV}`);


if (process.env.NODE_ENV === 'production') {
  startProdution(botTelegram);
} else {
  startDevelopmen(botTelegram);
}


function startDevelopmen(bot: Telegraf<SessionContext>) {
  logger.info(undefined, `Starting a bot in development mode : ${process.env.NODE_ENV}`);

  const app = createServer();

  app.listen(process.env.PORT, () => {
    console.log(`Server listening on port ${process.env.PORT}!`);
  });

  axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/deleteWebhook`).then(() =>
    bot.startPolling()
  );

  cron.schedule(process.env.SCHEDULE, checkNeeedToUpdateParishes);
}


function startProdution (bot: Telegraf<SessionContext>) {
  const app = createServer();

  // app.use(bot.webhookCallback(`${process.env.WEBHOOK_PATH}`));

  app.post(`${process.env.WEBHOOK_PATH}`, (req, res) => {
    // console.log(req.body);
    return bot.handleUpdate(req.body, res)
      .finally(() => {

      });
  });

  // Definition of webhook types needed for the bot
  const type: string[] = ['message', 'callback_query'];

  app.listen(process.env.PORT, () => {
    console.log(`Example app listening on port ${process.env.PORT}! Bot ID: ${process.env.TELEGRAM_TOKEN}. Settin up webhook for telegram: ${process.env.WEBHOOK_URL}${process.env.WEBHOOK_PATH}, supported types : ${type}`);
    bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}${process.env.WEBHOOK_PATH}`, undefined, 100, type);
  });

  cron.schedule(process.env.SCHEDULE, checkNeeedToUpdateParishes);
}


function createServer() {
  logger.info(undefined, 'Starting a bot within express server');

  const app = express();
  app.use(express.json());
  app.use(i18nextMiddleware.handle(
    i18next, {
      removeLngFromUrl: false
      }
  ));

  app.get('/private', checkJwt, function (req: any, res: any) {
    console.log(`Private url is triggered `);
    res.status(200).end();
  });

  app.get('/',  function (req: any, res: any) {
    res.status(200).end();
  });

  app.post('/chat/parish',  function (req: any, res: any) {
    notifyGroupChatAboutParishChange(req.query.chatId, getParishUpdateMsg(req, `${req.body.parish.name}`));
    res.status(200).end();
  });

  app.post('/chat/city', function (req: any, res: any) {
    notifyGroupChatAboutParishChange(req.query.chatId, getParishUpdateMsg(req, `${req.body.parish.name}`));
    res.status(200).end();
  });

  return app;
}

function getParishUpdateMsg(req: any, name: String ) {
  let lang = '';
  if (req.query.lng) {
    lang = req.query.lng;
  } else {
    lang = 'ru';
  }
  i18next.changeLanguage(lang);
  return i18next.t('parish.hook_msg', {
          name: name
        });
}

