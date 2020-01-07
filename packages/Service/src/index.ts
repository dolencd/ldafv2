import path from "path"
import {MQDriver} from "./mqDriver"
import {RedisDriver} from "./redisDriver"
import {ServiceConfig} from "./typeDefs"

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

    const redisDriver = new RedisDriver();
    const mqDriver = new MQDriver({
        prefetch: 10
    }, serviceConfig)
    

    /*
    {
        msg,
        content,
        sendReply(buffer)
    }
    */
    mqDriver.on("methodCall", async (msg, methodName, sendReply, sendError) => {

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
            }, [{method, payload: msg.content}, ctx, (response: Buffer, newCtx: object) => {
                redisDriver.writeData(redisKey, JSON.stringify(newCtx)) //intentionally not waiting for write to finish
                .catch((err) => {
                    console.error("redis write rejected", err);
                })
                sendReply(response)
            }])
        }
        catch(e){
            console.error("failed to apply plugins", plugins, msg)
            sendError(e)
        }

        await userService[methodName].apply(null, finalArguments);
    })

    await mqDriver.init()
}
main();