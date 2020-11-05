import path from "path"
import BJSON from "json-buffer"
import {MQDriver} from "@ldafv2/mqdriver"
import {RedisDriver} from "@ldafv2/redisdriver"
import {installService} from "./serviceLoader"
import uuid from "uuid"

export interface ServiceConfig {
    name: string,
    src_http: string,
    plugins?: Array<PluginConfig>,
    dependencies?: Array<string>,
    methods: Array<MethodConfig>
    typeCount?: number
}

export interface PluginConfig {
    name: string,
    src_http?: string,
    src_npm?: string,
    config: any
}

export interface MethodConfig {
    name: string,
    type?: string,
    pluginConfig?: any,
    typeCount?: number
}



const main = async () => {
    
    const myId = uuid();

    if(!process.env.SRC_HTTP){
        console.error("No Service source configuration. Please set SRC_HTTP. Exiting")
        process.exit(1);
    }

    const {
        serviceConfig,
        service,
        plugins}:
        {
            serviceConfig: ServiceConfig,
            service: any,
            plugins: any
        } = await installService(process.env["SRC_HTTP"])

    serviceConfig.methods = serviceConfig.methods.map(method => {
        return {
            typeCount: method.type === "noRes" ? 1 : 2,
            ...method
        }
    })
    serviceConfig.typeCount = serviceConfig.methods.reduce((acc, curr) => {
        return acc + curr.typeCount;
    }, 0)

    const redisDriver = new RedisDriver(serviceConfig);
    const mqDriver = new MQDriver({
        mqDriverOptions: {
            prefetch: 10
        },
        name: serviceConfig.name,
        serviceInfoBuffer: Buffer.from(BJSON.stringify({
            name: serviceConfig.name,
            typeCount: serviceConfig.typeCount,
            methods: serviceConfig.methods.map(m => {
                return {
                    name: m.name,
                    typeCount: m.typeCount,
                    type: m.type
                }
            })
        }))
    })

    const _callMethodFromOtherService = (appId: string, serviceName: string, methodName: string, payload?: object) => 
        mqDriver.sendRequestToService.bind(mqDriver)({
            serviceName, 
            reqParams: payload, 
            type: "methodCall:" + methodName,
            options: {
                appId,
                deliveryMode: true,
                persistent: true
            }
        })
    
    /*
    {
        msg,
        content,
        sendReply(buffer)
    }
    */
    mqDriver.on("methodCall", async (msg: any, methodName: string, sendReply: any, sendError: any) => {

        

        const method = serviceConfig.methods.find(m => m.name === methodName);
        if(!method){
            console.error("unknown method", msg);
            return;
        }

        const callMethodFromOtherService = _callMethodFromOtherService.bind(mqDriver, msg.properties.appId)

        const redisKey = `${serviceConfig.name}:${msg.properties.appId}`;

        let ctx = {}
        try {
            if(msg.properties.appId){
                let _ctx = await redisDriver.readData(redisKey)
                console.log("redis ctx", _ctx)
                if(_ctx) ctx = _ctx;
            }
        }
        catch(e){
            console.error("error reading redis", e);
        }

        let finalArguments
        try {
            finalArguments = await plugins.reduce(async (accum: any, current: any) => {
                return current.applyPluginToMethodCall.apply(null, await accum);
            }, [{method, payload: msg.content}, ctx, (newCtx: object,response: Buffer) => {
                if(newCtx) redisDriver.writeData(redisKey, newCtx) //intentionally not waiting for write to finish
                .catch((err: Error) => {
                    console.error("redis write rejected", err);
                })

                sendReply(response) //if method is noRes the response doesn't matter

            }])
        }
        catch(e){
            console.error("failed to apply plugins", plugins, msg)
            sendError(e)
        }

        await service[methodName].apply(null, finalArguments);
    })

    await mqDriver.init()
}
main();