import {Scenes} from 'telegraf';

import logger from '../../util/logger';
import User, { IUser } from '../../models/User';
import { getMainKeyboard } from '../../util/keyboards';
import { saveToSession, deleteFromSession, cleanUpMessages} from '../../util/session';
import { Markup } from 'telegraf';
import { match } from 'telegraf-i18n';
import { SessionContext } from 'telegram-context';
import { CONFIG } from '../../config';
import { generatePasswordlessCode, retrieveAccessToken } from '../../providers/identity-provider/api';
import { getTokenExpiration, extractParishKeysFromToken } from '../../util/token-manager';
import { sendMessageWithErrorHandling } from '../../util/notifier';

const start = new Scenes.BaseScene<SessionContext>('start');

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

start.enter(async (ctx: any) => {
    logger.debug(ctx, 'Start scene - enter event');
    const uid = String(ctx.from.id);
    const user = await User.findById(uid);

    // Check if user exists and email is verified
    if (user && user.emailVerified) {
        logger.info(ctx, 'User %s already verified with email: %s', uid, user.email);
        
        // Check if user has a valid token
        if (user.accessToken && user.tokenExpiresAt && user.tokenExpiresAt > Date.now()) {
            // User has valid token, everything is good
            saveToSession(ctx, 'user', user);
            saveToSession(ctx, 'language', user.language || CONFIG.bot.lang);
            ctx.i18n.locale(user.language || CONFIG.bot.lang);
            
            await ctx.reply(ctx.i18n.t('scenes.start.already_verified'), Markup.removeKeyboard());
            ctx.scene.leave();
            return;
        }
        
        // User has verified email but no valid token - attempt token retrieval
        logger.info(ctx, 'User %s has verified email but invalid/missing token, attempting retrieval', uid);
        await attemptTokenRetrieval(ctx, user);
        return;
    }

    // Check if authState already exists (scene re-entry after session loss)
    if (ctx.session.authState === 'waiting_for_email') {
        logger.info(ctx, 'User %s re-entering start scene with existing authState, resuming email wait', uid);
        await ctx.reply(ctx.i18n.t('scenes.start.ask_email'), Markup.removeKeyboard());
        return;
    }

    // User not verified, start auth flow
    logger.info(ctx, 'User %s not verified, starting auth flow', uid);
    ctx.session.authState = 'waiting_for_email';
    await ctx.reply(ctx.i18n.t('scenes.start.ask_email'), Markup.removeKeyboard());
});

start.on('message', async (ctx: SessionContext) => {
    logger.debug(ctx, 'Start scene - on message event');
    
    const uid = String(ctx.from.id);
    const authState = ctx.session.authState;
    
    // Get message text
    const messageText = (ctx.message as any).text;
    
    if (!messageText) {
        await ctx.reply(ctx.i18n.t('scenes.start.ask_email'));
        return;
    }

    // Handle /menu command
    if (messageText === '/menu') {
        const user = await User.findById(uid);
        
        // If user is not verified, add inline button to continue with email entry
        if (!user || !user.emailVerified) {
            await ctx.reply(
                ctx.i18n.t('scenes.start.no_menu_click'),
                Markup.inlineKeyboard([
                    [Markup.button.callback(ctx.i18n.t('scenes.start.ask_email'), 'start_email_entry')]
                ])
            );
        } else {
            await ctx.reply(ctx.i18n.t('scenes.start.no_menu_click'), {reply_markup: { remove_keyboard: true}});
        }
        return;
    }

    // State machine for auth flow
    if (authState === 'waiting_for_email') {
        await handleEmailInput(ctx, uid, messageText);
    } else {
        // No auth state set, ask for email
        ctx.session.authState = 'waiting_for_email';
        await ctx.reply(ctx.i18n.t('scenes.start.ask_email'));
    }
});


start.action('start_email_entry', async (ctx: any) => {
    logger.debug(ctx, 'Start email entry action triggered');
    await ctx.answerCbQuery();
    
    // Set auth state and ask for email
    ctx.session.authState = 'waiting_for_email';
    await ctx.reply(ctx.i18n.t('scenes.start.ask_email'));
});

start.action('retry_token_retrieval', async (ctx: any) => {
    logger.debug(ctx, 'Retry token retrieval action triggered');
    await ctx.answerCbQuery();
    
    const uid = String(ctx.from.id);
    const user = await User.findById(uid);
    
    if (!user || !user.email || !user.emailVerified) {
        logger.error(ctx, 'User %s not found or email not verified', uid);
        await ctx.reply(ctx.i18n.t('scenes.start.verification_failed'));
        return;
    }

    await attemptTokenRetrieval(ctx, user);
});

start.action('change_email', async (ctx: any) => {
    logger.debug(ctx, 'Change email action triggered');
    await ctx.answerCbQuery();
    
    // Reset auth state back to email input
    ctx.session.authState = 'waiting_for_email';
    delete ctx.session.pendingEmail;
    
    logger.info(ctx, 'User requested to change email, resetting auth flow');
    await ctx.reply(ctx.i18n.t('scenes.start.ask_email_again'));
});

start.action('contact_admin_no_parishes', async (ctx: any) => {
    logger.debug(ctx, 'Contact admin action triggered - no parishes');
    await ctx.answerCbQuery();
    
    logger.info(ctx, 'User with no parishes redirecting to contact scene');
    await ctx.scene.enter('contact');
});

start.action('change_email_token', async (ctx: any) => {
    logger.debug(ctx, 'Change email action triggered - token retrieval failed');
    await ctx.answerCbQuery();
    
    const uid = String(ctx.from.id);
    const user = await User.findById(uid);
    
    if (!user) {
        logger.error(ctx, 'User %s not found', uid);
        await ctx.reply(ctx.i18n.t('scenes.start.verification_failed'));
        return;
    }
    
    // Reset email verification status and clear token
    await User.findByIdAndUpdate(
        uid,
        {
            emailVerified: false,
            accessToken: undefined,
            tokenExpiresAt: undefined
        }
    );
    
    // Reset auth state back to email input
    ctx.session.authState = 'waiting_for_email';
    delete ctx.session.pendingEmail;
    
    logger.info(ctx, 'User requested to change email after token retrieval failure, resetting auth flow');
    await ctx.reply(ctx.i18n.t('scenes.start.ask_email_again'));
});

start.action('ask_admin_token', async (ctx: any) => {
    logger.debug(ctx, 'Ask admin action triggered');
    await ctx.answerCbQuery();
    
    const uid = String(ctx.from.id);
    const user = await User.findById(uid);
    const pendingEmail = ctx.session.pendingEmail;
    
    // Handle code generation failure (no user yet, but have email)
    if (!user && pendingEmail) {
        logger.info(ctx, 'Sending code generation error to admins for email: %s', pendingEmail);
        await sendCodeGenerationErrorToAdmins(ctx, pendingEmail);
        // Send specific message for code generation failure context
        await ctx.reply(ctx.i18n.t('scenes.start.admin_notified_code_generation'));
        return;
    }
    
    // Handle case when user is not found in database
    if (!user || !user.email) {
        logger.error(ctx, 'User %s not found or no email in database', uid);
        
        // Send admin notification with context data
        await sendUserNotFoundErrorToAdmins(ctx, pendingEmail);
        
        await ctx.reply(ctx.i18n.t('scenes.start.verification_failed'));
        await ctx.reply(ctx.i18n.t('scenes.start.admin_notified'));
        return;
    }
    
    // Send message to admins
    await sendTokenErrorToAdmins(ctx, user);
    
    // Send specific message for token retrieval failure context
    await ctx.reply(ctx.i18n.t('scenes.start.admin_notified_token_retrieval'));
});

async function handleEmailInput(ctx: any, uid: string, email: string) {
    logger.info(ctx, 'Processing email input: %s for user %s', email, uid);
    
    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
        logger.warn(ctx, 'Invalid email format: %s', email);
        await ctx.reply(ctx.i18n.t('scenes.start.invalid_email'));
        return;
    }

    // Generate passwordless code (this serves as email verification)
    const codeResult = await generatePasswordlessCode(email);
    
    if (!codeResult.success || !codeResult.code) {
        logger.warn(ctx, 'Failed to generate passwordless code for email: %s, error: %s', email, codeResult.error);
        
        // Show error message with action buttons
        await ctx.reply(
            ctx.i18n.t('scenes.start.email_not_registered'),
            Markup.inlineKeyboard([
                [
                    Markup.button.callback(ctx.i18n.t('scenes.start.change_email_button'), 'change_email'),
                    Markup.button.callback(ctx.i18n.t('scenes.start.ask_admin_button'), 'ask_admin_token')
                ]
            ])
        );
        // Stay in waiting_for_email state
        return;
    }

    // Code generated successfully - email exists and is verified
    logger.info(ctx, 'Passwordless code generated successfully for email: %s (email verified)', email);
    
    // Create or update user with verified email
    const now = Date.now();
    let user = await User.findById(uid);
    
    if (user) {
        // Update existing user - mark email as verified
        user = await User.findByIdAndUpdate(
            uid,
            {
                email: email,
                emailVerified: true,
                lastActivity: now
            },
            { new: true }
        );
        logger.info(ctx, 'Updated existing user %s with verified email', uid);
    } else {
        // Create new user with verified email
        user = new User({
            _id: uid,
            created: now,
            username: ctx.from.username,
            name: `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim(),
            email: email,
            emailVerified: true,
            lastActivity: now,
            language: CONFIG.bot.lang
        });
        await user.save();
        logger.info(ctx, 'Created new user %s with verified email', uid);
    }

    // Clean up session state
    delete ctx.session.authState;
    delete ctx.session.pendingEmail;

    // Email verification complete - now attempt token retrieval
    await attemptTokenRetrieval(ctx, user);
}


async function attemptTokenRetrieval(ctx: any, user: IUser) {
    const uid = user._id;
    const email = user.email;
    
    logger.info(ctx, 'Attempting token retrieval for user %s', uid);
    const tokenResult = await retrieveAccessToken(email);
    
    if (!tokenResult.success || !tokenResult.accessToken) {
        logger.error(ctx, 'Failed to retrieve access token for user %s: %s', uid, tokenResult.error);
        
        // Show polite error message with three action buttons
        await ctx.reply(
            ctx.i18n.t('scenes.start.token_retrieval_failed'),
            Markup.inlineKeyboard([
                [Markup.button.callback(ctx.i18n.t('scenes.start.retry_button'), 'retry_token_retrieval')],
                [
                    Markup.button.callback(ctx.i18n.t('scenes.start.change_email_button'), 'change_email_token'),
                    Markup.button.callback(ctx.i18n.t('scenes.start.ask_admin_button'), 'ask_admin_token')
                ]
            ])
        );
        return;
    }

    const accessToken = tokenResult.accessToken;
    logger.info(ctx, 'Access token %s for user %s', accessToken, email);
    const tokenExpiresAt = getTokenExpiration(accessToken);
    const parishKeys = extractParishKeysFromToken(accessToken);
    
    logger.info(ctx, 'Extracted %d parish keys from token for user %s', parishKeys.length, uid);

    // Check if user has any parishes assigned
    if (!parishKeys || parishKeys.length === 0) {
        logger.warn(ctx, 'User %s has no parishes assigned in token', uid);
        
        // Update user with token but no parishes
        await User.findByIdAndUpdate(
            uid,
            {
                accessToken: accessToken,
                tokenExpiresAt: tokenExpiresAt,
                observableParishKeys: []
            }
        );
        
        // Show message about no parishes with contact button
        await ctx.reply(
            ctx.i18n.t('scenes.start.no_parishes_assigned'),
            Markup.inlineKeyboard([
                Markup.button.callback(ctx.i18n.t('scenes.start.contact_admin_button'), 'contact_admin_no_parishes')
            ])
        );
        return;
    }

    // Update user with token and parish keys
    const updatedUser = await User.findByIdAndUpdate(
        uid,
        {
            accessToken: accessToken,
            tokenExpiresAt: tokenExpiresAt,
            observableParishKeys: parishKeys
        },
        { new: true }
    );

    // Save user to session
    saveToSession(ctx, 'user', updatedUser);
    saveToSession(ctx, 'language', updatedUser.language || CONFIG.bot.lang);
    ctx.i18n.locale(updatedUser.language || CONFIG.bot.lang);

    // Welcome message
    await ctx.reply(ctx.i18n.t('scenes.start.verification_success'), Markup.removeKeyboard());
    await ctx.reply(ctx.i18n.t('scenes.start.bot_description'), {
        parse_mode: 'HTML',
        ...Markup.removeKeyboard()
    });
    
    // Leave the scene
    ctx.scene.leave();
}

start.leave(async (ctx: any) => {
    const { mainKeyboard } = getMainKeyboard(ctx);
    saveToSession(ctx, "__scenes", {});
    cleanUpMessages(ctx);

    await ctx.reply(ctx.i18n.t('shared.what_next'), mainKeyboard);
});

start.hears(match('keyboards.back_keyboard.back'), start.leave());
start.command('saveme', start.leave());

/**
 * Sends user not found error details to all administrators
 *
 * @param ctx - telegram context
 * @param email - optional email from session if available
 */
async function sendUserNotFoundErrorToAdmins(ctx: any, email?: string) {
    const msg = `🔴 User Not Found Error\n\n` +
        `Валанцёр: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
        `Username 🔎: @${ctx.from.username || 'N/A'}\n` +
        `UserID 🔑: ${ctx.from.id}\n` +
        `Email 📧: ${email || 'Not provided'}\n\n` +
        `📍 Этап памылкі: Запыт дапамогі адміністратара (карыстальнік не знойдзены ў базе даных)\n\n` +
        `Праблема: Карыстальнік націснуў кнопку "Звярнуцца да адміністратара", але запіс карыстальніка не знойдзены ў базе даных. ` +
        `Магчымыя прычыны: карыстальнік не завяршыў рэгістрацыю, даныя былі выдалены, або памылка базы даных.\n\n` +
        `Калі ласка, праверце статус карыстальніка і дапамажыце з даступам.`;
    
    const adminIds = process.env.ADMIN_IDS;
    if (!adminIds) {
        logger.error(ctx, 'ADMIN_IDS not configured');
        return;
    }
    
    const adminIdsArr = adminIds.split(',');
    for await (const adminId of adminIdsArr) {
        await sendMessageWithErrorHandling(adminId, msg);
    }
    
    logger.info(ctx, 'User not found error notification sent to admins for user ID: %s', ctx.from.id);
}

/**
 * Sends code generation error details to all administrators
 *
 * @param ctx - telegram context
 * @param email - email address that failed code generation
 */
async function sendCodeGenerationErrorToAdmins(ctx: any, email: string) {
    const msg = `🔴 Email Verification Error (Code Generation Step)\n\n` +
        `Валанцёр: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
        `Username 🔎: @${ctx.from.username || 'N/A'}\n` +
        `UserID 🔑: ${ctx.from.id}\n` +
        `Email 📧: ${email}\n\n` +
        `📍 Этап памылкі: Генерацыя кода для passwordless аўтэнтыфікацыі (этап праверкі email)\n\n` +
        `Праблема: Карыстальнік увёў няправільны email або email не існуе ў сістэме. ` +
        `Код для passwordless аўтэнтыфікацыі не можа быць згенераваны, бо email не зарэгістраваны ў FusionAuth.\n\n` +
        `Калі ласка, праверце ці існуе гэты email у сістэме і дапамажыце карыстальніку з рэгістрацыяй або даступам.`;
    
    const adminIds = process.env.ADMIN_IDS;
    if (!adminIds) {
        logger.error(ctx, 'ADMIN_IDS not configured');
        return;
    }
    
    const adminIdsArr = adminIds.split(',');
    for await (const adminId of adminIdsArr) {
        await sendMessageWithErrorHandling(adminId, msg);
    }
    
    logger.info(ctx, 'Code generation error notification sent to admins for email: %s', email);
}

/**
 * Sends token retrieval error details to all administrators
 *
 * @param ctx - telegram context
 * @param user - user object with email and verification status
 */
async function sendTokenErrorToAdmins(ctx: any, user: IUser) {
    const msg = `🔴 Token Retrieval Error (Token Exchange Step)\n\n` +
        `Валанцёр: ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
        `Username 🔎: @${ctx.from.username || 'N/A'}\n` +
        `UserID 🔑: ${ctx.from.id}\n` +
        `Email 📧: ${user.email}\n` +
        `Email Verified: ${user.emailVerified ? 'Yes' : 'No'}\n\n` +
        `📍 Этап памылкі: Абмен кода на access token (пасля пацверджання email)\n\n` +
        `Праблема: Карыстальнік пацвердзіў email, але не можа атрымаць access token. ` +
        `Магчымыя прычыны: бэкэнд не адказвае, карыстальнік заблакаваны, або іншыя тэхнічныя праблемы.\n\n` +
        `Калі ласка, праверце статус карыстальніка і дапамажыце з доступам.`;
    
    const adminIds = process.env.ADMIN_IDS;
    if (!adminIds) {
        logger.error(ctx, 'ADMIN_IDS not configured');
        return;
    }
    
    const adminIdsArr = adminIds.split(',');
    for await (const adminId of adminIdsArr) {
        await sendMessageWithErrorHandling(adminId, msg);
    }
    
    logger.info(ctx, 'Token error notification sent to admins for user %s', user._id);
}

export default start;
