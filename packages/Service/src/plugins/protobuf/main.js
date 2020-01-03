const protobufjs = require("protobufjs");
const path = require("path");

const projectRoot = path.join(path.dirname(require.main.filename), "service");

let protoRoot = new protobufjs.Root();
let messageTypes = {};
let methods = {};

const init = async (config) => {

    if(!(config.plugins && config.plugins.protobuf && config.plugins.protobuf.config && config.plugins.protobuf.config.protoFiles)){
        throw new Error("missing proto files")
    }

    try {
        await Promise.all(config.plugins.protobuf.config.protoFiles.map((protoFilePath) => {
            return new Promise((resolve, reject) => {
                protoRoot.load(path.join(projectRoot, protoFilePath), (err, res) => {
                    if(err) reject(err)
                    else resolve(res);
                })
            })
        }))
        console.log("proto files read")
        protoRoot.nestedArray.map((type) => {
            
            messageTypes[type.name] = {
                name: type.name,
                type,
                encode: (obj) => type.encode(type.create(obj)).finish(),
                decode: (buf) => {
                    let a = type.decode(buf);
                    let b = type.toObject(a);
                    console.log();
                    return b
                }
            }
        })
        console.log("message types parsed")
        config.methods.map(method => {
            if(!(method.pluginConfig && method.pluginConfig.protobuf)) {
                console.warn(`The method "${method.name}" is missing protobuf settings. it will be ignored`)
                return;
            };

            const methodConfig = method.pluginConfig.protobuf;

            const methodObj = {
                name: method.name,
            }

            if(methods[method.name]) throw new Error("method already exists:" + method.name);

            
            if(!methodConfig.inputSchema || !messageTypes[methodConfig.inputSchema]) {
                console.warn("failed to get input schema for method:" + method.name, methodConfig, Object.keys(messageTypes));
            }
            else {
                methodObj.inputSchema = messageTypes[methodConfig.inputSchema];
            }
            

            if(method.type !== "noRes"){
                if(!methodConfig.outputSchema || !messageTypes[methodConfig.outputSchema]) {
                    console.warn("failed to get output schema for method:" + method.name, methodConfig, Object.keys(messageTypes));
                }
                else {
                    methodObj.outputSchema = messageTypes[methodConfig.outputSchema];
                }
            }

            methods[method.name] = methodObj;
        })
        console.log("protos prepared")
    }
    catch(e){
        console.error("error loading protos", e)
    }


    console.log();

}

const applyPluginToMethodCall = (event, context, callback) => {

    let method = methods[event.method];
    if(!method) {
        return [event, context, callback];
    }

    let params;
    if(method.inputSchema){
        try {
            params = method.inputSchema.decode(event.bufferParams)
        }
        catch(e) {
            console.error("error decoding message", event, method);
        }
    }



    return [
        {
            ...event,
            params //is undefined if method is unknown
        },
        context,
            method.outputSchema ? (responseObj) => {
            let encodedResponse;
            try {
                encodedResponse = method.outputSchema.encode(responseObj);
            }
            catch(e) {
                console.error("error encoding ")
            }
            callback(encodedResponse);
        } : callback
    ]
}

module.exports = {
    messageTypes,
    init,
    applyPluginToMethodCall
}