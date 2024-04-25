import { Markup } from 'telegraf';
import logger from '../util/logger';


/**
 * Returns back keyboard and its buttons according to the language
 *
 * @param ctx - telegram context
 */
export const getBackKeyboard = (ctx: any) => {
    const backKeyboardBack = ctx.i18n.t('keyboards.back_keyboard.back');
    let backKeyboard: any = Markup.keyboard([backKeyboardBack]).resize();

    return {
        backKeyboard,
        backKeyboardBack
    };
};

/**
 * Returns main keyboard and its buttons according to the language
 *
 * @param ctx - telegram context
 */
export const getMainKeyboard = (ctx: any) => {
    let mainKeyboard: any;
    if(!ctx.session.user || !ctx.session.user.observableParishKeys){
        logger.error(ctx, `Can't build keyboard -> no parishkey for user ${ctx.message.chat.id}`);
        //
        const startKeybord = ctx.i18n.t('keyboards.main_keyboard.start');
         mainKeyboard = Markup.keyboard([
            [startKeybord]
        ]).resize();

    } else {
        const mainKeyboardSchedule = ctx.i18n.t('keyboards.main_keyboard.schedule');
        const mainKeyboardParish = ctx.i18n.t('keyboards.main_keyboard.parish');
        const mainKeyboardAbout = ctx.i18n.t('keyboards.main_keyboard.about');
        const mainKeyboardContact = ctx.i18n.t('keyboards.main_keyboard.contact');
        mainKeyboard = Markup.keyboard([
            [mainKeyboardSchedule, mainKeyboardParish] as any,
            [mainKeyboardAbout, mainKeyboardContact]
        ]).resize();
    }
    return {mainKeyboard};
    // return {
    //     mainKeyboard,
    //     mainKeyboardParish,
    //     mainKeyboardAbout,
    //     mainKeyboardContact
    // };
};
