import { IUser } from '../models/User';
import User from '../models/User';
import { retrieveAccessToken } from '../providers/identity-provider/api';
import logger from './logger';

/**
 * Decode JWT token and extract expiration time
 * @param token - JWT token string
 * @returns expiration timestamp in milliseconds, or 0 if invalid
 */
export function getTokenExpiration(token: string): number {
    try {
        // JWT structure: header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) {
            return 0;
        }

        // Decode the payload (second part)
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        
        // exp is in seconds, convert to milliseconds
        return payload.exp ? payload.exp * 1000 : 0;
    } catch (e) {
        logger.error(undefined, 'Error decoding JWT token: %O', e);
        return 0;
    }
}

/**
 * Extract parish keys from JWT token payload
 * @param token - JWT access token
 * @returns array of parish keys
 */
export function extractParishKeysFromToken(token: string): string[] {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return [];
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        logger.debug(undefined, 'extractParishKeysFromToken -> payload: %O', payload);
        // Extract parish keys from 'parishes' claim directly
        if (payload.parishes) {
            // If parishes is an array
            if (Array.isArray(payload.parishes)) {
                logger.debug(undefined, 'extractParishKeysFromToken -> parishes is an array: %O', payload.parishes);
                return payload.parishes.filter((val: string): val is string => typeof val === 'string');
            }
            // If parishes is an object, extract values
            if (typeof payload.parishes === 'object') {
                logger.debug(undefined, 'extractParishKeysFromToken -> parishes is an object: %O', payload.parishes);
                logger.info(undefined, 'parishes %O', payload.parishes);
                logger.info(undefined, 'extractParishKeysFromToken -> parishes is an object: %O', Object.values(payload.parishes).filter((val): val is string => typeof val === 'string'));
                return Object.values(payload.parishes).filter((val): val is string => typeof val === 'string');
            }
        }
        logger.debug(undefined, 'extractParishKeysFromToken -> no parishes found');
        return [];
    } catch (e) {
        logger.error(undefined, 'Error extracting parish keys from token: %O', e);
        return [];
    }
}

/**
 * Check if token is expired or about to expire
 * @param expiresAt - Expiration timestamp in milliseconds
 * @param bufferSeconds - Buffer time in seconds before considering expired (default: 300 = 5 minutes)
 * @returns true if token is expired or within buffer time
 */
export function isTokenExpired(expiresAt: number, bufferSeconds: number = 300): boolean {
    if (!expiresAt || expiresAt === 0) {
        return true;
    }
    
    const now = Date.now();
    const bufferMs = bufferSeconds * 1000;
    
    return now >= (expiresAt - bufferMs);
}

interface TokenRefreshResult {
    success: boolean;
    accessToken?: string;
    tokenExpiresAt?: number;
    observableParishKeys?: string[];
}

/**
 * Retrieve and process a new access token for a user
 * Extracts expiration and parish keys from the token
 * @param email - User's email address
 * @param userId - User ID for logging
 * @param ctx - Optional context for logging
 * @returns TokenRefreshResult with token data or failure
 */
async function refreshUserToken(email: string, userId: string, ctx?: any): Promise<TokenRefreshResult> {
    const result = await retrieveAccessToken(email);
    
    if (!result.success || !result.accessToken) {
        logger.error(ctx, 'Failed to retrieve token for user %s: %s', userId, result.error);
        return { success: false };
    }

    const accessToken = result.accessToken;
    const tokenExpiresAt = getTokenExpiration(accessToken);
    const observableParishKeys = extractParishKeysFromToken(accessToken);
    
    logger.info(ctx, 'Retrieved token for user %s with %d parishes', userId, observableParishKeys.length);
    
    return {
        success: true,
        accessToken,
        tokenExpiresAt,
        observableParishKeys
    };
}

/**
 * Get a valid access token for the user
 * If token is expired or about to expire, it will be retrieved automatically
 * @param user - User document
 * @returns Valid access token or null if retrieval failed
 */
export async function getValidAccessToken(user: IUser): Promise<string | null> {
    // Check if user has email verified
    if (!user.email || !user.emailVerified) {
        logger.warn(undefined, 'User %s has no verified email', user._id);
        return null;
    }

    // Check if token is null, invalid, or expired/about to expire
    if (!user.accessToken || isTokenExpired(user.tokenExpiresAt)) {
        logger.info(undefined, 'Access token invalid/expired for user %s, retrieving new token...', user._id);
        
        const tokenData = await refreshUserToken(user.email, user._id);
        
        if (!tokenData.success) {
            return null;
        }

        // Update user in database
        try {
            await User.findByIdAndUpdate(user._id, {
                accessToken: tokenData.accessToken,
                tokenExpiresAt: tokenData.tokenExpiresAt,
                observableParishKeys: tokenData.observableParishKeys
            });
            
            // Update the user object reference
            user.accessToken = tokenData.accessToken;
            user.tokenExpiresAt = tokenData.tokenExpiresAt;
            user.observableParishKeys = tokenData.observableParishKeys;
            
            logger.info(undefined, 'Successfully updated token for user %s', user._id);
        } catch (e) {
            logger.error(undefined, 'Error updating user tokens in DB: %O', e);
            return null;
        }
    }

    return user.accessToken;
}

/**
 * Get a valid access token from the context's session user
 * If token is expired or about to expire, it will be retrieved automatically
 * and the session will be updated with new tokens
 * @param ctx - Telegram context with session
 * @returns Valid access token or null if retrieval failed
 */
export async function getValidAccessTokenFromContext(ctx: any): Promise<string | null> {
    const sessionUser = ctx.session.user;
    
    if (!sessionUser) {
        logger.warn(ctx, 'No user found in session');
        return null;
    }

    // Check if user has verified email
    if (!sessionUser.email || !sessionUser.emailVerified) {
        logger.warn(ctx, 'User %s has no verified email', sessionUser._id);
        return null;
    }

    // Check if token is null, invalid, or expired/about to expire
    if (!sessionUser.accessToken || isTokenExpired(sessionUser.tokenExpiresAt)) {
        logger.info(ctx, 'Access token invalid/expired for user %s, retrieving new token...', sessionUser._id);
        
        const tokenData = await refreshUserToken(sessionUser.email, sessionUser._id, ctx);
        
        if (!tokenData.success) {
            return null;
        }

        // Update user in database
        try {
            await User.findByIdAndUpdate(sessionUser._id, {
                accessToken: tokenData.accessToken,
                tokenExpiresAt: tokenData.tokenExpiresAt,
                observableParishKeys: tokenData.observableParishKeys
            });
            
            // Update session user with new tokens and parish keys
            ctx.session.user.accessToken = tokenData.accessToken;
            ctx.session.user.tokenExpiresAt = tokenData.tokenExpiresAt;
            ctx.session.user.observableParishKeys = tokenData.observableParishKeys;
            
            logger.info(ctx, 'Successfully updated token for user %s', sessionUser._id);
        } catch (e) {
            logger.error(ctx, 'Error updating user tokens in DB: %O', e);
            return null;
        }
    }

    return ctx.session.user.accessToken;
}

