import { IParishResult } from '../../util/parish-lookup';
import { Extra, Markup, Context } from 'telegraf';
import { IParish } from '../../models/Parish';
import { SessionContext } from 'telegraf-context';
/**
 * Displays menu with a list of movies
 * @param movies - list of movies
 */
export function getParishesMenu(parishes: IParishResult[]) {
  return Extra.HTML().markup((m: Markup) =>
    m.inlineKeyboard(
      parishes.map(item => [
        m.callbackButton(
          `${item.title}`,
          JSON.stringify({ a: 'parish', p: item.id }),
          false
        )
      ]),
      {}
    )
  );
}

/**
 * Menu to control current movie
 * @param ctx - telegram context
 */
export function getParishControlMenu(ctx: SessionContext) {
  return Extra.HTML().markup((m: Markup) =>
    m.inlineKeyboard(
      [
        // m.callbackButton(
        //   ctx.i18n.t('scenes.parishes.back_button'),
        //   JSON.stringify({ a: 'back', p: undefined }),
        //   false
        // ),
        // TODO: add param for admin url for particular parish
        m.urlButton(
          ctx.i18n.t('scenes.parishes.change_button'),
          `${process.env.ADMIN_URL}`,
          false
        )
      ],
      {}
    )
  );
}

