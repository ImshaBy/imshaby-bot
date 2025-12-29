import { compareTwoStrings } from 'string-similarity';
import { CONFIG } from '../config';

/**
 * Pauses execution for given amount of seconds
 *
 * @param sec - amount of seconds
 */
export function sleep(sec: number) {
    return new Promise(resolve => setTimeout(resolve, sec * 1000));
}

/**
 * Checks whether given number is in range of base plus/minus step
 *
 * @param number - number to check
 * @param base - base number to compare with
 * @param step - range for a number
 */
export function isNumberInRage(number: number, base: number, step = 1) {
    return number >= base - step && number <= base + step;
}

/**
 * Lowercases strings and checks whether string 1 is equal to string 2 or
 * whether string 1 contains string 2 or
 * whether string similarity is more than 80%
 *
 * @param a - string to compare
 * @param b - string to compare
 */
export function checkStringSimilarity(a: string, b: string) {
    const first = a.toLocaleLowerCase();
    const second = b.toLocaleLowerCase();

    if (first === second) return true;

    return compareTwoStrings(first, second) >= 0.75;
}

/**
 * Constructs the admin panel callback URL with authentication code and parish key
 * @param authCode - passwordless authentication code
 * @param parishKey - the parish key identifier
 */
export function buildAdminPanelUrl(authCode: string, parishKey: string): string {
    return `${CONFIG.admin.url}/callback?code=${authCode}&parish=${parishKey}`;
}
