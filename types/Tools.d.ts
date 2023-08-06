export interface ILogMessageDetails {
    staff: string;
    action: string;
    isPunish: boolean;
    editRoom: boolean;
    target?: string;
    lines?: number;
    duration?: string;
    auth?: string;
    room?: string;
    reason?: string;
    banwords?: string[];
}
