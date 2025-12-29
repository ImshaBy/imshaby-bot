import { IParishResult } from '../providers/search-providers/parish-lookup';
import { parishesLookupByKey } from '../providers/search-providers';
import { getValidAccessTokenFromContext } from './token-manager';
import { saveToSession } from './session';
import logger from './logger';

/**
 * Get all parishes for the current user from their observableParishKeys
 * Results are cached in session for subsequent calls
 * 
 * @param ctx - Telegram context with session
 * @returns Array of parish results
 */
export async function getUserParishes(ctx: any): Promise<IParishResult[]> {
    // Return cached parishes if available
    if (ctx.session.parishes) {
        logger.debug(ctx, 'Returning cached parishes from session');
        return ctx.session.parishes as IParishResult[];
    }

    // Get valid access token FIRST - this may update observableParishKeys in session
    const accessToken = await getValidAccessTokenFromContext(ctx);
    if (!accessToken) {
        logger.error(ctx, 'Failed to get valid access token for user: %s', ctx.session.user?._id);
        return [];
    }

    // Get parish keys AFTER token refresh to ensure we have the latest keys
    const parishKeys = ctx.session.user?.observableParishKeys;
    
    if (!parishKeys || parishKeys.length === 0) {
        logger.debug(ctx, 'No parish keys found for user');
        return [];
    }

    logger.debug(ctx, 'Fetching parishes for keys: %O', parishKeys);

    try {
        const parishes = await fetchParishesByKeys(parishKeys, accessToken, ctx);
        
        // Cache parishes in session
        if (parishes.length > 0) {
            saveToSession(ctx, 'parishes', parishes);
        }

        return parishes;
    } catch (e) {
        logger.error(ctx, 'Failed to fetch user parishes: %O', e);
        return [];
    }
}

/**
 * Get a single parish by its key
 * 
 * @param ctx - Telegram context with session
 * @param parishKey - The parish key to look up
 * @returns The parish result or null if not found
 */
export async function getParishByKey(ctx: any, parishKey: string): Promise<IParishResult | null> {
    // Get valid access token
    const accessToken = await getValidAccessTokenFromContext(ctx);
    if (!accessToken) {
        logger.error(ctx, 'Failed to get valid access token for user: %s', ctx.session.user?._id);
        return null;
    }

    try {
        const parishes = await parishesLookupByKey(parishKey, accessToken);
        return parishes.length > 0 ? parishes[0] : null;
    } catch (e) {
        logger.error(ctx, 'Failed to fetch parish by key %s: %O', parishKey, e);
        return null;
    }
}

/**
 * Refresh the current parish data from API and update session
 * 
 * @param ctx - Telegram context with session
 * @returns The updated parish or null if failed
 */
export async function refreshCurrentParish(ctx: any): Promise<IParishResult | null> {
    const parishKey = ctx.session.parish?.key;
    
    if (!parishKey) {
        logger.warn(ctx, 'No current parish in session to refresh');
        return null;
    }

    const parish = await getParishByKey(ctx, parishKey);
    
    if (parish) {
        saveToSession(ctx, 'parish', parish);
    }

    return parish;
}

/**
 * Clear cached parishes from session
 * Use this when parishes need to be re-fetched
 * 
 * @param ctx - Telegram context with session
 */
export function clearParishCache(ctx: any): void {
    if (ctx.session.parishes) {
        delete ctx.session.parishes;
        logger.debug(ctx, 'Parish cache cleared');
    }
}

/**
 * Fetch multiple parishes by their keys
 * 
 * @param parishKeys - Array of parish keys
 * @param accessToken - Valid access token
 * @param ctx - Optional context for logging
 * @returns Array of parish results
 */
async function fetchParishesByKeys(
    parishKeys: string[],
    accessToken: string,
    ctx?: any
): Promise<IParishResult[]> {
    const parishes: IParishResult[] = [];

    for (const parishKey of parishKeys) {
        logger.debug(ctx, 'Fetching parish: %s', parishKey);
        const tempParishes = await parishesLookupByKey(parishKey, accessToken);
        parishes.push(...tempParishes);
    }

    logger.debug(ctx, 'Fetched %d parishes', parishes.length);
    return parishes;
}

