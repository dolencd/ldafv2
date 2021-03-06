import * as Ws from "ws";
import {Client} from "./Client"
import {MQDriver} from "@ldafv2/mqdriver"
import * as querystring from "querystring"
import uuid from "uuid";

export interface ServiceInfoMethod {
    name: string;
    type: string;
    typeCount: number;
}

export interface ServiceInfo {
    name: string;
    typeCount: number;
    methods: Array<ServiceInfoMethod>;
}

export interface MessageType {
    service: ServiceInfo,
    method: ServiceInfoMethod
    type: number,
    offset: number
}

const myId = uuid();
const clients: { [k: string]: object } = {}

const main = async () => {

    const mqDriver = await (new MQDriver({
        type: "StatefulConnection",
        name: "ws",
        mqOptions: {
            prefetch: 10,
            address: process.env.RABBITMQ_ADDRESS
        }
    })).init();
    const port = parseInt(process.env.WS_PORT) || 8547;

    const wsServer = new Ws.Server({
        clientTracking: true,
        port
    });

    wsServer.on("connection", async (socket, request) => {

        const queryParams = querystring.parse(request.url.substr(1));

        let serviceNames: Array<string>;

        if(Array.isArray(queryParams.s)){
            serviceNames = queryParams.s;
        }
        else if (typeof queryParams.s === "string"){
            serviceNames = [queryParams.s];
        }
        else {
            console.log("invalid querystring", request.url);
            return;
        }


        let services: Array<ServiceInfo>;
        try {

            if(!mqDriver.queuesExists(serviceNames.map(serviceName => `s:${serviceName}`))) throw "missing service queues" 

            services = await Promise.all(serviceNames.map((serviceName: string) => {
                return mqDriver.getServiceInfo(serviceName);
            }))
        }
        catch(e){
            console.log("error retrieving service info", e);
            return
        }

        console.log("got service infos for client", services)

        const client = new Client(socket, services, request)
        if(clients[client.id]){
            console.error("uuid collision! closing client", clients, client)
            client.close()
            return;
        }
        clients[client.id] = client;
        client.once("close", () => {
            delete clients[client.id];
        })
        client.on("methodCall", (messageType: MessageType, payload: Buffer, callback) => {

            if(messageType.method.type === "noRes"){
                mqDriver.sendRequestToService.bind(mqDriver)({
                    serviceName: messageType.service.name, 
                    reqParams: payload, 
                    type: "methodCall:" + messageType.method.name,
                    options: {
                        appId: client.id
                    }
                })
                .catch((error: Error) => {
                    console.error("mqDriver response error", error)
                })
                callback()

                return;
            }

            mqDriver.sendRequestToService.bind(mqDriver)({
                serviceName: messageType.service.name, 
                reqParams: payload, 
                type: "methodCall:" + messageType.method.name,
                options: {
                    appId: client.id,
                    deliveryMode: true,
                    persistent: true
                }
            })
            .catch((error: Error) => {
                console.error("mqDriver response error", error)
            })
            .then(callback)
        }) 
    })


    wsServer.on("listening", () => {
        console.log("WS lis tening on", port)
    })

    wsServer.on("error", (error) => {
        console.error(error)
    })
}

main();