import {Scenes} from 'telegraf';

import logger from '../../util/logger';
import User, { IUser } from '../../models/User';
import { getMainKeyboard } from '../../util/keyboards';
import { saveToSession, deleteFromSession, cleanUpMessages} from '../../util/session';
import { Markup } from 'telegraf';
import { match } from 'telegraf-i18n';
import { SessionContext } from 'telegram-context';
import { CONFIG } from '../../config';
import { requestAuthCode, verifyAuthCode, retrieveAccessToken } from '../../providers/identity-provider/api';
import { getTokenExpiration, extractParishKeysFromToken } from '../../util/token-manager';

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
        await ctx.reply(ctx.i18n.t('scenes.start.no_menu_click'), {reply_markup: { remove_keyboard: true}});
        return;
    }

    // State machine for auth flow
    if (authState === 'waiting_for_email') {
        await handleEmailInput(ctx, uid, messageText);
    } else if (authState === 'waiting_for_code') {
        await handleCodeInput(ctx, uid, messageText);
    } else {
        // No auth state set, ask for email
        ctx.session.authState = 'waiting_for_email';
        await ctx.reply(ctx.i18n.t('scenes.start.ask_email'));
    }
});

start.action('resend_code', async (ctx: any) => {
    logger.debug(ctx, 'Resend code action triggered');
    
    const email = ctx.session.pendingEmail;
    
    if (!email) {
        logger.error(ctx, 'No pending email found in session for resend code');
        await ctx.answerCbQuery();
        await ctx.reply(ctx.i18n.t('scenes.start.ask_email'));
        ctx.session.authState = 'waiting_for_email';
        return;
    }

    // Request new auth code from API
    const result = await requestAuthCode(email);
    
    if (!result.success) {
        logger.error(ctx, 'Failed to resend auth code for email: %s', email);
        await ctx.answerCbQuery();
        await ctx.reply(ctx.i18n.t('scenes.start.verification_failed'));
        return;
    }

    // Success - code resent
    logger.info(ctx, 'Auth code resent successfully for email: %s', email);
    await ctx.answerCbQuery();
    await ctx.reply(ctx.i18n.t('scenes.start.code_resent'));
    await ctx.reply(ctx.i18n.t('scenes.start.ask_code'));
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

async function handleEmailInput(ctx: any, uid: string, email: string) {
    logger.info(ctx, 'Processing email input: %s for user %s', email, uid);
    
    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
        logger.warn(ctx, 'Invalid email format: %s', email);
        await ctx.reply(ctx.i18n.t('scenes.start.invalid_email'));
        return;
    }

    // Request auth code from API
    const result = await requestAuthCode(email);
    
    if (!result.success) {
        if (result.error === 'email_not_registered') {
            logger.warn(ctx, 'Email not registered: %s', email);
            await ctx.reply(ctx.i18n.t('scenes.start.email_not_registered'));
            // Stay in waiting_for_email state
        } else {
            logger.error(ctx, 'Failed to request auth code for email: %s', email);
            await ctx.reply(ctx.i18n.t('scenes.start.verification_failed'));
        }
        return;
    }

    // Success - code sent
    logger.info(ctx, 'Auth code requested successfully for email: %s', email);
    ctx.session.pendingEmail = email;
    ctx.session.authState = 'waiting_for_code';
    
    await ctx.reply(ctx.i18n.t('scenes.start.email_sent'));
    await ctx.reply(ctx.i18n.t('scenes.start.ask_code'));
}

async function handleCodeInput(ctx: any, uid: string, code: string) {
    const email = ctx.session.pendingEmail;
    
    if (!email) {
        logger.error(ctx, 'No pending email found in session for user %s', uid);
        ctx.session.authState = 'waiting_for_email';
        await ctx.reply(ctx.i18n.t('scenes.start.ask_email'));
        return;
    }

    logger.info(ctx, 'Verifying code for email: %s, user: %s', email, uid);
    
    // Verify code with API
    const result = await verifyAuthCode(email, code.trim());
    if (!result.success) {
        if (result.error === 'invalid_code') {
            logger.warn(ctx, 'Invalid verification code for email: %s', email);
            await ctx.reply(
                ctx.i18n.t('scenes.start.invalid_code'),
                Markup.inlineKeyboard([
                    [Markup.button.callback(ctx.i18n.t('scenes.start.resend_code_button'), 'resend_code')],
                    [Markup.button.callback(ctx.i18n.t('scenes.start.change_email_button'), 'change_email')]
                ])
            );
        } else {
            logger.error(ctx, 'Failed to verify code for email: %s', email);
            await ctx.reply(ctx.i18n.t('scenes.start.verification_failed'));
        }
        return;
    }

    // Success - code is valid, mark email as verified PERMANENTLY
    logger.info(ctx, 'Email verification successful for: %s', email);
    
    // Create or update user with verified email (token retrieval is next step)
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

    // Clean up email verification session state
    delete ctx.session.authState;
    delete ctx.session.pendingEmail;

    // Email verification is complete - now attempt token retrieval
    await attemptTokenRetrieval(ctx, user);
}

async function attemptTokenRetrieval(ctx: any, user: IUser) {
    const uid = user._id;
    const email = user.email;
    
    logger.info(ctx, 'Attempting token retrieval for user %s', uid);
    const tokenResult = await retrieveAccessToken(email);
    
    if (!tokenResult.success || !tokenResult.accessToken) {
        logger.error(ctx, 'Failed to retrieve access token for user %s: %s', uid, tokenResult.error);
        
        // Show polite error message with retry button
        await ctx.reply(
            ctx.i18n.t('scenes.start.token_retrieval_failed'),
            Markup.inlineKeyboard([
                Markup.button.callback(ctx.i18n.t('scenes.start.retry_button'), 'retry_token_retrieval')
            ])
        );
        return;
    }

    const accessToken = tokenResult.accessToken;
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

export default start;
