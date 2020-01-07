import {init, applyPluginToMethodCall} from "./main";
const assert = require("assert");



const main = async () => {
    await init({
        "name": "adder",
        "plugins": [
            {
                "name": "protobuf",
                "src": "url? DB ID?",
                "config": {
                    "protoFiles": [
                        "./main.proto"
                    ]
                }
            }
        ],
        "methods": [
            {
                "name": "methodA",
                "type": "noRes",
                "pluginConfig": {
                    "protobuf":{
                        "inputSchema": "a"
                    }
                } 
            },
            {
                "name": "methodB",
                "type": "default",
                "pluginConfig": {
                    "protobuf":{
                        "inputSchema": "a",
                        "outputSchema": "a"
                    }
                } 
            },
            {
                "name": "methodC",
                "type": "default"
            }
        ]
    })



    const inputBuffer = Buffer.from("08d209120b61626364656667683132331801", "hex"),
    params = {
        number: 1234, 
        string: "abcdefgh123",
        boolean: true
    },
    ctx = {ctx:"ctx"},
    returnFn = (returnedValue: Buffer) => {
        assert.ok(inputBuffer.equals(returnedValue), "incorrect output buffer")
    };
    let applyPluginToMethodCallReturn: any = applyPluginToMethodCall.call(null, {
        method: {name:"methodB"},
        payload: inputBuffer
    },
    ctx,
    returnFn
    );
    assert.deepEqual(applyPluginToMethodCallReturn[0], {
        method: {name:"methodB"},
        payload: inputBuffer,
        params: params,
    }, "method parameters incorrectly decoded")
    assert.deepEqual(applyPluginToMethodCallReturn[1], ctx,  "context should be the same");
    applyPluginToMethodCallReturn[2](applyPluginToMethodCallReturn[0].params)



    let applyPluginToMethodCallReturn2: any = applyPluginToMethodCall.call(null, {
        method: {name:"methodC"},
        payload: inputBuffer
    },
    ctx,
    returnFn
    );
    assert.deepEqual(applyPluginToMethodCallReturn2[0], {
        method: {name:"methodC"},
        payload: inputBuffer
    }, "method parameters incorrectly decoded")
    assert.deepEqual(applyPluginToMethodCallReturn2[1], ctx,  "context should be the same");
    applyPluginToMethodCallReturn2[2](applyPluginToMethodCallReturn[0].payload)

    let applyPluginToMethodCallReturn3: any = applyPluginToMethodCall.call(null, {
        method: {name:"methodC"},
        payload: inputBuffer
    },
    ctx,
    returnFn
    );
    assert.deepEqual(applyPluginToMethodCallReturn3[0], {
        method: {name:"methodC"},
        payload: inputBuffer
    }, "method parameters incorrectly decoded")
    assert.deepEqual(applyPluginToMethodCallReturn3[1], ctx,  "context should be the same");
    applyPluginToMethodCallReturn3[2](applyPluginToMethodCallReturn3[0].payload)

    
    
    console.log("protobuf test passed")
}
main()