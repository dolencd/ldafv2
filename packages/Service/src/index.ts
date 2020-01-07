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
        return plugin.init(config);
    }))
}



const main = async () => {
    const userService = require(path.join(__dirname, "service", "main.js"));
    const plugins = await getPluginArr(serviceConfig);

    const redisDriver = new RedisDriver();
    const mqDriver = await (new MQDriver({
        prefetch: 10
    }, serviceConfig)).init()
    

    /*
    {
        msg,
        content,
        sendReply(buffer)
    }
    */
    mqDriver.on("methodCall", async (msg, content, sendReply) => {
        if(!content.type){
            console.error("message missing type", msg);
            return;
        }

        if(content.type > (serviceConfig.methods.length - 1)){
            console.error("message type ouf of bounds", content.type, serviceConfig.methods);
            return;
        }


        let typeCount = 0;
        let methodIndex = serviceConfig.methods.findIndex((val, index) => {
            if((typeCount + val.typeCount) > content.type) return true
            typeCount += val.typeCount
            return false;
        })
        let method = serviceConfig.methods[methodIndex];

        // if(!method){
        //     console.error("attempted to call unknown method", msg, serviceConfig.methods);
        //     return;
        // }
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

    

        let finalArguments = await plugins.reduce(async (accum, current) => {
            return current.applyPluginToMethodCall.apply(null, await accum);
        }, [content, ctx, (response: Buffer, newCtx: object) => {
            redisDriver.writeData(redisKey, JSON.stringify(newCtx)) //intentionally not waiting for write to finish
            .catch((err) => {
                console.error("redis write rejected", err);
            })
            sendReply(response)
        }])

        await userService[method.name].apply(null, finalArguments);
    })
}
main();