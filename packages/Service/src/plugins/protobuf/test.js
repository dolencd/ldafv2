const {init, methodCall, messageTypes} = require("./main");
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
                "type": "req/res",
                "pluginConfig": {
                    "protobuf":{
                        "inputSchema": "a",
                        "outputSchema": "a"
                    }
                } 
            },
            {
                "name": "methodC",
                "type": "req/res"
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
    let methodCallReturn = methodCall.call(null, {
        method: "methodB",
        bufferParams: inputBuffer
    },
    ctx,
    returnFn
    );
    assert.deepEqual(methodCallReturn[0], {
        method: "methodB",
        bufferParams: inputBuffer,
        params: params,
    }, "method parameters incorrectly decoded")
    assert.deepEqual(methodCallReturn[1], ctx,  "context should be the same");
    methodCallReturn[2](methodCallReturn[0].params)



    let methodCallReturn2 = methodCall.call(null, {
        method: "methodC",
        bufferParams: inputBuffer
    },
    ctx,
    returnFn
    );
    assert.deepEqual(methodCallReturn2[0], {
        method: "methodC",
        bufferParams: inputBuffer
    }, "method parameters incorrectly decoded")
    assert.deepEqual(methodCallReturn2[1], ctx,  "context should be the same");
    methodCallReturn2[2](methodCallReturn[0].bufferParams)

    let methodCallReturn3 = methodCall.call(null, {
        method: "methodC",
        bufferParams: inputBuffer
    },
    ctx,
    returnFn
    );
    assert.deepEqual(methodCallReturn3[0], {
        method: "methodC",
        bufferParams: inputBuffer
    }, "method parameters incorrectly decoded")
    assert.deepEqual(methodCallReturn3[1], ctx,  "context should be the same");
    methodCallReturn3[2](methodCallReturn3[0].bufferParams)

    
    
    console.log("protobuf test passed")
}
main()