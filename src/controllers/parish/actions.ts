import { getParishControlMenu, getParishesMenu } from './helpers';
import logger from '../../util/logger';
import { getBackKeyboard } from '../../util/keyboards';
import { saveToSession } from '../../util/session';
import { parishesLookupByKey } from '../../util/search-providers';
import { SessionContext } from 'telegraf-context';
import { IParishResult } from '../../util/parish-lookup';


export const parishAction = async (ctx: SessionContext, noEdit: boolean) => {

    const parishes = await parishesLookupByKey(ctx.session.parish.key);
    saveToSession(ctx, 'parish', parishes[0]);

    let text = ctx.i18n.t('scenes.parishes.chosen_parish', {
        title: ctx.session.parish.title
    });

    const address = ctx.i18n.t('scenes.parish.address', {
        address: ctx.session.parish.address
    });

    text += '\n' + address;


    if (ctx.session.parish.broadcastUrl) {
        const broadcastUrl = ctx.i18n.t('scenes.parish.broadcastUrl', {
            broadcastUrl: ctx.session.parish.broadcastUrl
        });
        text += '\n' + broadcastUrl;
    }

    // if (ctx.session.parish.phone) {
    //   const phone = ctx.i18n.t('scenes.parish.phone', {
    //     phone: ctx.session.parish.phone
    //   });
    //   text += '\n' + phone;

    // }

    // if (ctx.session.parish.email) {
    //   const email = ctx.i18n.t('scenes.parish.email', {
    //     email: ctx.session.parish.email
    //   });
    //   // ctx.reply(`${email}`);
    //   text += '\n' + email;

    // }

    if (ctx.session.parish.website) {
        const website = ctx.i18n.t('scenes.parish.website', {
            website: ctx.session.parish.website
        });
        // ctx.reply(`${website}`);
        text += '\n' + website;

    }

    const updatePeriodInDays = ctx.i18n.t('scenes.parish.updatePeriodInDays', {
        updatePeriodInDays: ctx.session.parish.updatePeriodInDays
    });
    // ctx.reply(`${updatePeriodInDays}`);
    text += '\n' + updatePeriodInDays;


    if (noEdit) {

        // no buttons, single parish use cases, no need to replace buttons
        const { backKeyboard } = getBackKeyboard(ctx);
        ctx.reply(
            `${text} <a href="${ctx.session.parish.imgPath}">.</a>`,
            getParishControlMenu(ctx)
        );
    } else {
        ctx.reply(
            `${text} <a href="${ctx.session.parish.imgPath}">.</a>`,
            getParishControlMenu(ctx)
        );
    // ctx.answerCbQuery();
    }
};

export const backAction = async (ctx: SessionContext) => {
    await ctx.editMessageText(
        ctx.i18n.t('scenes.parishes.list_of_parishes'),
        getParishesMenu(ctx.session.parishes as IParishResult[])
    );

    await ctx.answerCbQuery();
};

