export type { ActivityErrorType } from "./Activity";

export type {
    ClientOptions,
    ClientEvents,
    ClientEventNames,
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

export type { Dict, valueOf, PromiseResolve, PromiseReject } from "./utils";

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
    PrivateuHTMLOptions,
    PrivateHTMLOptions,
    PMuHTMLOptions,
    PmHTMLBoxOptions,
    PMHTMLOptions,
    NormalHTMLOptions,
    RankHTMLOptions,
    HTMLOptions,
    IHtmlPageData,
    BattleRoom,
    RoomPermissions,
} from "./Room";

export type { UserOptions, GlobalPermissions } from "./User";

export type {
    TourUpdateData,
    EliminationBracket,
    EliminationBracketData,
    IRRBattleStatus,
    RoundRobinBracket,
    TourEndData,
} from "./Tour";

export type { GroupSymbol, AuthLevel } from "./UserGroups";
