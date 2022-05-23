import { Context } from 'telegraf';
import { getAccountConfirmKeyboard } from './helpers';
import { sleep } from '../../util/common';
import { updateLanguage } from '../../util/language';
import { SessionContext } from 'telegraf-context';

export const languageChangeAction = async (ctx: SessionContext) => {
  const langData = JSON.parse(ctx.callbackQuery.data);
  await updateLanguage(ctx, langData.p);
  const accountConfirmKeyboard = getAccountConfirmKeyboard(ctx);
  accountConfirmKeyboard.disable_web_page_preview = true;

  await sleep(3);
  await ctx.reply(ctx.i18n.t('scenes.start.bot_description'), accountConfirmKeyboard);
  // await ctx.answerCbQuery();
};
