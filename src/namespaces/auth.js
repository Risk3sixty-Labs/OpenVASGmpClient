import jsonxml from 'jsontoxml'

export default function Auth() {
  return {
    async authenticate(username=null, password=null) {
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

      return await this.buildResponsePromiseWithTimeout(xml)
    }
  }
}
