"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const amqplib_1 = __importDefault(require("amqplib"));
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const uuid_1 = __importDefault(require("uuid"));
/*

ws verzija

 - skupno
  - narediti connection in channel

 - posiljanje requestov, ki cakajo na response
  - send request proti servicu
  - pending requests
  - direct receive queue
  - poiskati pending request in resolve promisa

 - service
  - subscribe na primeren exchange
  - consume messages
  - pognat whatever
  - poslat response (in ob tem ack requesta)


*/
class MQDriver extends eventemitter3_1.default {
    constructor(options) {
        super();
        this.options = options;
    }
    async init() {
        this.conn = await amqplib_1.default.connect(this.options.address);
        this.channel = await this.conn.createChannel();
        await this.channel.prefetch(this.options.prefetch || 10);
        await this.createReceiveQueue();
    }
    async createReceiveQueue() {
        const gotResponse = (msg) => {
            if (!this.pendingRequests[msg.properties.correlationId]) {
                console.error("unknown correlationId. got response to unknown request", msg, this.pendingRequests);
                return;
            }
            const requestObj = this.pendingRequests[msg.properties.correlationId];
            delete this.pendingRequests[msg.properties.correlationId];
            let decodedResponse;
            try {
                decodedResponse = msg.content.toJSON();
            }
            catch (e) {
                console.error("failed to decode message content", msg);
            }
            requestObj.responsePromise.resolve(decodedResponse);
        };
        this.receiveDirectQueue = await this.channel.assertQueue('', {
            exclusive: true,
            durable: true
        });
        this.receiveDirectConsume = this.receiveDirectConsume = await this.channel.consume(this.receiveDirectQueue.queue, gotResponse, {});
    }
    async sendRequest(serviceName, reqParams) {
        let promiseResolve, promiseReject;
        let requestObj = {
            requestQueue: serviceName,
            correlationId: uuid_1.default(),
            reqParams,
            responsePromise: new Promise((resolve, reject) => {
                promiseResolve = resolve;
                promiseReject = reject;
            }),
            promiseReject,
            promiseResolve
        };
        try {
            let ok = this.channel.sendToQueue(`s:${serviceName}`, Buffer.from(JSON.stringify(reqParams)), {
                deliveryMode: true,
                timestamp: Date.now(),
                correlationId: requestObj.correlationId,
                replyTo: this.receiveDirectQueue.queue
            });
            if (!ok) {
                console.log("publish returned false");
            }
        }
        catch (e) {
            console.error("channel publish error", e);
        }
        this.pendingRequests[requestObj.correlationId] = requestObj;
    }
}
exports.default = MQDriver;
//# sourceMappingURL=mqDriver.js.map