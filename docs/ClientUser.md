# ClientUser

<span style="font-size: 1.2rem">Info: This class is extended from User Class.
See <a href="./User.md">User.md</a> before reading this.</span>

```ts
export declare class ClientUser extends User {
    trusted: boolean;
    settings: UserSettings;
    constructor(init: UserOptions, client: Client);
    setAvatar(avatar: string | number): Promise<User>;
    setStatus(status: string): null | Promise<User>;
    setSettings(data: UserSettings): void;
}
```

## Properties

### trusted

```ts
trusted: boolean;
```

Whether ClientUser is trusted user or not.

### settings

```ts
settings: UserSettings;
```

UserSettings object is here:

```ts
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
```

## Methods

### constructor()

```ts
constructor(init: UserOptions, client: Client);
```

UserOptions object is here:

```ts
export interface UserOptions {
    id: string;
    userid: string;
    name: string;
    avatar?: string | number;
    group?: AuthLevel;
    customgroup?: "Section Leader" | null;
    autoconfirmed?: boolean;
    status?: string | null;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    rooms: { [key: string]: any } | false;
    friended?: boolean;
    waits?: MessageWaits<User>[];
    client?: Client;
}
```

### setAvatar()

```ts
setAvatar(avatar: string | number): Promise<User>;
```

Sets a avatar. Do not make typo.

### setStatus()

```ts
setStatus(status: string): null | Promise<User>;
```

Sets a status. please follow the rules.

### setSettings()

```ts
setSettings(data: UserSettings): void;
```

Sets a settings. UserSettings object is here:

```ts
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
```
