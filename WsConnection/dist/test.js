"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
console.log("start");
const assert_1 = __importDefault(require("assert"));
const ServerTranscoder_1 = __importDefault(require("./ServerTranscoder"));
const testTranscoder = async () => {
    const serverTranscoder1 = new ServerTranscoder_1.default();
    const type1 = 97, seq1 = 23, buf1 = Buffer.from("000102030405060708090a0b0c0d0e0f10", "hex"), encoded1 = Buffer.from("6117000102030405060708090a0b0c0d0e0f10", "hex");
    assert_1.default.deepEqual(serverTranscoder1.encode(type1, seq1, buf1), encoded1, "wrong encoding with seq");
    assert_1.default.deepEqual(serverTranscoder1.decode(encoded1), { type: type1, seq: seq1, payload: buf1 }, "wrong decoding with seq");
    const type2 = 97, seq2 = 0, buf2 = Buffer.from("000102030405060708090a0b0c0d0e0f10", "hex"), encoded2 = Buffer.from("61000102030405060708090a0b0c0d0e0f10", "hex");
    assert_1.default.deepEqual(serverTranscoder1.encode(type2, seq2, buf2), encoded2, "wrong encoding without seq");
    const serverTranscoder2 = new ServerTranscoder_1.default(2, 2);
    const serverTranscoder4 = new ServerTranscoder_1.default(4, 4);
    const st2encoded = serverTranscoder2.encode(type1, seq1, buf1);
    const st4encoded = serverTranscoder4.encode(type1, seq1, buf1);
    const st2decoded = serverTranscoder2.decode(st2encoded);
    const st4decoded = serverTranscoder4.decode(st4encoded);
    const expectedResult = {
        type: type1,
        seq: seq1,
        payload: buf1
    };
    assert_1.default.deepEqual(st2decoded, expectedResult, "typeLen and seqLen 2 output did not match input");
    assert_1.default.deepEqual(st4decoded, expectedResult, "typeLen and seqLen 4 output did not match input");
    return true;
};
const test = async () => {
    console.log("test transcoder", await testTranscoder());
    console.log("all tests complete");
    return true;
};
test();
//# sourceMappingURL=test.js.map