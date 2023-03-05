export type Dict<T> = Record<string, T>;

export type valueof<T> = T[keyof T];

/* Credit to @sirDonovan - https://github.com/sirDonovan/Lanette/blob/ebe56d261b515a0dee1307a63da48f7f312c3b26/src/types/type-utils.d.ts */

type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;

type PromiseReject<T> = (reason: T) => void;

/* End of credit */
