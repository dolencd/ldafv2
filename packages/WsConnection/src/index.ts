import * as Ws from "ws";
import {Client, MessageType} from "./Client"
import {MQDriver, ServiceInfo} from "./mqDriver"
import * as querystring from "querystring"

const clients: { [k: string]: object } = {}

const main = async () => {

    const mqDriver = await (new MQDriver()).init();
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

            services = await Promise.all(serviceNames.map(async (serviceName: string) => {
                return await mqDriver.sendRequest(serviceName, {
                    method: "serviceInfo",
                    params: {}
                    //TODO: kaksni parametri??
                })
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
        client.on("message", (service: string, message: {payload: Buffer, type: number}, callback) => {
            mqDriver.sendRequest(service, message, client.id)
            .catch((error) => {
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