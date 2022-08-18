import type { Client } from "./Client";
import { User } from "./User";
import { Room } from "./Room";
import type { MessageInput, MessageWaits, UserMessageOptions, RoomMessageOptions } from "../types/Message";
import type { RoomOptions } from "../types/Room";
import type { UserOptions } from "../types/User";

export class Message<T extends Room | User | unknown> {
    author: User;
    content: string;
    target: T;
    raw: string;
    id: string;
    command: string | false;
    deletable: boolean = false;
    time: number;
    type: "Room" | "PM";
    awaited: boolean = false;
    readonly client: Client;

    constructor(init: MessageInput<T>) {
        this.author = init.author;
        this.content = init.content;
        this.target = init.target;
        this.id = (init.time ?? Date.now()).toString();
        this.raw = init.raw;
        const match = init.content.match(/^[/!][^ ]+/);
        if (match) this.command = match[0] as string;
        else this.command = false;
        this.time = init.time;
        this.type = this.target instanceof Room ? "Room" : "PM";
        this.client = init.client;
        if (this.client.user) {
            if (this.type === "Room")
                this.deletable =
                    (this.target as Room).isRoomStaff(this.client.user.userid) || this.client.user.isGlobalStaff;
            else if (this.type === "PM") this.deletable = this.client.user.isGlobalStaff;
        } else this.deletable = false;
        if (this.command && this.command.startsWith("/")) this.deletable = false;

        if (this.target instanceof Room) {
            const message = this as Message<Room>;
            this.target.waits.forEach((wait: MessageWaits<Room>) => {
                if (message.type === "Room" && wait.filter(message) && wait.roomid! === message.target.id) {
                    message.awaited = true;
                    wait.messages.push(message);
                    if (wait.max === wait.messages.length) {
                        message.client.resolvedRoom.push(wait.id);
                        wait.resolve(wait.messages);
                    } else message.awaited = false;
                }
                message.client.addRoom(
                    Object.assign(message.target as Room, {
                        waits: (message.target as Room).waits.filter(
                            (wait: MessageWaits<Room>) => !message.client.resolvedRoom.includes(wait.id)
                        ),
                    }) as RoomOptions
                );
            });
            this.awaited = message.awaited;
        } else if (this.target instanceof User) {
            const message = this as Message<User>;
            this.target.waits.forEach((wait: MessageWaits<User>) => {
                if (message.type === "PM" && wait.filter(message) && wait.userid! === message.author.userid) {
                    message.awaited = true;
                    wait.messages.push(message);
                    if (wait.max === wait.messages.length) {
                        message.client.resolvedUser.push(wait.id);
                        wait.resolve(wait.messages);
                    }
                } else message.awaited = false;
                message.client.addUser(
                    Object.assign(message.target as User, {
                        waits: (message.target as User).waits.filter(
                            (wait: MessageWaits<User>) => !message.client.resolvedUser.includes(wait.id)
                        ),
                    }) as UserOptions
                );
            });
            this.awaited = message.awaited;
        }
    }

    reply(option: string | UserMessageOptions | RoomMessageOptions): Promise<Message<Room | User>> | null {
        if (this.target instanceof Room)
            return this.client.sendRoom(this.target.id, option as RoomMessageOptions | string);
        else if (this.target instanceof User)
            return this.client.sendUser(this.target.id, option as UserMessageOptions | string);
        else throw new Error("<Message<T>>.target is neither Room or User.");
    }

    isUserMessage(): this is Message<User> {
        return this.target instanceof User;
    }

    isRoomMessage(): this is Message<Room> {
        return this.target instanceof Room;
    }

    isNotUnknown(): this is Message<Room> | Message<User> {
        return !this.isUserMessage() || this.isRoomMessage();
    }
}
