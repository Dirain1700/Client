export type {
    ClientOptions,
    ClientEvents,
    EventOptions,
    OpenListener,
    MessageListener,
    CloseListener,
    ErrorListener,
    CustomListener,
    PromisedRoom,
    PromisedUser,
    StatusType,
    ServerConfig,
    PostLoginOptions,
    PendingMessage,
} from "./Client";

export type { UserSettings } from "./ClientUser";

export type {
    MessageInput,
    UserMessageOptions,
    RoomMessageOptions,
    MessageWaits,
    awaitMessageOptions,
} from "./Message";

export type {
    RoomOptions,
    UhtmlOptions,
    HTMLBoxOptions,
    RankuHTMLOptions,
    RankHTMLBoxOptions,
    NormalHTMLOptions,
    RankHTMLOptions,
    HTMLOptions,
    BattleRoom,
} from "./Room";

export type { UserOptions } from "./User";

export type { GroupSymbol, AuthLevel } from "./UserGroups";
