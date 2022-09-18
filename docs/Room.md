# Room

```ts
export declare class Room {
    id: string;
    roomid: string | null;
    title: string | null;
    type: "chat" | "battle" | "html";
    visibility: "public" | "hidden" | "secret" | null;
    modchat: AuthLevel | null;
    modjoin: AuthLevel | null;
    auth: {
        [key: string]: string[];
    } | null;
    users: string[] | null;
    intro?: string | null;
    announce: string | null;
    waits: MessageWaits<Room>[];
    readonly isExist: boolean;
    readonly client: Client;
    constructor(init: RoomOptions, client: Client);
    send(content: RoomMessageOptions): Promise<Message<Room>> | void;
    setRoomIntro(html: string): void;
    setAnnounce(content?: string | null): void;
    sendHTML(options: HTMLOptions): void;
    changeHTML(options: HTMLOptions): void;
    deleteMessages(user: string, clear: booleam, lines?: number): Promise<void>;
    awaitMessages(options: awaitMessageOptions<Room>): Promise<Message<Room>[] | null>;
    getRank(userid: string): GroupSymbol;
    isVoice(userid: string): boolean;
    isDriver(userid: string): boolean;
    isMod(userid: string): boolean;
    isBot(userid: string): boolean;
    isOwner(userid: string): boolean;
    isRoomStaff(userid: string): boolean;
    isStaff(user: User): boolean;
}
```

## Properties

### id

```ts
id: string;
```

An id of room.

### roomid

```ts
roomid: string | null;
```

An id of room.

### title

```ts
title: string | null;
```

A title of room. exmple: `日本語 Japanese` `Game Corner`

### type

```ts
type: "chat" | "battle" | "html";
```

Type of room. HTML Page is `html`, Battle Room is `battle`, Normal chat room is `chat`.

### visibility

```ts
visibility: "public" | "hidden" | "secret" | null;
```

Room's visibility. this is null if room is not exist or isn't chat room.

### modchat

```ts
modchat: AuthLevel | null;
```

Modchat Level.

### modjoin

```ts
modjoin: AuthLevel | null;
```

Modjoin level.

### auth

```ts
auth: {
    [key: string]: string[];
} | null;
```

An object contains auths data.
for example:

```ts
auth: {
    "#": ["owner1", "owner2"],
    "@": ["mod1", "mod2"]
}
```

### users

```ts
users: string[] | null;
```

A list of online users.

### intro

```ts
intro?: string | null;
```

Room Intro.

### announce

```ts
announce: string | null;
```

An announce data.

### waits

```ts
waits: MessageWaits < Room > [];
```

A waiting list for `awaitMessages()`. Do not access this property.

### isExist

```ts
readonly isExist: boolean;
```

Whether this room is exist.

### client

```ts
readonly client: Client;
```

Client.

## Methods

### constructor()

```ts
constructor(init: RoomOptions, client: Client);
```

### send()

```ts
send(content: RoomMessageOptions): Promise<Message<Room>> | void;
```

HTMLOptions is here:

```ts
export type HTMLOptions = NormalHTMLOptions | RankHTMLOptions;

export type RankHTMLOptions = RankuHTMLOptions | RankHTMLBoxOptions;

export interface RankuHTMLOptions extends UhtmlOptions {
    allowedDisplay: GroupSymbol;
}

export interface RankHTMLBoxOptions extends HTMLBoxOptions {
    allowedDisplay: GroupSymbol;
}

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

export type GroupSymbol = string & ("~" | "&" | "#" | "★" | "*" | "@" | "%" | "☆" | "§" | "+" | "^" | " " | "‽" | "!");
```

### setRoomIntro()

```ts
setRoomIntro(html: string): void;
```

Set a room intro. required `#`

### setAnnounce()

```ts
setAnnounce(content?: string | null): void;
```

Create / Delete announcements. required `* % @ #`

### sendHTML()

```ts
sendHTML(options: HTMLOptions): void;
```

Send a HTML.

### changeHTML()

```ts
changeHTML(options: HTMLOptions): void;
```

Same as `sendHTML()`.

### deleteMessages()

```ts
deleteMessages(user: string, clear: boolean, lines?: number): Promise<void>;
```

delete user's messages. if `lines` is undefined, deletes all lines.

```ts
awaitMessages(options: awaitMessageOptions<Room>): Promise<Message<Room>[] | null>;
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

### getRank()

```ts
getRank(userid: string): GroupSymbol;
```

Returns GroupSymbol. GroupSymbol is here:

```ts
export type GroupSymbol = string & ("~" | "&" | "#" | "★" | "*" | "@" | "%" | "☆" | "§" | "+" | "^" | " " | "‽" | "!");
```

### isVoice()

```ts
isVoice(userid: string): boolean;
```

Whether userid is in this room's Voices list.

### isDriver()

```ts
isDriver(userid: string): boolean;
```

Whether userid is in this room's Drivers list.

### isMod()

```ts
isMod(userid: string): boolean;
```

Whether userid is in this room's Moderators list.

### isBot()

```ts
isBot(userid: string): boolean;
```

Whether userid is in this room's Bots list.

### isOwner()

```ts
isOwner(userid: string): boolean;
```

Whether userid is in this room's Owners list.

### isRoomStaff()

```ts
isRoomStaff(userid: string): boolean;
```

Whether userid is in this room's Staff list.

### isStaff()

```ts
isStaff(user: User): boolean;
```

Whether userid is in this room's Staff list or `User.group` is `%`, `@`, `*` or `&`.
