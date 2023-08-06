// prettier-ignore
export type ModlogActionType = "warn" | "cleartext" | "roomban" | "blacklist" | "globalban" |
    "lock" | "mute" | "promote" | "demote" | "addbanword" | "removebanword";

// prettier-ignore
export type PromotionAuthType = "Room Voice" | "Room Driver" | "Room Moderator" | "Room Owner" | "Global Voice" | "Global Driver" | "Global Moderator" | "Global Administrator";

interface IBaseLogDetails {
    staff: string;
    action: ModlogActionType;
    target?: string;
    room?: string;
    duration?: "7 minutes" | "an hour" | "2 days" | "a week" | "a year" | "ten years";
    reason?: string;
    auth?: PromotionAuthType;
    banwords?: string[];
    isPunish: boolean;
    editRoom: boolean;
}

interface IWarnDetails extends IBaseLogDetails {
    staff: string;
    action: "warn";
    isPunish: true;
    editRoom: false;
    target: string;
    reason?: string;
}

interface ICleartextDetails extends IBaseLogDetails {
    staff: string;
    action: "cleartext";
    isPunish: false;
    editRoom: false;
    target: string;
    lines?: number;
    room: string;
    reason?: string;
}

export interface IRoomBanDetails extends IBaseLogDetails {
    staff: string;
    action: "roomban";
    isPunish: true;
    editRoom: false;
    target: string;
    duration: "2 days" | "a week";
    room: string;
    reason?: string;
}

export interface IBlacklistDetails extends IBaseLogDetails {
    staff: string;
    action: "blacklist";
    isPunish: true;
    editRoom: false;
    target: string;
    duration: "a year" | "ten years";
    room: string;
    reason?: string;
}

export interface IGlobalBanDetails extends IBaseLogDetails {
    staff: string;
    action: "globalban";
    isPunish: true;
    editRoom: false;
    target: string;
    duration: "7 days";
    reason: string;
}

export interface ILockDetails extends IBaseLogDetails {
    staff: string;
    action: "lock";
    isPunish: true;
    editRoom: false;
    target: string;
    duration: "2 days" | "a week";
    reason?: string;
}

export interface IMuteDetails extends IBaseLogDetails {
    staff: string;
    action: "mute";
    isPunish: true;
    editRoom: true;
    target: string;
    duration: "7 minutes" | "an hour";
    reason?: string;
}

export interface IPromoteDetails extends IBaseLogDetails {
    staff: string;
    action: "promote";
    isPunish: false;
    editRoom: true;
    target: string;
    auth: PromotionAuthType;
}

export interface IDemoteDetails extends IBaseLogDetails {
    staff: string;
    action: "demote";
    isPunish: false;
    editRoom: true;
    target: string;
    auth: PromotionAuthType;
}

export interface IBanWordDetails extends IBaseLogDetails {
    staff: string;
    action: "addbanword" | "removebanword";
    isPunish: false;
    editRoom: false;
    banwords: string[];
}

export interface IUnrecognizedMessage extends IBaseLogDetails {
    action: "unrecognized";
    staff: "";
    isPunish: false;
    editRoom: false;
}

export type ILogMessageDetails =
    | IWarnDetails
    | ICleartextDetails
    | IRoomBanDetails
    | IBlacklistDetails
    | IGlobalBanDetails
    | ILockDetails
    | IMuteDetails
    | IPromoteDetails
    | IDemoteDetails
    | IBanWordDetails
    | IUnrecognizedMessage;
