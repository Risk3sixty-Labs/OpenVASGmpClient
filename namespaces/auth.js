"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Auth;

var _jsontoxml = _interopRequireDefault(require("jsontoxml"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Auth() {
  return {
    async authenticate(username = null, password = null) {
      await this.connect();
      username = username || this.config.username || this.config.user;
      password = password || this.config.password;
      const xml = (0, _jsontoxml.default)({
        authenticate: {
          credentials: [{
            name: 'username',
            text: username
          }, {
            name: 'password',
            text: password
          }]
        }
      });
      return await this.buildResponsePromiseWithTimeout(xml);
    }

  };
}