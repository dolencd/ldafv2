const {join} = require("path");
const protobufjs = require("protobufjs");


let projectRoot = require.main ? require.main.filename : __dirname;
module.exports = class Protobuf extends toExtend {
            constructor(extConfig, serviceConfig){
                
                this.clg("protobuf extension constructor")
                this.protoFiles = extConfig.protoFiles
                

                let servicePath = join(projectRoot, "..", "service")
                this.protoRoots = this.protoFiles.map((protoFilePath) => {
                    return protobufjs.loadSync(join( servicePath, protoFilePath));
                })

                this.messageTypes.map((callType) => {
                    let schema = this._protobuf_searchRoots(callType.schemaName);

                    return {
                        schema,
                        encode: (obj) => schema.encode(schema.create(obj)).finish(),
                        decode: (buf) => schema.decode(buf),
                        ...callType
                    }
                })

            }

            _protobuf_searchRoots(name){
                this.protoRoots.map((root) => {
                    let schema = root.lookupType(name);
                    if(schema) return schema;
                })
                
                return null;
            }

            
            incomingCall(event, context, callback){
                
            }


        }
    }
}