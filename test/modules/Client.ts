"use strict";

import * as assert from "node:assert";

import { Tools } from "@dist/cjs/index";

import { createTestRoom, createTestUser } from "../test-tools";

import type { Room } from "@dist/cjs/index";

const testMessageContent = new Date().toISOString() + ": test message by mocha";

describe("Client", function () {
    describe("Login", function () {
        it("WebSocket should be null before connecting", () => {
            assert.strictEqual(client.ws, null);
        });
        it("Should login in 10 sec", function (done) {
            this.slow(4000);
            this.timeout(10 * 1000);
            client.connect();
            client.on("ready", () => {
                console.log("Successfully logged in.");
                done();
            });
        });
        it("Waiting status to being stable", function (done) {
            this.timeout(11 * 1000);
            this.slow(21 * 1000);
            setTimeout(() => done(), 10 * 1000);
        });
        it("Should fetch a room properly", function (done) {
            this.timeout(3 * 1000);
            this.slow(300);
            client.fetchRoom("botdevelopment").then(() => {
                assert.ok(client.rooms.cache.get("botdevelopment"));
                done();
            });
        });
    });
    describe("Message", function () {
        it("Should send a message in PM", function (done) {
            this.timeout(5 * 1000);
            this.slow(300);
            client.once("messageCreate", (message) => {
                if (
                    message.content === testMessageContent &&
                    message.author.id === client.user?.id &&
                    message.target.id === client.user?.id
                )
                    done();
            });
            client.user?.send(testMessageContent);
        });
        it("Should send a message in Room", function (done): void {
            if (process.env["CI"]) return this.skip();
            this.timeout(5 * 1000);
            this.slow(300);
            client.once("messageCreate", (message) => {
                if (
                    message.content === testMessageContent &&
                    message.author.id === client.user?.id &&
                    message.target.id === "botdevelopment"
                )
                    done();
            });
            client.rooms.cache.get("botdevelopment")!.send(testMessageContent);
        });
    });
    describe("Tournament", function () {
        const mocha1 = createTestUser({ name: "mocha 1" });
        const mocha2 = createTestUser({ name: "mocha 2" });
        client.users.cache.set("mocha1", mocha1);
        client.users.cache.set("mocha2", mocha2);
        const mochaRoom: Room = createTestRoom({ users: [" mocha 1", " mocha 2"] });
        client.rooms.cache.set("mocha", mochaRoom);
        it("Should create tournament properly", function () {
            assert.ok(client.users.cache.get("mocha1"));
            assert.ok(client.users.cache.get("mocha2"));
            assert.strictEqual(mochaRoom.tour, null);
            assert.ok(client.rooms.cache.get("mocha"));
            assert.strictEqual(client.rooms.cache.get("mocha")?.userCollection?.size, 2);
            client.parseMessage("|tournament|create|gen8randombattle|Single Elimination|128", mochaRoom);
            mochaRoom.update();
            assert.ok(mochaRoom.tour);
            // @ts-expect-error avoiding never
            assert.strictEqual(Tools.toId(mochaRoom.tour.format), "gen8randombattle");
            // @ts-expect-error avoiding never
            assert.strictEqual(mochaRoom.tour.playerCap, 128);
            // @ts-expect-error avoiding never
            assert.strictEqual(Tools.toId(mochaRoom.tour.format), "gen8randombattle");
            // @ts-expect-error avoiding never
            assert.ok(mochaRoom.tour.isSingleElimination);
            // @ts-expect-error avoiding never
            assert.ok(!mochaRoom.tour.started);
        });
    });
    describe("Logout", function () {
        it("WebSocket should be null after logging out", () => {
            client.disconnect();
            assert.strictEqual(client.ws, null);
        });
    });
});
