export interface ILogMessageDetails {
    target: string;
    staff: string;
    action: string;
    isPunish: boolean;
    editRoom: boolean;
    lines?: number;
    duration?: string;
    auth?: string;
    room?: string;
    reason?: string;
}
