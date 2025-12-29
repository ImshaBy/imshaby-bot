import { IMassDay, IParishResult, IExpiredParish } from './parish-lookup';
import logger from '../../util/logger';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Internal axios instance for endpoints that use API key authentication
 */
const internalAxiosInstance = axios.create({
    baseURL: `${process.env.INTERNAL_APIHOST}/api`,
    timeout: 10000,
    headers: {
        'User-Agent': 'telegram-bot',
        'Content-Type': 'application/json',
        'x-api-key': `${process.env.INTERNAL_API_KEY}`
    }
});

/**
 * Authenticated axios instance for endpoints that use Bearer token authentication
 * Note: Authorization header is passed per-request, not configured here
 */
const authenticatedAxiosInstance = axios.create({
    baseURL: `${process.env.INTERNAL_APIHOST}/api`,
    timeout: 10000,
    headers: {
        'User-Agent': 'telegram-bot',
        'Content-Type': 'application/json',
        'x-show-pending': true,
    }
});

/**
 * Create request config with Bearer token authentication
 * @param accessToken - JWT access token
 * @returns Axios request config with Authorization header
 */
function getAuthConfig(accessToken: string): AxiosRequestConfig {
    return {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    };
}

/**
 * Returns parish details using API
 *
 * @param parishId - Parish ID
 * @param accessToken - JWT access token for authentication
 */
export async function parishLookup(parishId: string, accessToken: string): Promise<IParishResult> {
    const url = `/parish/${parishId}`;

    let response;

    try {
        response = await authenticatedAxiosInstance.get(url, getAuthConfig(accessToken)).then(res => res.data);
    } catch (e) {
        logger.error(undefined, 'Error during fetching parish details %O. %O', parishId, e);
        return undefined;
    }

    const item = JSON.parse(response);
    return {
        id: item.id,
        title: item.name,
        updatePeriodInDays: item.updatePeriodInDays,
        address: item.address,
        broadcastUrl: item.broadcastUrl,
        email: item.email,
        lastMassActualDate: item.lastMassActualDate,
        lastModifiedDate: item.lastModifiedDate,
        needUpdate: item.needUpdate,
        phone: item.phone,
        website: item.website,
        key: item.key,
        imgPath: item.imgPath
    };
}

export async function getAllNeedToUpdateParishKeys(accessToken: string): Promise<{
  expiredParishes: IExpiredParish[];
  almostExpiredParishes: IExpiredParish[];
}> {
  const url = 'parish/expired';
  let response;
  try {
    response = await authenticatedAxiosInstance.get(url, getAuthConfig(accessToken)).then((res) => res.data);
    return response;
  } catch (e) {
    logger.error(undefined, 'Error during fetching expired masses. %O', e);
  }
}

/**
 * Returns parish details using API
 *
 * @param parishKey - Parish key
 * @param accessToken - JWT access token for authentication
 */
export async function parishesLookupByKey(parishKey: string, accessToken: string): Promise<IParishResult[]> {
    const url = `/parish?filter=key==${parishKey}`;

    let response;

    try {
        response = await authenticatedAxiosInstance.get(url, getAuthConfig(accessToken))
        .then(res => {
            logger.debug(undefined, 'parishesLookupByKey -> response: %O', res);
            return res.data;
        });
       logger.debug(undefined, 'parishesLookupByKey -> response: %O', response);
        return response.map((item: any) => ({
                id: item.id,
                title: item.name,
                updatePeriodInDays: item.updatePeriodInDays,
                address: item.address,
                broadcastUrl: item.broadcastUrl,
                email: item.email,
                lastMassActualDate: item.lastMassActualDate,
                lastModifiedDate: item.lastModifiedDate,
                needUpdate: item.needUpdate,
                phone: item.phone,
                key: item.key,
                website: item.website,
                imgPath: item.imgPath
            }));
    } catch (e) {
        logger.error(undefined, 'Error during fetching parish details by key %O. Error:  %O', parishKey, e);
    }
    return [];
}

export async function sheduleByParishId(parishId: string, accessToken: string): Promise<IMassDay[]> {
    const url = `/mass/week?parishId=${parishId}`;

    let response;

    try {
        response = await authenticatedAxiosInstance.get(url, getAuthConfig(accessToken)).then(res => res.data);

        if ( response.schedule && response.schedule.length > 0) {
            return Object.values(response.schedule)
                .map((item: any) => ({
                    date: item.date,
                    dayOfweek: '',
                    massHours: item.massHours.map((massHourObj: any ) => massHourObj.hour)
                }));
        }
    } catch (e) {
        logger.error(undefined, 'Error during fetching parish details by key %O. %O', parishId, e);
    }
    return [];
}

export async function getPasswordlessToken(code: string, callback: (token:string) => void) {
    return "code";
}

export async function getPasswordlessCode2(email: string, callback: (code:string) => void) {
    const url = `/passwordless/code`;
    try {
        await internalAxiosInstance.post(url, JSON.stringify({'email': email})).then(res => callback(res.data.code));
    } catch (e) {
        logger.error(undefined, 'Error during getting passwordless code by email : %O. Error:  %O', email, e);
    }
}

export async function getPasswordlessCode(email: string): Promise<any> {
    const url = `/passwordless/code`;
    try {
       return await internalAxiosInstance.post(url, JSON.stringify({'email': email})).then(res => (res.data.code));
    } catch (e) {
        logger.error(undefined, 'Error during getting passwordless code by email : %O. Error:  %O', email, e);
    }
}


export async function makeMassesActual(parishId: string, accessToken: string): Promise<any> {
    const url = `/mass?parishId=${parishId}`;
    try {
        return await authenticatedAxiosInstance.put(url, {}, getAuthConfig(accessToken)).then(res => res.data);
    } catch (e) {
        logger.error(undefined, 'Error during updating masses in parish by parish ID : %O. Error:  %O', parishId, e);
    }
}
