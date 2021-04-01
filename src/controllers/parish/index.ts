import { Context } from 'telegraf';
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

const { leave } = Stage;
const parish = new Scene('parish');

parish.enter(async (ctx: Context) => {
  logger.debug(ctx, 'Enters parish scene');
  const { backKeyboard } = getBackKeyboard(ctx);
  const userParishes: IParishResult[] = await getUserParishes(ctx);

  if (userParishes && userParishes.length) {
    await ctx.reply(ctx.i18n.t('scenes.parishes.list_of_parishes'), getParishesMenu(userParishes));
    await ctx.reply(ctx.i18n.t('scenes.parishes.ask_for_details'), backKeyboard);
  } else {
    await ctx.reply('No parishes', backKeyboard);
  }
});

parish.leave(async (ctx: Context) => {
  logger.debug(ctx, 'Leaves parish scene');
  const { mainKeyboard } = getMainKeyboard(ctx);
  await ctx.reply(ctx.i18n.t('shared.what_next'), mainKeyboard);
});

parish.command('saveme', leave());
parish.hears(match('keyboards.back_keyboard.back'), leave());

parish.action(/parish/, exposeParish, parishAction);
parish.action(/back/, backAction);

export default parish;
