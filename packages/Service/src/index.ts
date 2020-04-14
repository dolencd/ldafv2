import path from "path"
import BJSON from "json-buffer"
import {MQDriver} from "@ldafv2/mqdriver"
import {RedisDriver} from "@ldafv2/redisdriver"
import uuid from "uuid"

export interface ServiceConfig {
    name: string,
    plugins?: Array<PluginConfig>,
    dependencies?: Array<string>,
    methods: Array<MethodConfig>
    typeCount?: number
}

export interface PluginConfig {
    name: string,
    src: string,
    config: any
}

export interface MethodConfig {
    name: string,
    type?: string,
    pluginConfig?: any,
    typeCount?: number
}

const myId = uuid();
const serviceConfig: ServiceConfig = require(path.join(__dirname, "service", "config.json"));
serviceConfig.methods = serviceConfig.methods.map(method => {
    return {
        typeCount: method.type === "noRes" ? 1 : 2,
        ...method
    }
})
serviceConfig.typeCount = serviceConfig.methods.reduce((acc, curr) => {
    return acc + curr.typeCount;
}, 0)


const getPluginArr = async (config: ServiceConfig) => {
    const pluginNameArr: Array<string> = config.plugins.map(p => p.name);
    return Promise.all(pluginNameArr.map(async (pluginName) => {
        let plugin = require(path.join(__dirname, "plugins", pluginName, "main.js"));
        plugin.init(config);
        return plugin;
    }))
}



const main = async () => {
    const userService = require(path.join(__dirname, "service", "main.js"));
    const plugins = await getPluginArr(serviceConfig);

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
            finalArguments = await plugins.reduce(async (accum, current) => {
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

        await userService[methodName].apply(null, finalArguments);
    })

    await mqDriver.init()
    setInterval(() => {
        let memoryData = process.memoryUsage();
        mqDriver.sendMessage({
            queueName: "health",
            type: "health",
            options: {
                appId: "sv-" + myId
            },
            reqParams: memoryData
        })
    }, 30000)
}
main();