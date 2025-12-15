import { getParishControlMenu, getParishesMenu } from './helpers';
import logger from '../../util/logger';
import { getBackKeyboard } from '../../util/keyboards';
import { getPasswordlessCode } from '../../providers/search-providers';
import { IParishResult } from '../../providers/search-providers/parish-lookup';
import { SessionContext } from 'telegram-context';
import { refreshCurrentParish } from '../../util/parish-service';


export const parishAction = async (ctx: SessionContext, noEdit: boolean) => {

    // Refresh parish data from API
    const parish = await refreshCurrentParish(ctx);
    if (!parish) {
        logger.error(ctx, 'Failed to refresh parish for user: %s', ctx.session.user._id);
        await ctx.reply('Error: Failed to load parish data');
        return ctx;
    }

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

    // Fetch passwordless code for admin panel access
    const authCode = await getPasswordlessCode(ctx.session.user.email);
    if (!authCode) {
        logger.error(ctx, 'Failed to get passwordless code for user: %s', ctx.session.user._id);
        await ctx.reply('Error: Failed to generate admin panel link');
        return ctx;
    }

    if (noEdit) {

        // no buttons, single parish use cases, no need to replace buttons
        const { backKeyboard } = getBackKeyboard(ctx);
        ctx.replyWithHTML(
            `${text} <a href="${ctx.session.parish.imgPath}">.</a>`,
            getParishControlMenu(ctx, authCode)
        );
    } else {
        ctx.replyWithHTML(
            `${text} <a href="${ctx.session.parish.imgPath}">.</a>`,
            getParishControlMenu(ctx, authCode)
        );
    // ctx.answerCbQuery();
    }
    return ctx;
};

export const backAction = async (ctx: any) => {
    await ctx.editMessageText(
        ctx.i18n.t('scenes.parishes.list_of_parishes'),
        getParishesMenu(ctx.session.parishes as IParishResult[])
    );

    await ctx.answerCbQuery();
};

