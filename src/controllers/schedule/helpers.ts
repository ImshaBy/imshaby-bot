import { IMassDay, IParishResult } from '../../providers/search-providers/parish-lookup';
import { Markup } from 'telegraf';

import { sheduleByParishId } from '../../providers/search-providers';
import { buildAdminPanelUrl } from '../../util/common';

// Re-export getUserParishes from centralized parish-service for backwards compatibility
export { getUserParishes } from '../../util/parish-service';
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

export async function getParishScheduleMessage(ctx: any, accessToken: string): Promise<string> {
    const massDays: IMassDay[] = await sheduleByParishId(ctx.session.parish.id, accessToken);
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
 * @param authCode - passwordless authentication code
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
                Markup.button.webApp(
                  ctx.i18n.t('scenes.parishes.change_button'),
                  buildAdminPanelUrl(authCode, ctx.session.parish.key)
                )
            ]
    );
}

