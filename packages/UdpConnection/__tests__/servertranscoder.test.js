'use strict';

const {ServerTranscoder} = require('../dist/ServerTranscoder');

describe('servertranscoder', () => {

    const serverTranscoder1 = new ServerTranscoder();
    const serverTranscoder2 = new ServerTranscoder(2,2);
    const serverTranscoder4 = new ServerTranscoder(4,4);
    const type1 = 97, seq1 = 23, buf1 = Buffer.from("000102030405060708090a0b0c0d0e0f10", "hex"), encoded1 = Buffer.from("6117000102030405060708090a0b0c0d0e0f10", "hex");
    const expectedResult = {
        type: type1,
        seq: seq1,
        payload: buf1
    }

    const type2 = 97, seq2 = 0, buf2 = Buffer.from("000102030405060708090a0b0c0d0e0f10", "hex"), encoded2 = Buffer.from("61000102030405060708090a0b0c0d0e0f10", "hex");
    

    const st2encoded = serverTranscoder2.encode(type1, seq1, buf1);
    const st4encoded = serverTranscoder4.encode(type1, seq1, buf1);

    const st2decoded = serverTranscoder2.decode(st2encoded);
    const st4decoded = serverTranscoder4.decode(st4encoded);
    test("correct encoding with seq", () => {
        expect(serverTranscoder1.encode(type1, seq1, buf1)).toEqual(encoded1)
    })


    test("decoding with seq", () => {
        expect(serverTranscoder1.decode(encoded1)).toEqual({type: type1, seq: seq1, payload: buf1})
    })

    test("encoding without seq", () => {
        expect(serverTranscoder1.encode(type2, seq2, buf2)).toEqual(encoded2)
    })

    test("typelen 2", () => {
        expect(st2decoded).toEqual(expectedResult)
        
    })
    
    test("typelen 4", () => {
        expect(st4decoded).toEqual(expectedResult)
    })
});

