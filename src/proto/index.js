import protobuf from "protobufjs";
import path from "path";

let _acccountMessage = null;

let protoPath = path.resolve(__dirname, "account.proto");

async function accountClass() {
    if (_acccountMessage == null) {
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
