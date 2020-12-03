import protobufjs from "protobufjs"
import path from "path";
const projectRoot = path.join(process.cwd(), "packages", "_service");
let initialised = false;

export interface MethodCallEvent {
    payload: Buffer,
    method: MethodConfig
}

export interface MethodConfig {
    name: string,
    type?: string,
    pluginConfig?: any,
    typeCount?: number
}

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

export interface MessageType {
    name: string,
    type: protobufjs.ReflectionObject,
    encode(obj: object): Buffer, 
    decode(buf: Buffer): object
}

export interface ProtobufConfig extends PluginConfig{
    config: {
        protoFiles: Array<string>
    }
}

export interface ProtobufMethodConfig extends MethodConfig {
    pluginConfig: {
        protobuf: {
            inputSchema?: string,
            outputSchema?: string
        }
    }
}

export interface ProtobufMethodObject {
    name: string,
    inputSchema?: MessageType,
    outputSchema?: MessageType
}

export interface ProtobufMethodCallEvent extends MethodCallEvent{
    params?: object
}

let protoRoot = new protobufjs.Root();
const messageTypes: {[k: string]: MessageType} = {};
const methods: {[k: string]: ProtobufMethodObject} = {};

export const init = async (config: ServiceConfig) => {

    const protobufConfig: ProtobufConfig = config.plugins.find(p => p.name === "protobuf")

    if(!protobufConfig || !protobufConfig.config || !protobufConfig.config.protoFiles){
        throw new Error("missing proto files config")
    }

    try {
        await Promise.all(protobufConfig.config.protoFiles.map((protoFilePath: string) => {
            return new Promise((resolve, reject) => {
                protoRoot.load(path.join(projectRoot, protoFilePath), (err: Error, res: any) => {
                    if(err) reject(err)
                    else resolve(res);
                })
            })
        }))
        console.log("proto files read")
        protoRoot.nestedArray.map((type: any) => {//TODO: find proper type
            
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
        config.methods.map((method) => {
            if(!(method.pluginConfig && method.pluginConfig.protobuf)) {
                console.warn(`The method "${method.name}" is missing protobuf settings. it will be ignored`)
                return;
            };

            const methodConfig = method.pluginConfig.protobuf;

            const methodObj: ProtobufMethodObject = {
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

    initialised = true;

    return true;

}

export const applyPluginToMethodCall = (event: ProtobufMethodCallEvent, context: object, callback: (newCtx: object, responseBuffer: Buffer) => void) => {

    if(!initialised){
        throw new Error("Protobuf plugin applyToMethodCall called before the plugin was initialised");
    }

    
    let method = methods[event.method.name];//method with added protobuf info
    if(!method) {
        return [event, context, callback];
    }

    let params = {};
    if(method.inputSchema){
        try {
            params = method.inputSchema.decode(event.payload) || {}
        }
        catch(e) {
            console.error("error decoding message", event, method);
        }
    }


    return [
        {
            ...event,
            params //is empty object if method is unknown or decode fails
        },
        context,
            method.outputSchema ? (newCtx: object, responseObj: object) => {
            let encodedResponse;
            try {
                encodedResponse = method.outputSchema.encode(responseObj);
            }
            catch(e) {
                console.error("error encoding ")
            }
            callback(newCtx, encodedResponse);
        } : callback
    ]
}