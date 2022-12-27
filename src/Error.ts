"use strict";

export class TimeoutError extends Error {
    constructor(message: string, options?: ErrorOptions | undefined) {
        message = `Promise ${message} was rejected by automatic timer.`;
        super(message, options);
    }
}

export class AccessError extends Error {
    constructor(message: string, reason: string, options?: ErrorOptions | undefined) {
        message = `Promise ${message} was rejected by PS system: ${reason}`;
        super(message, options);
    }
}
