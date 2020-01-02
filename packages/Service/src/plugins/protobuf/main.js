const protobufjs = require("protobufjs");
const {join} = require("path");

const projectRoot = require.main ? require.main.filename : __dirname;

let protoRoot = new protobufjs.Root();
let messageTypes = {};
let methods = {};

const init = async (config) => {

    let protoFiles = [
        "./main.proto",
        "./main2.proto"
    ]

    try {
        await Promise.all(protoFiles.map((protoFilePath) => {
            return new Promise((resolve, reject) => {
                protoRoot.load(join(__dirname, protoFilePath), (err, res) => {
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
                decode: (buf) => type.decode(buf)
            }
        })
        console.log("message types parsed")
        config.methods.map(method => {
            if(methods[method.name]) throw "method already exists:" + method.name;

            if(method.input){
                if(!method.input.protobuf_schema) throw "missing input proto schema:" + method.name;
                if(!messageTypes[method.input.protobuf_schema]) throw "unknown input schema name:" + method.name;
                method.input.protobuf_schema = messageTypes[method.input.protobuf_schema];
            }

            if(method.output){
                if(!method.output.protobuf_schema) throw "missing output proto schema:" + method.name;
                if(!messageTypes[method.output.protobuf_schema]) throw "unknown output schema name:" + method.name;
                method.output.protobuf_schema = messageTypes[method.output.protobuf_schema];
            }

            methods[method.name] = method;
        })
        console.log("protos prepared")
    }
    catch(e){
        console.error("error loading protos", e)
    }


    console.log();

}

const methodCall = (event, context, callback) => {
    let method = methods[event.method];
    let params;
    try {
        params = method.input.decode(event.bufferParams)
    }
    catch(e) {
        console.error("error decoding message", event, method);
    }

    return [
        {
            ...event,
            params
        },
        context,
            (responseObj) => {
            let encodedResponse;
            try {
                encodedResponse = method.output.encode(responseObj);
            }
            catch(e) {
                console.error("error encoding ")
            }
            callback(encodedResponse);
        }
    ]
}

init({
    "name": "adder",
    "plugins": {
        "protobuf": {
            "name": "protobuf",
            "src": "url? DB ID?",
            "options": {
                "protoFiles": [
                    "./main.proto"
                ]
            }
        }
    },
    "dependencies": [

    ],
    "options":{
        "initialValue": 42
    },
    "methods": [
        {
            "name": "updateValue",
            "description": "update stored value",
            "type": "noRes",
            "input": {
                "protobuf_schema": "simpleNumber"
            }
        },
        {
            "name": "add",
            "description": "add the provided input to the current stored value and return the result",
            "type": "req/res",
            "input": {
                "protobuf_schema": "simpleNumber"
            },
            "output": {
                "protobuf_schema": "simpleNumber"
            }
        }
    ]
})