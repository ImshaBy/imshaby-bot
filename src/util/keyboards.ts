import { Markup, Context } from 'telegraf';

/**
 * Returns back keyboard and its buttons according to the language
 * @param ctx - telegram context
 */
export const getBackKeyboard = (ctx: Context) => {
  const backKeyboardBack = ctx.i18n.t('keyboards.back_keyboard.back');
  let backKeyboard: any = Markup.keyboard([backKeyboardBack]);

  backKeyboard = backKeyboard.resize().extra();

  return {
    backKeyboard,
    backKeyboardBack
  };
};

/**
 * Returns main keyboard and its buttons according to the language
 * @param ctx - telegram context
 */
export const getMainKeyboard = (ctx: Context) => {
  const mainKeyboardSchedule = ctx.i18n.t('keyboards.main_keyboard.schedule');
  const mainKeyboardParish = ctx.i18n.t('keyboards.main_keyboard.parish');
  const mainKeyboardAbout = ctx.i18n.t('keyboards.main_keyboard.about');
  const mainKeyboardContact = ctx.i18n.t('keyboards.main_keyboard.contact');
  let mainKeyboard: any = Markup.keyboard([
    [mainKeyboardSchedule, mainKeyboardParish] as any,
    [mainKeyboardAbout, mainKeyboardContact]

  ]);
  mainKeyboard = mainKeyboard.resize().extra();

  return {
    mainKeyboard,
    mainKeyboardParish,
    mainKeyboardAbout,
    mainKeyboardContact
  };
};
