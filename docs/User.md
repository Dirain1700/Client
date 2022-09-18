# User

```ts
export declare class User {
    id: string;
    userid: string;
    name: string;
    avatar: string | number | null;
    group: AuthLevel | null;
    customgroup: "Section Leader" | null;
    autoconfirmed: boolean;
    status?: string | null;
    rooms: {
        [key: string]: {
            [key: string]: any;
        };
    } | null;
    friended: boolean;
    online: boolean;
    waits: MessageWaits<User>[];
    alts: string[];
    readonly client: Client;
    constructor(init: UserOptions, client: Client);
    send(content: UserMessageOptions): Promise<Message<User>> | void;
    sendHTML(input: NormalHTMLOptions): void;
    changeHTML(input: NormalHTMLOptions): void;
    awaitMessages(options: awaitMessageOptions<User>): Promise<Message<User>[] | null>;
    get isGlobalVoice(): boolean;
    get isGlobalDriver(): boolean;
    get isGlobalMod(): boolean;
    get isGlobalBot(): boolean;
    get isGlobalAdmin(): boolean;
    get isGlobalStaff(): boolean;
}
```

## Properties

### id

```ts
id: string;
```

An id of user.

### userid

```ts
userid: string;
```

An id of user.

### name

```ts
name: string;
```

A name of user.

### avatar

```ts
avatar: string | number | null;
```

A name or number of avatar.

### group

```ts
group: AuthLevel | null;
```

This is null if the user offline.

```ts
export type GroupSymbol = string & ("~" | "&" | "#" | "★" | "*" | "@" | "%" | "☆" | "§" | "+" | "^" | " " | "‽" | "!");
export type AuthLevel = string & (GroupSymbol | "whitelist" | "unlocked" | "trusted" | "autoconfirmed");
```

### customgroup

```ts
customgroup: "Section Leader" | null;
```

Whether the user is Section Leader or not.

### autoconfirmed

```ts
autoconfirmed: boolean;
```

Whether the user is autoconfirmed.

### status

```ts
status?: string | null;
```

User's status. No status is "" and this is null if the user offline.

### rooms

```ts
rooms: {
    [key: string]: {
        [key: string]: any;
    };
} | null;
```

I can't understand this structure :|

### friended

```ts
friended: boolean;
```

Whether the user and ClientUser are friends.

### online

```ts
online: boolean;
```

Whether the user is online.

### waits

waits: MessageWaits<User>[];

A waiting list for `awaitMessages()`. Do not access this property.

### alts

```ts
alts: string[];
```

A user list of the user. only added when a user renamed.

### client

```ts
readonly client: Client;
```

A Client structure. see [Client.md](./Client.md)

## Methods

### constructor()

```ts
constructor(init: UserOptions, client: Client);
```

Here is UserOptions:

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

### send()

```ts
send(content: UserMessageOptions): Promise<Message<User>> | void;
```

Send a string or HTML.
NormatHTMLOptions is:

```ts
export type NormalHTMLOptions = UhtmlOptions | HTMLBoxOptions;

export interface UhtmlOptions {
    id: string; // HTML ID (required when edit HTML)
    content: string; // HTML body
    edit?: boolean; // edit or not
    box?: undefined; // PLEASE IGNORE THIS. box must be undefined.
}

export interface HTMLBoxOptions {
    id?: undefined; // PLEASE IGNORE THIS. id must be undefined.
    content: string; // HTML body
    edit?: undefined; // PLEASE IGNORE THIS. edit must be undefined.
    box: true; // must be true
}
```

### sendHTML()

```ts
sendHTML(input: NormalHTMLOptions): void;
```

Send a HTML.

### changeHTML()

```ts
changeHTML(input: NormalHTMLOptions): void;
```

Send a HTML. same as `sendHTML()`.

### awaitMessages()

```ts
awaitMessages(options: awaitMessageOptions<User>): Promise<Message<User>[] | null>;
```

Await messages that passed filter.
awaiMessageOptions is:

```ts
export interface awaitMessageOptions<T extends User | Room> {
    filter: (message: Message<T>) => boolean;
    max: number;
    time: number;
}
```

### isGlobalVoice

```ts
get isGlobalVoice(): boolean;
```

Whether this user is Global Voice or not.

### isGlobalDriver

```ts
get isGlobalDriver(): boolean;
```

Whether this user is Global Driver or not.

### isGlobalMod

```ts
get isGlobalMod(): boolean;
```

Whether this user is Global Moderator or not.

### isGlobalBot

```ts
get isGlobalBot(): boolean;
```

Whether this user is Global Bot or not.

### isGlobalAdmin

```ts
get isGlobalAdmin(): boolean;
```

Whether this user is Global Administrator or not.

### isGlobalStaff

```ts
get isGlobalStaff(): boolean;
```

Whether this user is Global Staff or not.
