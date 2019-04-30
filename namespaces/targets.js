"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Targets;

var _jsontoxml = _interopRequireDefault(require("jsontoxml"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Targets() {
  return {
    // https://docs.greenbone.net/API/GMP/gmp-8.0.html#command_create_target
    async create_target({
      name,
      // required
      comment,
      // one of the following should be present
      asset_hosts,
      hosts,
      exclude_hosts
    }) {
      await this.connect();
      let json = {
        create_target: [{
          name: 'name',
          text: name
        }, {
          name: 'comment',
          text: comment
        }]
      };
      if (asset_hosts) json.create_target.push({
        name: 'asset_hosts',
        text: asset_hosts
      });
      if (hosts) json.create_target.push({
        name: 'hosts',
        text: hosts
      });
      if (exclude_hosts) json.create_target.push({
        name: 'exclude_hosts',
        text: exclude_hosts
      });
      return await this.buildResponsePromiseWithTimeout((0, _jsontoxml.default)(json));
    },

    // https://docs.greenbone.net/API/GMP/gmp-8.0.html#command_get_targets
    async get_targets(uuid = null) {
      await this.connect(); // Give root element attributes
      // https://github.com/soldair/node-jsontoxml/issues/26

      let json = [{
        name: 'get_targets'
      }];
      if (uuid) json[0] = { ...json[0],
        attrs: {
          target_id: uuid
        }
      };
      return await this.buildResponsePromiseWithTimeout((0, _jsontoxml.default)(json));
    }

  };
}