const {init, applyPluginToMethodCall, messageTypes} = require("./main");
const assert = require("assert");



const main = async () => {
    await init({
        "name": "adder",
        "plugins": {
            "protobuf": {
                "name": "protobuf",
                "config": {
                    "protoFiles": [
                        "./test.proto"
                    ]
                }
            }
        },
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
    returnFn = (returnedValue) => {
        assert.ok(inputBuffer.equals(returnedValue), "incorrect output buffer")
    };
    let applyPluginToMethodCallReturn = applyPluginToMethodCall.call(null, {
        method: "methodB",
        bufferParams: inputBuffer
    },
    ctx,
    returnFn
    );
    assert.deepEqual(applyPluginToMethodCallReturn[0], {
        method: "methodB",
        bufferParams: inputBuffer,
        params: params,
    }, "method parameters incorrectly decoded")
    assert.deepEqual(applyPluginToMethodCallReturn[1], ctx,  "context should be the same");
    applyPluginToMethodCallReturn[2](applyPluginToMethodCallReturn[0].params)



    let applyPluginToMethodCallReturn2 = applyPluginToMethodCall.call(null, {
        method: "methodC",
        bufferParams: inputBuffer
    },
    ctx,
    returnFn
    );
    assert.deepEqual(applyPluginToMethodCallReturn2[0], {
        method: "methodC",
        bufferParams: inputBuffer
    }, "method parameters incorrectly decoded")
    assert.deepEqual(applyPluginToMethodCallReturn2[1], ctx,  "context should be the same");
    applyPluginToMethodCallReturn2[2](applyPluginToMethodCallReturn[0].bufferParams)

    let applyPluginToMethodCallReturn3 = applyPluginToMethodCall.call(null, {
        method: "methodC",
        bufferParams: inputBuffer
    },
    ctx,
    returnFn
    );
    assert.deepEqual(applyPluginToMethodCallReturn3[0], {
        method: "methodC",
        bufferParams: inputBuffer
    }, "method parameters incorrectly decoded")
    assert.deepEqual(applyPluginToMethodCallReturn3[1], ctx,  "context should be the same");
    applyPluginToMethodCallReturn3[2](applyPluginToMethodCallReturn3[0].bufferParams)

    
    
    console.log("protobuf test passed")
}
main()