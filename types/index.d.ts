export type { ActivityErrorType } from "./Activity";

export type {
    ClientEventNames,
    ClientEvents,
    ClientOptions,
    CloseListener,
    CustomListener,
    ErrorListener,
    IMessageType,
    IOutGoingMessage,
    IRoomOutGoingMessageOptions,
    IUserOutGoingMessageOptions,
    MessageListener,
    OpenListener,
    PendingMessage,
    PostLoginOptions,
    PromisedRoom,
    PromisedUser,
    ServerConfig,
    StatusType,
} from "./Client";

export type { UserSettings } from "./ClientUser";

export type { PSAPIErrorType } from "./Error";

export type { awaitMessageOptions, MessageInput, MessageWaits } from "./Message";

export type { BattleRoom, ModchatLevel, RoomOptions, RoomPermissions } from "./Room";

export type {
    EliminationBracket,
    EliminationBracketData,
    IRRBattleStatus,
    RoundRobinBracket,
    TourUpdateData,
} from "./Tour";

export type { GlobalPermissions, UserOptions } from "./User";

export type { AuthLevel, GroupNames, GroupSymbol, Ranks } from "./UserGroups";

export type { Dict, valueof } from "./utils";
