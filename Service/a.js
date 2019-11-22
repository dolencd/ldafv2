"use strict";
class src {
    constructor(params) {
        console.log("constructor A");
        this.a = params.a;
    }
    test() {
        // super();
        console.log("test a");
    }
}
class ext extends src {
    constructor(params) {
        super(params);
        console.log("constructor B");
        this.b = params.b;
    }
    test() {
        super.test();
        console.log("test b");
    }
}
let neki = new ext({ a: "a", b: "b" });
neki.test();
