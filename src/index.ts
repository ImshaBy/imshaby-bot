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
  app.get('/test/:msg', function (req, res) {
    res.end(req.params.msg);
  });

  const server = createServer(
    app.use((req, res) => res.status(200).end())
  );

  // app.use(bot.webhookCallback('/secret-path'))

  server.listen(process.env.PORT, () => {
    bot.launch();
  });

  cron.schedule(process.env.SCHEDULE, checkNeeedToUpdateParishes);
}
