import axios from 'axios';
import logger from '../../util/logger';
import { CONFIG } from '../../config';

const axiosInstance = axios.create({
    baseURL: `${process.env.ADMINHOST}/api`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `${process.env.ADMINBEARER}`,
    }
});

const authAxiosInstance = axios.create({
    baseURL: `${CONFIG.api.internalHost}/api`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.api.internalKey,
    }
});

const passwordlessAxiosInstance = axios.create({
    baseURL: `${CONFIG.api.internalHost}/api`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.api.internalKey,
    }
});

export async function registerUser(email: string, defaultParish: string, parishes?: string[]) {
    const url = '/user/registration';
    const body = {
        'registration': {
            'applicationId': process.env.APPLICATIONID,
            'roles': ['Volunteer'],
            'username': email,
        },
        'applicationId': process.env.APPLICATIONID,
        'skipVerification': true,
        'user': {
            'password': process.env.DEFAULTPASSWORD,
            'email': email,
            'data': {
                'defaultParish': defaultParish,
                'parishes': parishes ? parishes.map((parish, index) => ({
                    [index]: parish
                })) : []
            }
        }
    };

    let response;

    try {
        response = await axiosInstance.post(
            url,
            body
        ).then(res => res.data);
    } catch (e) {
        logger.debug(undefined, '%0', e);
        logger.debug(undefined, '%0', e.response.data);
        logger.error(undefined, 'Error creating new user: %O.', email);
        return undefined;
    }
    const user = response;
    return user;
}

export async function generatePasswordlessCode(email: string): Promise<{
    success: boolean;
    code?: string;
    error?: string;
}> {
    const url = '/passwordless/code';
    const body = { email };

    try {
        const response = await passwordlessAxiosInstance.post(url, body);
        
        // Check if code exists in response
        if (response.data?.code) {
            logger.info(undefined, 'Successfully generated passwordless code for email: %O', email);
            return {
                success: true,
                code: response.data.code
            };
        } else {
            // Empty response (200 OK with empty body) - user not found (security measure)
            logger.warn(undefined, 'No code returned from passwordless/code API for email: %O (user not found)', email);
            return {
                success: false,
                error: 'user_not_found'
            };
        }
    } catch (e: any) {
        logger.error(undefined, 'Error generating passwordless code for email: %O. Error: %O', email, e);
        
        // Handle specific error cases
        if (e.response?.status === 400) {
            return { success: false, error: 'validation_error' };
        }
        if (e.response?.status === 401 || e.response?.status === 403) {
            return { success: false, error: 'authentication_error' };
        }
        
        return { success: false, error: 'generation_failed' };
    }
}

export async function retrieveAccessToken(email: string): Promise<{
    success: boolean;
    accessToken?: string;
    error?: string;
}> {
    try {
        // Step 1: Request passwordless code
        const codeResponse = await passwordlessAxiosInstance.post('/passwordless/code', { email });
        if (!codeResponse.data?.code) {
            logger.error(undefined, 'No code returned from passwordless/code API for email: %O', email);
            return { success: false, error: 'no_code_returned' };
        }
        
        const code = codeResponse.data.code;
        logger.info(undefined, 'Retrieved passwordless code for email: %O', email);
        
        // Step 2: Exchange code for JWT token
        const tokenResponse = await authAxiosInstance.post('/passwordless/login', { code });
        
        if (!tokenResponse.data?.token) {
            logger.error(undefined, 'No token returned from passwordless/login for email: %O', email);
            return { success: false, error: 'no_token_returned' };
        }
        
        logger.info(undefined, 'Successfully retrieved access token for email: %O', email);
        return {
            success: true,
            accessToken: tokenResponse.data.token
        };
    } catch (e: any) {
        logger.error(undefined, 'Error retrieving access token for email: %O. Error: %O', email, e);
        return { success: false, error: 'retrieval_failed' };
    }
}
