# Message

```ts
export declare class Message<T extends Room | User | unknown> {
    author: User;
    content: string;
    target: T;
    raw: string;
    id: string;
    command: string | false;
    deletable: boolean;
    time: number;
    type: "Room" | "PM";
    awaited: boolean;
    readonly client: Client;
    constructor(init: MessageInput<T>);
    reply(option: string | UserMessageOptions | RoomMessageOptions): Promise<Message<Room | User>> | null;
    isUserMessage(): this is Message<User>;
    isRoomMessage(): this is Message<Room>;
    isNotUnknown(): this is Message<Room> | Message<User>;
}
```

## Properties

### author

```ts
author: User;
```

A User object. see [User.md](./User.md)

### content

```ts
content: string;
```

A content of Message.

### target

```ts
target: T;
```

An object contains `User` or `Room`.
This is `User` object if message is PM, and this is `Room` if message is chat(room chat).

### raw

```ts
raw: string;
```

A string Client received.
example:

```txt
|c:|1640995200|#Dirain|Hi
```

### id

```ts
id: string;
```

A string of UNIX time stamp.
<span style="color: red">@deprecated</span> <span style="color: gray">Use Message.time instead.</span>

### command

```ts
command: string | false;
```

A variable wheter is the message command. returns `false` or command name.

### deletable

```ts
deletable: boolean;
```

A boolean whether do you have permission to delete this message.

### time

```ts
time: number;
```

An UNIX TimeStamp when message was sent to.

### type

```ts
type: "Room" | "PM";
```

Whether this message is Room chat or PM.

### awaited

```ts
awaited: boolean;
```

Whether this message was awaited by `awaitMessages()` or not.

### client

```ts
readonly client: Client;
```

A Client object. see [Client.md](./Client.md)

## Methods

### constructor()

```ts
constructor(init: MessageInput<T>);
```

A constructor. Please ignore `T` if you using JavaScript.

MessageInput is this object:

```ts
export interface MessageInput<T extends User | Room | unknown> {
    author: User;
    content: string;
    target: T;
    raw: string;
    type: "Room" | "PM";
    time: number;
    client: Client;
}
```

### reply()

```ts
reply(option: string | UserMessageOptions | RoomMessageOptions): Promise<Message<Room | User>> | null;
```

A method to reply message. argument objects are here:

```ts
export type UserMessageOptions = string | NormalHTMLOptions;

export type RoomMessageOptions = string | HTMLOptions;

export type HTMLOptions = NormalHTMLOptions | RankHTMLOptions;

export type NormalHTMLOptions = UhtmlOptions | HTMLBoxOptions;

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
```

### isUserMessage()

```ts
isUserMessage(): this is Message<User>;
```

Returns boolean whether `this.target instanceof User`.

### isRoomMessage()

```ts
isRoomMessage(): this is Message<Room>;
```

Returns boolean whether `this.target instanceof Room`.

### isNotUnknown()

```ts
isNotUnknown(): this is Message<Room> | Message<User>;
```

Returns boolean whether `this.target instanceof User` or `this.target instanceof Room`.
This method is not neccesary for JavaScript, but required for TypeScript.
