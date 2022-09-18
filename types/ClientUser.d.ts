export interface UserSettings {
    blockChallenges?: boolean;
    blockPMs?: boolean;
    ignoreTickets?: boolean;
    hideBattlesFromTrainerCard?: boolean;
    blockInvites?: boolean;
    doNotDisturb?: boolean;
    blockFriendRequests?: false;
    allowFriendNotifications?: boolean;
    displayBattlesToFriends?: boolean;
    hideLogins?: boolean;
    hiddenNextBattle?: boolean;
    inviteOnlyNextBattle?: boolean;
    language?:
        | "german"
        | "english"
        | "spanish"
        | "french"
        | "italian"
        | "dutch"
        | "portuguese"
        | "turkish"
        | "hindi"
        | "japanese"
        | "simplifiedchinese"
        | "traditionalchinese";
}
