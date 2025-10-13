import { CONFIG } from './config';
import logger from './util/logger';
import cron from 'node-cron';
import { checkNeeedToRebuildSite } from './util/githooker';
import { createExpressServer } from './server';
import { checkNeeedToUpdateParishes} from './util/notifier';
import { mongoConnection as mongoConnectionInit } from './mongo';
import { bot, launchBot } from './bot';

export async function main(env: string){
  logger.info(undefined, `Starting a bot server in following mode : ${env}`);
  mongoConnectionInit(env);
  
  const app = await createExpressServer(bot.telegram);

  launchBot(env, bot, app);

  cron.schedule(CONFIG.schedule.notify, () => checkNeeedToUpdateParishes());
  cron.schedule(CONFIG.schedule.build, checkNeeedToRebuildSite);
}

main (CONFIG.server.env);