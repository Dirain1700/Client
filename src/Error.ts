"use strict";

import type { PSAPIErrorType } from "../types/Error";

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

export class PSAPIError extends Error {
    constructor(errorType: PSAPIErrorType, ...args: string[]) {
        let message: string = "";
        switch (errorType) {
            case "EMPTY": {
                message = "Cannot parse" + args[0] ?? " because it is Empty";
                break;
            }

            case "PERMISSION_NOT_FOUND": {
                message = "Permission not found: " + args[0] ?? "";
                break;
            }

            case "NOT_LOGGED_IN": {
                message = "Not logged in: please wait the client logging in";
                break;
            }

            case "PERMISSION_DENIED": {
                message = "Permission denied: Expected " + args[0]! ?? " but got " + args[1]!;
                break;
            }
        }
        super(message);
    }
}
