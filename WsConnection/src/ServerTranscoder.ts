"use strict";
export default class ServerTranscoder {
    private typeLen: number;
    private seqLen: number;

    constructor(typeLen = 1, seqLen = 1){
        this.typeLen = typeLen;
        this.seqLen = seqLen;

    }


    encodeInt(num: number, length: number){
        if(typeof num !== 'number' || num < 0 || num >= (256^length)){
            throw new Error(`can't encode ${num} into ${length} bytes`);
        }
        let out = Buffer.alloc(length);
        switch (length){
            case 1:
                out.writeUInt8(num, 0);
                break;
            case 2:
                out.writeUInt16BE(num, 0);
                break;
            case 4:
                out.writeUInt32BE(num, 0);
                break;
            default:
                throw new Error('invalid UInt length ' + length);
        }
        return out
    }


    readInt(buf: Buffer){
        switch (buf.length){
            case 1:
                return buf.readUInt8(0);
            case 2:
                return buf.readUInt16BE(0);
            case 4:
                return buf.readUInt32BE(0);
            default:
                throw new Error('invalid UInt length ' + buf.length);
        }
    }


    encode(type: number, seq: number, encodedMessage: Buffer){
        if(!(encodedMessage instanceof Buffer)){
            console.error('ServerTranscoder error: encodedMessage is not a Buffer, it is:', encodedMessage);
            return;
        }
        try {
            return Buffer.concat([
                this.encodeInt(type, this.typeLen),
                seq === 0 ? Buffer.alloc(0) : this.encodeInt(seq, this.seqLen),
                encodedMessage
            ]);
        }
        catch (e){
            console.error('error in encoding', arguments, e);
        }
    }

    decode(messageBuffer: Buffer){
        if(!Buffer.isBuffer(messageBuffer)){
            console.error(messageBuffer);
            throw "got invalid messageBuffer type in decoder. Probably because the client sent a string instead of binary data";
        }

        try {
            return {
                type: this.readInt(messageBuffer.slice(0, this.typeLen)),
                seq: this.readInt(messageBuffer.slice(this.typeLen, this.typeLen + this.seqLen)),
                payload: messageBuffer.slice(this.typeLen + this.seqLen)
            }
        }
        catch (e){
            console.error('error in decoding', arguments, e);
        }
    }
    /*
    Note:
    When encoding, the sequence number is omitted when the message is not a response to a request and does not need to be tracked in this way.
    The server can never receive a request encoded like this and can therefore assume the sequence number will always be present.
    The client will know which types are associated with responses and notifications, and will therefore be able to predict if the sequence number is there or not.
     */
};