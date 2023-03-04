"use strict";

import { Room } from "./Room";
import { User } from "./User";

import type { Client } from "./Client";

import type { IUserOutGoingMessageOptions, IRoomOutGoingMessageOptions } from "../types/Client";
import type { MessageInput, MessageWaits } from "../types/Message";
import type { RoomOptions } from "../types/Room";
import type { UserOptions } from "../types/User";

export class Message<T extends Room | User = Room | User> {
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
        this.content = init.content.startsWith("/botmsg") ? init.content.replace("/botmsg ", "") : init.content;
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

        if (this.inRoom()) {
            const message = this;
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
        } else if (this.inPm()) {
            const message = this;
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
        Object.defineProperty(this, "client", {
            enumerable: false,
            writable: true,
        });
    }

    reply(content: string, options?: IUserOutGoingMessageOptions | IRoomOutGoingMessageOptions): void {
        return this.target.send(content, options ?? {});
    }

    inPm(): this is Message<User> {
        return this.target instanceof User;
    }

    inRoom(): this is Message<Room> {
        return this.target instanceof Room;
    }
}
