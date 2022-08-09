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

  if (userParishes && userParishes.length > 1) {
    const message = await ctx.reply(ctx.i18n.t('scenes.parishes.list_of_parishes'), getParishesMenu(userParishes));
    logger.debug(ctx, `Message ID for parish ${JSON.stringify(message)}`);
    // dirty hack as telegram doesn't respond with proper message from last ctx.reply
    ctx.session.cleanUpMessages.push(ctx.message?.message_id + 1);
    const message2 = await ctx.reply(ctx.i18n.t('scenes.parishes.ask_for_details'), backKeyboard);
  } else if (userParishes && userParishes.length == 1) {

    const selectedParish = (ctx.session.parishes as IParish[]).find((item: IParish) => item.id === userParishes[0].id);
    saveToSession(ctx, 'parish', selectedParish);
    parishAction(ctx, true);
  } else {
    await ctx.reply('Error', backKeyboard);
  }
});

parish.leave(async (ctx: SessionContext) => {
  logger.debug(ctx, 'Leaves parish scene');
  cleanUpMessages(ctx);
});

parish.command('saveme', leave());
parish.hears(match('keyboards.back_keyboard.back'), async (ctx: SessionContext) => {
  const { mainKeyboard } = getMainKeyboard(ctx);
  cleanUpMessages(ctx);
  await ctx.reply(ctx.i18n.t('shared.what_next'), mainKeyboard);
});

parish.action(/parish/, exposeParish, parishAction);
parish.action(/back/, backAction);

export default parish;
