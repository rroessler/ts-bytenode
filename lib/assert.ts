/**
 * Coordinates asserting if values are truthy.
 * @param value                             Value to assert.
 * @param message                           Assertion message.
 */
export function Assert(value: any, message?: string): asserts value {
    // stop if the value is truthy
    if (!!value) return;

    // otherwise error our
    throw new Error(`Assertion Failed > ${message ?? 'Not truthy!'}`);
}

export namespace Assert {
    //  PUBLIC METHODS  //

    /**
     * Checks if a value is falsey.
     * @param value                             Value to assert.
     * @param message                           Assertion message.
     */
    export const falsey = (value: any, message?: string) => Assert(!value, message);
}
