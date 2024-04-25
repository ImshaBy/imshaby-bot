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
 */
export function getParishControlMenu(ctx: any) {
    return Markup.inlineKeyboard(
            [
                Markup.button.callback (
                  ctx.i18n.t('scenes.parishes.back_button'),
                  JSON.stringify({ a: 'back', p: undefined }),
                  false
                ),
                // TODO: add param for admin url for particular parish
                Markup.button.url(
                  ctx.i18n.t('scenes.parishes.change_button'),
                  `${CONFIG.admin.url}`,
                  false
                )
            ]
    );
}

