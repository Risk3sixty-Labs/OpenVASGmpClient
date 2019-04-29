import tls from 'tls'
import jsonxml from 'jsontoxml'
import { parseString } from 'xml2js'

const NOOP = () => {}

export default function GmpClient(options={}) {
  let socket = null

  return {
    config: {
      host: 'localhost',
      port: 9390,
      onError: NOOP, // Pass a function if you want to handle errors from the TLS connection
      // rejectUnauthorized: true --- pass false if we don't care about security

      ...options
    },

    // Will be true when a command has been sent and we're waiting on a response
    // from the server.
    processingCommand: false,

    // Holds a queue of GMP XML commands to send the Greenbone Vulnerability
    // Management Daemon (gmvd)
    xmlCommandQueue: [],

    // Holds a queue that should equal the length of xmlCommandQueue
    // and in the same position, it will hold an object { resolve, reject }
    // that corresponds to the Promise resolvers to pass the response data
    // to
    responseHandlerQueue: [],

    async connect(host=this.config.host, port=this.config.port) {
      // If we've already established a connection, require closing
      // the first one before creating a new one.
      if (socket)
        return false

      // Only allow insecure connections if the user explicitly
      // said to allow it in the initial config options.
      const rejectUnauthorized = (typeof this.config.rejectUnauthorized !== 'undefined')
        ? this.config.rejectUnauthorized
        : true

      return await new Promise((resolve, reject) => {
        socket = tls.connect({ host, port, rejectUnauthorized }, () => {
          socket.setEncoding('utf8')
          socket.on('data', this._onResponse.bind(this))
          // socket.on('close', this.end.bind(this))
          socket.on('error', this.config.onError.bind(this))

          // https://nodejs.org/api/tls.html#tls_tlssocket_authorized
          resolve(socket.authorized)
        })
      })
    },

    async login(username=null, password=null) {
      await this.connect()

      username = username || this.config.username || this.config.user
      password = password || this.config.password

      const xml = jsonxml({
        authenticate: {
          credentials: [
            { name: 'username', text: username },
            { name: 'password', text: password }
          ]
        }
      })
      console.log("XML", xml)

      return await new Promise((resolve, reject) => {
        this.sendCommand(xml, { resolve, reject })
      })
    },

    sendCommand(xmlCmd, resObj) {
      this.xmlCommandQueue.push(xmlCmd)
      this.responseHandlerQueue.push(resObj)
      this._sendCommand()
    },

    end() {
      if (socket)
        socket.destroy()

      return socket = null
    },

    _onResponse(xmlResponseData) {
      const { resolve, reject } = this.responseHandlerQueue.shift()
      this._parseXmlAndSend(xmlResponseData, resolve, reject)

      this.processingCommand = false
      this._sendCommand()
    },

    _sendCommand() {
      if (this.processingCommand)
        return

      if (this.xmlCommandQueue.length == 0)
        return

      this.processingCommand = true
      socket.write(this.xmlCommandQueue.shift())
    },

    _parseXmlAndSend(xml, resolve, reject) {
      // TODO: For now resolve any response and put the responsibility
      // of the calling user to handle issues. Should we do better about
      // parsing responses and reject if there's a problem?
      parseString(xml, { async: true }, (err, obj) => {
        if (err)
          return reject(err)
        resolve(obj)
      })
    }
  }
}
