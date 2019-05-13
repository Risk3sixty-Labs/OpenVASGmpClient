import tls from 'tls'
import jsonxml from 'jsontoxml'
import { parseString } from 'xml2js'
import Auth from './namespaces/auth'
import Targets from './namespaces/targets'
import Tasks from './namespaces/tasks'

const NOOP = () => {}

export default function GmpClient(options={}) {
  let socket = null

  return {
    ...Auth(),
    ...Targets(),
    ...Tasks(),

    config: {
      host: 'localhost',
      port: 9390,
      timeout: 30,    // seconds for a command to get a response before rejecting
      onError: NOOP,  // Pass a function if you want to handle errors from the TLS connection
      xml: false,     // Pass true if you want the response to return the raw GMP XML response, otherwise will pass back JSON
      // rejectUnauthorized: true --- pass false if we don't care about security

      ...options
    },

    // tmpAggregateResponseData:
    // If a response from the server is longer than a chunk that
    // is sent through the TLS socket, this will be used as a temporary cache
    // to store all the data in aggregate in hopes that we will get all
    // data after several read events and be able to parse the XML
    //
    // tmpResolveReject:
    // If we're buffering data in tmpAggregateResponseData, this will
    // temporarily hold the resolve, reject functions to use after all
    // data is passed.
    tmpAggregateResponseData: '',
    tmpResolveReject: null,

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

    async buildResponsePromiseWithTimeout(xmlCmd) {
      return await Promise.race([
        (async () => {
          await this._sleep(this.config.timeout * 1e3)
          throw new Error(`No response provided for previous command: ${xmlCmd}`)
        })(),

        new Promise((resolve, reject) => {
          this.sendCommand(xmlCmd, { resolve, reject })
        })
      ])
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

    async _sleep(milliseconds) {
      return new Promise(resolve => setTimeout(resolve, milliseconds))
    },

    async _onResponse(xmlResponseData) {
      let obj = this.tmpResolveReject
      if (!obj)
        obj = this.responseHandlerQueue.shift()

      if (!obj)
        throw new Error(`No way to resolve the response from the server`, obj)

      const { resolve, reject } = obj
      const isFinishProcessing = await this._parseXmlAndSend(xmlResponseData, resolve, reject)
      if (!isFinishProcessing)
        return

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

    async _parseXmlAndSend(xml, resolve, reject) {
      this.tmpAggregateResponseData += xml
      this.tmpResolveReject = { resolve, reject }

      // TODO: For now resolve any response and put the responsibility
      // of the calling user to handle issues. Should we do better about
      // parsing responses and reject if there's a problem?
      return await new Promise(resolveIsFinished => {
        parseString(this.tmpAggregateResponseData, { async: true }, (err, obj) => {
          if (err) {
            // Don't reject here as we will currently assume that
            // the response is too big to be passed in a single `data`
            // event. We will simply cache the XML and resolve, reject
            // functions and finish receiving packets until we get valid
            // complete XML doc
            // return reject(err)

            return resolveIsFinished(false)
          }

          const fullXmlCopy = this.tmpAggregateResponseData
          this.tmpAggregateResponseData = ''
          this.tmpResolveReject = null
          resolve((this.xml) ? fullXmlCopy : obj)
          resolveIsFinished(true)
        })
      })
    }
  }
}
