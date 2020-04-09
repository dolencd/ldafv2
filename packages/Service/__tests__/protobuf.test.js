
'use strict';
process.chdir("dist")
const {init, applyPluginToMethodCall} = require("../dist/plugins/protobuf/main.js");

const testConfig = {
    "name": "adder",
    "plugins": [
        {
            "name": "protobuf",
            "src": "url? DB ID?",
            "config": {
                "protoFiles": [
                    "../test.proto"
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
}


describe('protobuf', () => {
    test("it initializes", async () => {
        expect(await init(testConfig)).toBe(true);
    })
    const inputBuffer = Buffer.from("08d209120b61626364656667683132331801", "hex");
    const params = {
        number: 1234, 
        string: "abcdefgh123",
        boolean: true
    };
    const ctx = {ctx:"ctx"}

    
    
    test("method with defined input and output schema - params", () => {
        let applyPluginToMethodCallReturn = applyPluginToMethodCall.call(null, {
            method: {name:"methodB"},
            payload: inputBuffer
        },
        ctx,
        (newCtx, returnedValue) => {
            
            expect(newCtx).toEqual(ctx);
            expect(inputBuffer).toEqual(returnedValue);
            
        });
        
        expect(applyPluginToMethodCallReturn[0]).toEqual({
            method: {name:"methodB"},
            payload: inputBuffer,
            params: params,
        })
    })

    test("method with defined input and output schema - context", () => {
        let applyPluginToMethodCallReturn = applyPluginToMethodCall.call(null, {
            method: {name:"methodB"},
            payload: inputBuffer
        },
        ctx,
        (newCtx, returnedValue) => {
            
            expect(newCtx).toEqual(ctx);
            expect(inputBuffer).toEqual(returnedValue);
            
        });

        expect(applyPluginToMethodCallReturn[1]).toEqual(ctx)
        applyPluginToMethodCallReturn[2](applyPluginToMethodCallReturn[1], applyPluginToMethodCallReturn[0].params)
    })
    


    
    test("method without protobuf settings - params", () => {
        let applyPluginToMethodCallReturn2= applyPluginToMethodCall.call(null, {
            method: {name:"methodC"},
            payload: inputBuffer
        },
        ctx,
        (newCtx, returnedValue) => {
                
            expect(newCtx).toEqual(ctx);
            expect(inputBuffer).toEqual(returnedValue);
            
        });
        expect(applyPluginToMethodCallReturn2[0]).toEqual({
            method: {name:"methodC"},
            payload: inputBuffer
        })
    })

    test("method without protobuf settings - context", () => {

        let applyPluginToMethodCallReturn2= applyPluginToMethodCall.call(null, {
            method: {name:"methodC"},
            payload: inputBuffer
        },
        ctx,
        (newCtx, returnedValue) => {
                
            expect(newCtx).toEqual(ctx);
            expect(returnedValue).toBe(undefined);
            
        });
        expect(applyPluginToMethodCallReturn2[1]).toEqual(ctx);
        applyPluginToMethodCallReturn2[2](applyPluginToMethodCallReturn2[1], applyPluginToMethodCallReturn2[0].params)
    
    })
    
});
