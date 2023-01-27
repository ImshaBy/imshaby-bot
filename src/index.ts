import * as dotenv from 'dotenv'
dotenv.config()

import Telegraf from 'telegraf';
import logger from './util/logger';
import cron from 'node-cron';
import axios from 'axios';
import { invokeGitHubAction, addBuildMessage, checkNeeedToRebuildSite, getBuildMessages } from './util/githooker';

import {expressjwt} from 'express-jwt';

import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import i18nextMiddleware from 'i18next-http-middleware';

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

const checkJwt = expressjwt({
    // DEPRECATED
    // SHOULD BE REMOVED

    // Dynamically provide a signing key
    // based on the kid in the header and
    // the signing keys provided by the JWKS endpoint.
    // secret: jwksRsa.expressJwtSecret({
    //   cache: true,
    //   rateLimit: true,
    //   jwksRequestsPerMinute: 5,
    //   jwksUri: `https://${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`
    // }),
    secret: 'secret',

    // Validate the audience and the issuer.
    audience: `${process.env.AUTH0_AUDIENCE}`,
    issuer: `https://${process.env.AUTH0_ISSUER_BASE_URL}/`,
    algorithms: ['RS256']
});


import { checkNeeedToUpdateParishes, notifyGroupChatAboutParishChange } from './util/notifier';

import { botTelegram } from './bot';
import express from 'express';
import bodyParser from 'body-parser';
import { SessionContext } from 'telegraf-context';

logger.info(undefined, `Starting at ENV: ${process.env.NODE_ENV}`);


if (process.env.NODE_ENV === 'production') {
    startProdution(botTelegram);
} else {
  startDevelopmen(botTelegram);
  // startDevelopmentWithoutBot();
}

function startDevelopmentWithoutBot() {
  logger.info(undefined, `Starting express server without bot: ${process.env.NODE_ENV}`);

  const app = createServer();

  app.listen(process.env.PORT, () => {
    console.log(`Server listening on port ${process.env.PORT}!`);
  });

  console.log(`${process.env.SCHEDULE_BUILD} - cron site build config`);
  cron.schedule(process.env.SCHEDULE_BUILD, checkNeeedToRebuildSite);

  // app.post('/build-site',  async function (req: any, res: any) {
  //   // console.log(`${JSON.stringify(req.body)}`);

  //   await invokeGitHubAction(req.headers['workflow-type'], req.body);
  //   console.log(`CMS hook is triggered`);
  //   res.status(200).end();
  // });

}

function startDevelopmen(bot: Telegraf<SessionContext>) {
    logger.info(undefined, `Starting a bot in development mode : ${process.env.NODE_ENV}`);

    const app = createServer();

    app.post(`${process.env.WEBHOOK_PATH}`, (req, res) => {
    // console.log(req.body);
        return bot.handleUpdate(req.body, res)
    });

    app.listen(process.env.PORT, () => {
        console.log(`Server listening on port ${process.env.PORT}!`);
    });

    axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/deleteWebhook`).then(() =>
        bot.startPolling()
    );

  axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/deleteWebhook`).then(() =>
    bot.startPolling()
  );

  cron.schedule(process.env.SCHEDULE, checkNeeedToUpdateParishes);
  cron.schedule(process.env.SCHEDULE_BUILD, checkNeeedToRebuildSite);

}


function startProdution (bot: Telegraf<SessionContext>) {
    const app = createServer();

  app.post(`${process.env.WEBHOOK_PATH}`, (req, res) => {
    // console.log(req.body);
        return bot.handleUpdate(req.body, res)
    });

    // Definition of webhook types needed for the bot
    const type: string[] = ['message', 'callback_query', 'chat_join_request'];

    app.listen(process.env.PORT, () => {
        console.log(`Example app listening on port ${process.env.PORT}! Bot ID: ${process.env.TELEGRAM_TOKEN}. Settin up webhook for telegram: ${process.env.WEBHOOK_URL}${process.env.WEBHOOK_PATH}, supported types : ${type}`);
        bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}${process.env.WEBHOOK_PATH}`);
    });


  console.log(`${process.env.SCHEDULE_BUILD} - cron site build config`);

  cron.schedule(process.env.SCHEDULE, checkNeeedToUpdateParishes);
  cron.schedule(process.env.SCHEDULE_BUILD, checkNeeedToRebuildSite);

}


function createServer() {
  logger.info(undefined, 'Starting a bot within express server');

  const app = express();
  app.use(bodyParser.json());
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
    console.log(`Public root url is triggered `);
    res.json({'status': 'ok'});
  });

  app.post('/chat/parish',  function (req: any, res: any) {
    notifyGroupChatAboutParishChange(req.query.chatId, getParishUpdateMsg(req, `${req.body.parish.name}`));
    res.status(200).end();
  });

  app.post('/chat/city', function (req: any, res: any) {
    notifyGroupChatAboutParishChange(req.query.chatId, getParishUpdateMsg(req, `${req.body.parish.name}`));
    res.status(200).end();
  });

  app.post('/build-site',  async function (req: any, res: any) {
    // console.log(`${JSON.stringify(req.body)}`);
    if ( req.headers['x-build-now']) {
      await invokeGitHubAction(req.headers['workflow-type'], req.body);
    } else {
      await addBuildMessage(JSON.stringify({'event' : req.headers['workflow-type'], 'client_payload' : req.body}));
    }
    console.log(`CMS hook is triggered`);
    res.status(200).end();
  });

  app.get('/build-site/messages',  function (req: any, res: any) {
    res.json({'count': getBuildMessages().length, 'messages': getBuildMessages()});
  });

  return app;
}

function getParishUpdateMsg(req: any, name: string ) {
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

