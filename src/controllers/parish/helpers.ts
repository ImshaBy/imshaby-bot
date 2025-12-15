import { IParishResult } from '../../providers/search-providers/parish-lookup';
import { Markup, Context } from 'telegraf';
import {CONFIG} from '../../config';
/**
 * Displays menu with a list of parishes
 *
 * @param parishes - list of parishes
 */
export function getParishesMenu(parishes: IParishResult[]) {
    return Markup.inlineKeyboard(
        parishes.map(item => {
          return [Markup.button.callback( `${item.title}`,
                    JSON.stringify({ a: 'parish', p: item.id }), false)];
        }),
      );
}

/**
 * Menu to control current parish
 *
 * @param ctx - telegram context
 * @param authCode - passwordless authentication code
 */
export function getParishControlMenu(ctx: any, authCode: string) {
    return Markup.inlineKeyboard(
            [
                Markup.button.callback (
                  ctx.i18n.t('scenes.parishes.back_button'),
                  JSON.stringify({ a: 'back', p: undefined }),
                  false
                ),
                Markup.button.webApp(
                  ctx.i18n.t('scenes.parishes.change_button'),
                  `${CONFIG.admin.url}/callback?code=${authCode}`
                )
            ]
    );
}

