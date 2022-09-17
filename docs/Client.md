# Client

```ts
export declare class Client extends EventEmitter {
    readonly options: ClientOptions;
    private loggedIn;
    readonly serverURL: string;
    readonly serverId: string;
    readonly actionURL: url.URL;
    readonly mainServer: string;
    messageInterval: 100 | 300;
    webSocket: any;
    events: ClientEventNames;
    rooms: Map<string, Room>;
    users: Map<string, User>;
    user: ClientUser | null;
    status: StatusType;
    connected: boolean;
    closed: boolean;
    trusted: boolean;
    formats: {
        [key: string]: string[];
    };
    private userdetailsQueue;
    private roominfoQueue;
    resolvedRoom: string[];
    resolvedUser: string[];
    private PromisedPM;
    private PromisedChat;
    private challstr;
    constructor(options: ClientOptions);
    on<T extends keyof ClientEvents>(event: T, listener: (...args: ClientEvents[T]) => void): this;
    on<U extends string | symbol>(event: Exclude<U, keyof ClientEvents>, listener: (...args: any[]) => void): this;
    once<T extends keyof ClientEvents>(event: T, listener: (...args: ClientEvents[T]) => void): this;
    once<U extends string | symbol>(event: Exclude<U, keyof ClientEvents>, listener: (...args: any[]) => void): this;
    emit<T extends keyof ClientEvents>(event: T, ...args: ClientEvents[T]): boolean;
    emit<U extends string | symbol>(event: Exclude<U, keyof ClientEvents>, ...args: unknown[]): boolean;
    connect(): void;
    logout(): void;
    disconnect(): void;
    private setEventListeners;
    private setMessageInterval;
    private login;
    upkeep(): void;
    send(content: string): void;
    sendArray(contents: string[]): Promise<void>;
    sendUser(user: string, input: string | UserMessageOptions): Promise<Message<User>> | null;
    sendRoom(room: string, input: string | RoomMessageOptions): Promise<Message<Room>> | null;
    joinRoom(roomid: string): Promise<Room>;
    leaveRoom(roomid: string): Room;
    onMessage(message: string): Promise<void>;
    parseMessage(rawMessage: string, room: Room | null): Promise<void>;
    fetchUser(userid: string, useCache?: boolean): Promise<User>;
    getUser(id: string): User | null;
    addUser(input: UserOptions): User | null;
    fetchRoom(roomid: string, force?: boolean): Promise<Room>;
    getRoom(roomid: string): Room | null;
    addRoom(input: RoomOptions): Room;
}
```

## properties

### options

```ts
readonly options: ClientOptions;
```

This property is readonly.

### loggedIn

```ts
private loggedIn: boolean;
```

This property is private. Do not access.

### serverURL

```ts
readonly serverURL: string;
```

This property is readonly.

### serverId

```ts
readonly serverId: string;
```

This property is readonly.

### actionURL

```ts
readonly actionURL: url.URL;
```

This property is readonly.

### mainServer

```ts
readonly mainServer: string;
```

This property is readonly.

### messageInterval

```ts
messageInterval: 100 | 300;
```

A variable for customize interval to sending whether is this client trusted.
100ms for Trusted users, 300ms for untrusted users.

### webSocket

```ts
webSocket: any;
```

A variable for `new webSocket()`.

### events

```ts
events: ClientEventNames;
```

An Object for this interface:

```ts
export interface ClientEventNames {
    READY: "ready";
    QUERY_RESPONSE: "queryResponse";
    RAW_DATA: "rawData";
    MESSAGE_CREATE: "messageCreate";
    MESSAGE_DELETE: "messageDelete";
    ROOM_USER_ADD: "roomUserAdd";
    ROOM_USER_REMOVE: "roomUserRemove";
    USER_RENAME: "userRename";
    CLIENT_ROOM_ADD: "clientRoomAdd";
    CLIENT_ROOM_REMOVE: "clientRoomRemove";
    TOUR_CREATE: "tourCreate";
    TOUR_UPDATE: "tourUpdate";
    TOUR_START: "tourStart";
    TOUR_END: "tourEnd";
    OPEN_HTML_PAGE: "openHtmlPage";
    CLOSE_HTML_PAGE: "closeHtmlPage";
    CHAT_ERROR: "chatError";
    CLIENT_ERROR: "error";
}
```

### rooms

```ts
rooms: Map<string, Room>;
```

A Map object to store Room object.
Key is Room's ID.

### users

```ts
users: Map<string, User>;
```

A Map object to store User object.
Key is User's ID.

### user

```ts
user: ClientUser | null;
```

A variable to store ClientUser object.
Default is `null`, ClientUser will be stored when emitted "ready" event.

### status

```ts
status: StatusType;
```

An object to store interface StatusType.
it has these properties:

```ts
export interface StatusType {
    connected: boolean;
    loggedIn: boolean;
    name: string | null;
    id: string | null;
}
```

### connected

```ts
connected: boolean;
```

A variable to store whether is this client connected with server.

### closed

```ts
closed: boolean;
```

A variable to store whether is this client connected with server.

### trusted

```ts
trusted: boolean;
```

A variable to store whether is this client trusted.

### formats

```ts
formats: {
    [key: string]: string[];
};
```

An object to store format data.
Key is string, and value is Array of string.

### userdetailsQueue

```ts
private userdetailsQueue;
```

This property is private. Do not access.

### roominfoQueue

```ts
private roominfoQueue;
```

This property is private. Do not access.

### resolvedRoom

```ts
resolvedRoom: string[];
```

This property is not private for some reasons, but do not access.

### resolvedUser

```ts
resolvedUser: string[];
```

This property is not private for some reasons, but do not access.

### PromisedPM

```ts
private PromisedPM;
```

This property is not private for some reasons, but do not access.

### PromisedChat

```ts
private PromisedChat;
```

This property is private. Do not access.

## challstr

```ts
private challstr;
```

**For security reasons, this property is private. Do not access.**

## Methods

### constructor()

```ts
constructor(options: ClientOptions);
```

This is constructor, so must be called first.
Here is an interface of ClientOptions:

```ts
export interface ClientOptions {
    openListener?: OpenListener; // webSocketListener for "open" event emitted.
    messageListener?: MessageListener; // webSocketListener for "message" event emitted. receives Buffer.
    closeListener?: CloseListener; // webSocketListener for "close" event emitted.
    errorListener?: ErrorListener; // webSocketListener for "error" event emitted. sometimes called as SSL Error.
    customListener?: CustomListener[]; // CustomWebSocketListener.
    name?: string; // username. do not make typo.
    pass?: string | (() => string); // password. do not make typo.
    status?: string; // status. please follow the PS rule.
    avatar?: string | number; // avatar. do not make typo.
    autoJoin?: string[]; // room id list to join firstly. dont typo. roomalias is not recommended.
    retryLogin?: number; // interval to retry login. default to 10s.
    autoReconnect?: number; // interval to reconnect. default to 30s.
}
```

Here is object to set args of constructor.

```ts
interface EventOptions {
    capture?: boolean;
    once?: boolean;
    passive?: boolean;
}

export interface OpenListener {
    function: () => any;
    event?: EventOptions;
    options?: EventOptions;
}
export interface MessageListener {
    function: (message: Buffer | ArrayBuffer | Buffer[]) => any;
    options?: EventOptions;
}
export interface CloseListener {
    function: (code: number, reason: Buffer) => any;
    options?: EventOptions;
}
export interface ErrorListener {
    function: (error: Error) => any;
    options?: EventOptions;
}

export interface CustomListener {
    event: "close" | "error" | "message" | "open" | "ping" | "pong" | "redirect" | "unexpected-response" | "upgrade";
    function: Function;
    options?: EventOptions;
}
```

### on()

```ts
on<T extends keyof ClientEvents>(event: T, listener: (...args: ClientEvents[T]) => void): this;
on<U extends string | symbol>(event: Exclude<U, keyof ClientEvents>, listener: (...args: any[]) => void): this;
```

this is used to `Client.on()`. listener args are here:

```ts
export interface ClientEvents {
    ready: [client?: undefined]; // no arguments
    queryResponse: [event: string];
    rawData: [message: string, room: Room];
    messageCreate: [message: Message<User | Room>];
    messageDelete: [message: Message<User | Room>];
    roomUserAdd: [room: Room, user: User];
    roomUserRemove: [room: Room, user: User];
    userRename: [newUser: User, oldUser: User];
    clientRoomAdd: [room: Room];
    clientRoomRemove: [room: Room];
    tourCreate: [room: Room, format: string, type: string, playerCap: number | null];
    tourUpdate: [room: Room, data: TourUpdateData];
    tourStart: [room: Room, players: number];
    tourEnd: [room: Room, data: PostTourData];
    openHtmlPage: [room: Room];
    closeHtmlPage: [room: Room];
    chatError: [error: string, room: Room | null];
    error: [error: string];
}
```

You can set string for first args, but it has no type annotations.

### once()

```ts
once<T extends keyof ClientEvents>(event: T, listener: (...args: ClientEvents[T]) => void): this;
once<U extends string | symbol>(event: Exclude<U, keyof ClientEvents>, listener: (...args: any[]) => void): this;
```

Same us `Client.on()`, but it was deleted when the event emitted.

### emit()

```ts
emit<T extends keyof ClientEvents>(event: T, ...args: ClientEvents[T]): boolean;
emit<U extends string | symbol>(event: Exclude<U, keyof ClientEvents>, ...args: unknown[]): boolean;
```

Client emiting all events, but if event does not exist on `ClientEvents`, the event has no type annotations.

### connect()

```ts
connect(): void;
```

Connect to server.
No arguments. No returns.

### logout()

```ts
logout(): void;
```

disconnect from server, and close webSocket.
No argumebts. No returns.

### disconnect()

```ts
disconnect(): void;
```

### setEventListeners()

```ts
private setEventListeners;
```

This is private method. Do not access.

### setMessageInterval()

```ts
private setMessageInterval;
```

This is private method. Do not access.

### login()

```ts
private login;
```

This is private method. Do not access.

### upkeep()

```ts
upkeep(): void;
```

Upkeep connection. No arguments, No returns.

### send()

```ts
send(content: string): void;
```

Send a string to server. example:

```ts
Client.send("roomName|message");
Client.send("|/commandName");
```

### sendArray()

```ts
sendArray(contents: string[]): Promise<void>;
```

Send an array without "your typing too fast" error. Example:

```ts
Client.sendArray(["roomName|this", "roomName|is", "roomName|a", "roomName|special", "roomName|array"]);
```

### sendUser

```ts
sendUser(user: string, input: string | UserMessageOptions): Promise<Message<User>> | null;
```

Send a message to User. input is this object:

```ts
export interface UserMessageOptions {
    content?: string;
    html?: NormalHTMLOptions | null;
}

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

### sendRoom()

```ts
sendRoom(room: string, input: string | RoomMessageOptions): Promise<Message<Room>> | null;
```

Send a message to Room. input is this object:

```ts
export interface RoomMessageOptions {
    content?: string;
    html?: (NormalHTMLOptions | RankHTMLOptions) | null;
}

export type RankHTMLOptions = RankuHTMLOptions | RankHTMLBoxOptions;

export interface RankuHTMLOptions extends UhtmlOptions {
    allowedDisplay: GroupSymbol;
}

export interface RankHTMLBoxOptions extends HTMLBoxOptions {
    allowedDisplay: GroupSymbol;
}

export type GroupSymbol = string & ("~" | "&" | "#" | "★" | "*" | "@" | "%" | "☆" | "§" | "+" | "^" | " " | "‽" | "!");
```

### joinRoom()

```ts
joinRoom(roomid: string): Promise<Room>;
```

Joining a room.

### leaveRoom()

```ts
leaveRoom(roomid: string): Room;
```

Leaving a room.

### onMessage()

```ts
onMessage(message: string): Promise<void>;
```

You don't have to customize this function.

### parseMessage()

```ts
parseMessage(rawMessage: string, room: Room | null): Promise<void>;
```

Same us onMessage().

### fetchUser()

```ts
fetchUser(userid: string, useCache?: boolean): Promise<User>;
```

Fetch a user. if useCache was set to true, returns cacheData when failed to fetch data.

### getUser

```ts
getUser(id: string): User | null;
```

Get a user from Client.users.

### addRoom()

```ts
addUser(input: UserOptions): User | null;
```

Update cache with using input.

### fetchRoom

```ts
fetchRoom(roomid: string, force?: boolean): Promise<Room>;
```

Fetch a room. if force was set to true, retry fetching.

### getRoom()

```ts
getRoom(roomid: string): Room | null;
```

Get a room from Client.rooms.

### addRoom()

```ts
addRoom(input: RoomOptions): Room;
```

Update cache with using input.
