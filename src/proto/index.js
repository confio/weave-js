let protobuf = require("protobufjs");

let _acccountMessage = null;

// TODO: something better!!!
let protoPath = "/Users/ethan/golang/src/github.com/confio/weave-js/src/proto/account.proto";

async function accountClass() {
    if (_acccountMessage == null) {
        console.log("parse __accountMessage");
        _acccountMessage = await protobuf.load(protoPath)
                                .then(root => root.lookupType("mycoin.Set"))
                                // .catch(err => console.log("Err:" + err));
    }
    return _acccountMessage;
}

export async function parseAccount(buffer) {
    let Account = await accountClass();
    let decodedMessage = Account.decode(buffer);
    return Account.toObject(decodedMessage);
}

export async function serializeAccount(obj) {
    let Account = await accountClass();
    let err = Account.verify(obj);
    if (err) throw Error(err);

    let buffer = Account.encode(obj).finish();
    return buffer;
}
