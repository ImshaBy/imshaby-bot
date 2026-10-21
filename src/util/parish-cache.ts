/**
 * Parish keys assigned to a volunteer, compared without regard to order.
 */
export function sameParishKeySet(
    left: readonly string[] | undefined,
    right: readonly string[] | undefined,
): boolean {
    const normalizedLeft = [...(left ?? [])].sort();
    const normalizedRight = [...(right ?? [])].sort();
    return normalizedLeft.length === normalizedRight.length
        && normalizedLeft.every((key, index) => key === normalizedRight[index]);
}

/**
 * Session parish objects are reusable only while they still cover the keys
 * currently stored on the user. A shorter cached list must be fetched again.
 */
export function parishCacheIsCurrent(
    cached: ReadonlyArray<{ key?: string }> | undefined,
    keys: readonly string[] | undefined,
): boolean {
    if (!cached?.length || !keys?.length) {
        return false;
    }
    const cachedKeys = cached
        .map((parish) => parish.key)
        .filter((key): key is string => typeof key === 'string');
    return sameParishKeySet(cachedKeys, keys);
}
