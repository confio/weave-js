let protobuf = require("protobufjs");


export function loadAccount(cb) {
    // init logic
    protobuf.load("account.proto", function(err, root) {
        if (err) {
            return cb(err);
        }

        // Obtain a message type
        let AccountMessage = root.lookupType("cash.Set");
        return cb(nil, AccountMessage);
    }
}

export function parseAccount(buffer) {
  let decodedMessage = AccountMessage.decode(buffer);
  return decodedMessage
}
