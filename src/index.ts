import { CONFIG } from './config';
import {Telegraf} from 'telegraf';
import logger from './util/logger';
import cron from 'node-cron';
import { checkNeeedToRebuildSite } from './util/githooker';
import { createExpressServer } from './server';
import { checkNeeedToUpdateParishes} from './util/notifier';
import { mongoConnection as mongoConnectionInit } from './mongo';

import { bot, launchBot } from './bot';
import { SessionContext } from 'telegram-context';

import { gracefullShutdown } from './util/error-handler';


export async function main(env: string){
  logger.info(undefined, `Starting a bot server in following mode : ${env}`);

  mongoConnectionInit(env);

  
  const app = createExpressServer(bot.telegram);

  launchBot(env, bot, app);


  cron.schedule(CONFIG.schedule.notify, () => checkNeeedToUpdateParishes());
  cron.schedule(CONFIG.schedule.build, checkNeeedToRebuildSite);

  gracefullShutdown(bot);

}


main (CONFIG.server.env);