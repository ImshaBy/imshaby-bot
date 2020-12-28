require('dotenv').config();
import Telegraf, {  Context } from 'telegraf';
import logger from './util/logger';
import cron from 'node-cron';
import axios from 'axios';



import { checkNeeedToUpdateParishes } from './util/notifier';

import { createServer } from 'http';
import bot from './bot';
import express from 'express';

logger.info(undefined, `Starting at ENV: ${process.env.NODE_ENV}`);


if (process.env.NODE_ENV === 'production') {
  startBotServer(bot);
} else {
  // startBotServer(bot);
  startDevMode(bot);
}


function startDevMode(bot: Telegraf<Context>) {
  logger.info(undefined, `Starting a bot in development mode : ${process.env.NODE_ENV}`);

  axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/deleteWebhook`).then(() =>
    bot.startPolling()
  );

  cron.schedule(process.env.SCHEDULE, checkNeeedToUpdateParishes);
}


function startBotServer (bot: Telegraf<Context>) {
  logger.info(undefined, 'Starting a bot within express server');

  const app = express();
  app.get('/test/:msg', function (req: any, res: any) {
    res.end(req.params.msg);
  });

  app.use(bot.webhookCallback(`${process.env.WEBHOOK_PATH}`));

  // const server = createServer( () => {
  //   logger.error(undefined, 'seting callback');
  //   app.use(bot.webhookCallback(`${process.env.WEBHOOK_PATH}`));
  //   app.use((req, res) => res.status(200).end());
  //   bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}${process.env.WEBHOOK_PATH}`);
  // }
  // );

  // app.use(bot.webhookCallback('/'));

  // axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/setWebhook?url=${process.env.WEBHOOK_URL}`).then(() =>
  //   logger.info(undefined, 'webhook is set up!')
  // );

  app.listen(process.env.PORT, () => {
    console.log(`Example app listening on port ${process.env.PORT}! Settin up webhoo for telegram:`);
    bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}${process.env.WEBHOOK_PATH}`);
  });


  // axios.get()


  cron.schedule(process.env.SCHEDULE, checkNeeedToUpdateParishes);
}
