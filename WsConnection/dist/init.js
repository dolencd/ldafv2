"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const ServerTranscoder_1 = __importDefault(require("./ServerTranscoder"));
const serverTranscoder = new ServerTranscoder_1.default(parseInt(process.env.TRANSCODER_TYPELEN) || 1, parseInt(process.env.TRANSCODER_SEQLEN) || 1);
const wsServer = new ws_1.Server({
    clientTracking: true,
    port: parseInt(process.env.WS_PORT) || 8547
});
wsServer.on("connection", (socket, request) => {
});
wsServer.on("listening", () => {
    console.log("WS listening on" + process.env.WS_PORT);
});
wsServer.on("error", (error) => {
});
//# sourceMappingURL=init.js.map