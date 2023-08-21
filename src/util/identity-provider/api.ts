import axios from 'axios';
import logger from '../logger';

const axiosInstance = axios.create({
    baseURL: `${process.env.ADMINHOST}/api`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.ADMINBEARER,
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
        logger.error(undefined, 'Error during creating new user %O.', email);
        return undefined;
    }
    const user = response;
    return user;
}
