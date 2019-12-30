import * as Ws from "ws";
import {Client} from "./Client"
import {MQDriver, ServiceInfo} from "./mqDriver"
import * as querystring from "querystring"


const main = async () => {

    const mqDriver = await (new MQDriver()).init();

    const wsServer = new Ws.Server({
        clientTracking: true,
        port: parseInt(process.env.WS_PORT) || 8547
    });

    wsServer.on("connection", async (socket, request) => {

        const queryParams = querystring.parse(request.url.substr(1));

        let serviceNames;

        if(Array.isArray(queryParams.s)){
            serviceNames = queryParams.s;
        }
        else if (typeof queryParams.s === "string"){
            serviceNames = [queryParams.s];
        }
        else {
            console.log("invalid querystring", request);
            return;
        }


        let services: Array<ServiceInfo>;
        try {
            services = await Promise.all(serviceNames.map((serviceName: string) => {
                return mqDriver.sendRequest(serviceName, {
                    //TODO: kaksni parametri??
                })
            }))
        }
        catch(e){
            console.log("error retrieving service info");
            return
        }

        const client = new Client(socket, services, request)
    })


    wsServer.on("listening", () => {
        console.log("WS listening on" + process.env.WS_PORT)
    })

    wsServer.on("error", (error) => {
        console.error(error)
    })
}

main();