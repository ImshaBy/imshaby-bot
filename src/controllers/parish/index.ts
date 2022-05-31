import { match } from 'telegraf-i18n';
import Stage from 'telegraf/stage';
import Scene from 'telegraf/scenes/base';
import { getParishesMenu } from './helpers';
import { getUserParishes } from '../schedule/helpers';
import { parishAction, backAction } from './actions';
import { getMainKeyboard, getBackKeyboard } from '../../util/keyboards';
import logger from '../../util/logger';
import { IParish } from '../../models/Parish';
import { exposeParish } from '../../middlewares/expose-parish';
import { IParishResult } from '../../util/parish-lookup';
import { SessionContext } from 'telegraf-context';
import { cleanUpMessages, saveToSession } from '../../util/session';

const { leave } = Stage;
const parish = new Scene('parish');

parish.enter(async (ctx: SessionContext) => {
  logger.debug(ctx, 'Enters parish scene');
  saveToSession(ctx, 'cleanUpMessages', []);
  const { backKeyboard } = getBackKeyboard(ctx);
  const userParishes: IParishResult[] = await getUserParishes(ctx);

  if (userParishes && userParishes.length) {
    const message = await ctx.reply(ctx.i18n.t('scenes.parishes.list_of_parishes'), getParishesMenu(userParishes));
    logger.info(ctx, `Message ID for parish ${message}`);
    // ctx.session.cleanUpMessages.push(message_id);
    await ctx.reply(ctx.i18n.t('scenes.parishes.ask_for_details'), backKeyboard);
  } else {
    await ctx.reply('Error', backKeyboard);
  }
});

parish.leave(async (ctx: SessionContext) => {
  logger.debug(ctx, 'Leaves parish scene');
  cleanUpMessages(ctx);
  const { mainKeyboard } = getMainKeyboard(ctx);
  await ctx.reply(ctx.i18n.t('shared.what_next'), mainKeyboard);
});

parish.command('saveme', leave());
parish.hears(match('keyboards.back_keyboard.back'), leave());

parish.action(/parish/, exposeParish, parishAction);
parish.action(/back/, backAction);

export default parish;
