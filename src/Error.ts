export class TimeoutError extends Error {
    constructor(message: string, options?: ErrorOptions | undefined) {
        message += " Promise was rejected by automatic timer.";
        super(message, options);
    }
}
