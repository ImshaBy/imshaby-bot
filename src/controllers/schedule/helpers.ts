
import { IMassDay, IParishResult } from '../../providers/search-providers/parish-lookup';
import { Markup } from 'telegraf';

import logger from '../../util/logger';
import { saveToSession } from '../../util/session';

import { sheduleByParishId, parishesLookupByKey, getPasswordlessCode } from '../../providers/search-providers';



/**
 * Displays  list of user parishes
 *
 * @param parishes - list of parishes
 */

export async function getUserParishes(ctx: any): Promise<IParishResult[]> {
    logger.debug(ctx, 'Retrieving parishes from cache: %s', ctx.session.parishes );
    logger.debug(ctx, 'Retrieving parish keys from user: %s', ctx.session.user.observableParishKeys );
    // const user: IUser = JSON.parse(ctx.session.user);
    // const parishes: IParishResult[] = JSON.parse()
    if (ctx.session.parishes ) return ctx.session.parishes as IParishResult[];


    const parishes: IParishResult[] = [];
    try {
        logger.debug(ctx, 'Retrieving parishes for user %s', ctx.session.user);
        logger.debug(ctx, 'Retrieving parishes for user id: %s', ctx.session.user._id);
        logger.debug(ctx, 'Retrievied parishes : %s', ctx.session.user.observableParishKeys);

        for ( const parishKey of ctx.session.user.observableParishKeys) {
            logger.debug(ctx, parishKey);
            const tempParishes = await parishesLookupByKey(parishKey);
            tempParishes.forEach(item => parishes.push(item));
        }
        if (parishes && parishes.length > 0) {
            saveToSession(ctx, 'parishes', parishes);
        }

        return parishes;
    } catch (e) {
        logger.error(ctx, 'Parish lookup failed with the error: %O', e);
    }
}
/**
 * Returns parish menu keyboard
 */

export function getParishesMenus(parishes: IParishResult[]) {
    return Markup.inlineKeyboard(
            parishes.map(parish => [
                Markup.button.callback(
                    `${parish.title}`,
                    JSON.stringify({ a: 'parishSelect', p: parish.id }),
                    false
                )
            ])
    );
}

export async function getParishScheduleMessage(ctx: any): Promise<string> {
    const massDays: IMassDay[] = await sheduleByParishId(ctx.session.parish.id);
    const msg = '';
    for ( const massDay of massDays) {
        msg.concat(`\n${massDay.date}:`);
    }
    return msg;
}


/**
 * Menu to control current movie
 *
 * @param ctx - telegram context
 */
export function getParishScheduleControlMenu(ctx: any, authCode: string) {
    return Markup.inlineKeyboard(
            [
                Markup.button.callback(
                    ctx.i18n.t('scenes.parishes.refresh_button'),
                    JSON.stringify({ a: 'refreshSchedule', p: ctx.session.parish._id }),
                    false
                )
                ,
                Markup.button.url(
                  ctx.i18n.t('scenes.parishes.change_button'),
                  `${process.env.ADMIN_URL}?parish=${ctx.session.parish.key}&code=${authCode}`,
                  false
                )
            ]
    );
}

