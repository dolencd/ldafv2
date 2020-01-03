"use strict"
const amqplib = require("amqplib");
const EventEmitter = require("eventemitter3");
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

module.exports = class MQDriver extends EventEmitter{

    constructor(options){
        super()

        if(typeof options.serviceName !== "string"){
            console.error("MQ options.serviceName should be string");
            return;
        }

        this.options = options;
        this.address = process.env.RABBITMQ_ADDRESS || "amqp://localhost"

        if(typeof this.options.serviceName !== "string"){
            console.error("invalid serviceName", this.options.serviceName);
        }
    }

    async init(){
        this.conn = await amqplib.connect(this.address);
        this.channel = await this.conn.createChannel();
        await this.channel.prefetch(this.options.prefetch || 10);
        await this.createReceiveQueue();

        return this;
    }

    async createReceiveQueue(){
        const gotMessage = (msg) => {
            
            this.emit("message", {
                msg,
                content: msg.content,
                sendReply: (content) => {
                    this.channel.sendToQueue(msg.properties.replyTo, content, {
                        correlationId: msg.properties.correlationId,
                        timestamp: Date.now()
                    })
                    this.channel.ack(msg);
                }
            })
        }

        this.receiveQueue = await this.channel.assertQueue(`s:${this.options.serviceName}`, {
            exclusive: false,
            durable: true
        })
        this.receiveDirectConsume = await this.channel.consume(this.receiveQueue.queue, gotMessage, {
            noAck: false,
            exclusive: false
        })
    }





}