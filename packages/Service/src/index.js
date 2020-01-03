const path = require("path");
const MqDriver = require("./mqDriver");
const RedisDriver = require("./redisDriver");

const serviceConfig = require(path.join(__dirname, "service", "config.json"));
const getPluginArr = async (config) => {
    const pluginNameArr = Object.keys(config.plugins);
    return Promise.all(pluginNameArr.map(async (pluginName) => {
        let plugin = require(path.join(__dirname, "plugins", pluginName, "main.js"));
        await plugin.init(config);
        return plugin;
    }))
}



const main = async () => {
    const userService = require(path.join(__dirname, "service", "main.js"));
    const plugins = await getPluginArr(serviceConfig);

    const redisDriver = new RedisDriver();
    const mqDriver = await (new MqDriver({
        serviceName: serviceConfig.name,
        prefetch: 10
    })).init()
    

    /*
    {
        msg,
        content,
        sendReply(buffer)
    }
    */
    mqDriver.on("message", async (msg, content, sendReply) => {

        if(!content.method || !userService[content.method]){
            console.error("attempted to call unknown method");
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

    

        let finalArguments = await plugins.reduce(async (accum, current, index) => {
            return current.applyPluginToMethodCall.apply(null, await accum);
        }, [content, ctx, (response, newCtx) => {
            redisDriver.writeData(redisKey, newCtx) //intentionally not waiting for write to finish
            .catch((err) => {
                console.error("redis write rejected", err);
            })
            sendReply(response)
        }])

        await userService[content.method].apply(null, finalArguments);
    })
}
main();