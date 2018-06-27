/* jshint esversion: 6 */

const EventEmitter = require('events');
const axios = require('axios');
const url = require('url');
const old = require('old');
const camel = require('camelcase');
const websocket = require('websocket-stream');
const ndjson = require('ndjson');
const pumpify = require('pumpify').obj;
const tendermintMethods = require('./methods.js');

function convertArgs (args) {
  args = args || {}
  for (let k in args) {
    let v = args[k]
    if (Buffer.isBuffer(v)) {
      args[k] = '0x' + v.toString('hex')
    } else if (v instanceof Uint8Array) {
      args[k] = '0x' + Buffer.from(v).toString('hex')
    }
  }
  return args;
}

class Client extends EventEmitter {
  constructor (uriString = 'localhost:46657') {
    super();
    let uri = url.parse(uriString);
    if (uri.protocol === '') {
      uri = url.parse(`http://${uriString}`);
    }
    if ((uri.protocol === 'ws:') || (uri.protocol === 'wss:')) {
      const port = uri.port || (uri.protocol === 'ws:' ? 80: 443);
      this.websocket = true;
      this.uri = `${uri.protocol}//${uri.hostname}:${port}/websocket`;
      this.call = this.callWs;
      this.connectWs()
    } else if ((uri.protocol === 'http:') || (uri.protocol === 'https:')) {
      const port = uri.port || (uri.protocol === 'http:' ? 80: 443);
      this.uri = `${uri.protocol}//${uri.hostname}:${port}/`;
      this.call = this.callHttp;
    } else {
      throw(new Error('unknown protocol: ' + uriString));
    }
  }

  connectWs () {
    this.ws = pumpify(
      ndjson.stringify(),
      websocket(this.uri)
    );
    this.ws.on('error', (err) => this.emit('error', err))
    this.ws.on('close', () => this.emit('error', Error('websocket disconnected')))
    this.ws.on('data', (data) => {
      // console.log("data: " + data);
      data = JSON.parse(data);
      if (!data.id) { return }
      this.emit(data.id, data.error, data.result)
    })
  }

  callHttp (method, args) {
    return axios({
      url: this.uri + method,
      params: args
    }).then(function ({ data }) {
      if (data.error) throw Error(data.error)
      return data
    }, function (err) {
      throw Error(err)
    })
  }

  callWs (method, args, listener) {
    let self = this
    return new Promise((resolve, reject) => {
      let id = Math.random().toString(36)
      let params = convertArgs(args)

      if (method === 'subscribe') {
        // events get passed to listener
        this.on(id + '#event', (err, res) => {
          if (err) return self.emit('error', err)
          if (res.data.data) {
            listener(res.data.data)
          } else {
            listener(res.data.value)
          }
        })

        // promise resolves on successful subscription or error
        this.on(id, (err) => {
          if (err) return reject(err)
          resolve()
        })
      } else {
        // response goes to promise
        this.once(id, (err, res) => {
          if (err) return reject(err)
          resolve(res)
        })
      }

      this.ws.write({ jsonrpc: '2.0', id, method, params })
    })
  }

  close () {
    if (!this.ws) return
    this.ws.destroy()
  }
}

// add methods to Client class based on methods defined in './methods.js'
for (let name of tendermintMethods) {
  Client.prototype[camel(name)] = function (args, listener) {
    return this.call(name, args, listener)
  }
}

module.exports = old(Client)
