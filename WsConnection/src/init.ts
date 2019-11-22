import {Server} from "ws";
import ServerTranscoder from "./ServerTranscoder";

const serverTranscoder: ServerTranscoder = new ServerTranscoder(parseInt(process.env.TRANSCODER_TYPELEN) || 1, parseInt(process.env.TRANSCODER_SEQLEN) || 1)

const wsServer = new Server({
    clientTracking: true,
    port: parseInt(process.env.WS_PORT) || 8547
});

wsServer.on("connection", (socket, request) => {
    
})

wsServer.on("listening", () => {
    
})

wsServer.on("error", (error) => {
    
})