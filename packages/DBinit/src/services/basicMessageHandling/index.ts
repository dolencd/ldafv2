

const data = {
    
    name: "basicMessageHandling",
    extensions: [
        "protobuf",
        "messageEvent"
    ],

    protoFiles: [
        "./basicMessageHandling.proto"
    ],
    
    messageTypes:
        [
            {
                name: 'add',
                type: 'req',
                schemaName: "callAdd"
            },
            {
                name: 'add',
                type: 'res',
                schemaName: "returnAdd"
            }
        ]
}

export default {
    ...data,
    src: (toExtend: any) => {
        return class extends toExtend {
            constructor(){
                super(data);
                this.clg("basic message handling constructor")
            
                this.on("add", (callObj: any) => {
                    
                })
            }
        }
    }
}