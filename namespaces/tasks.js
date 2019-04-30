"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Tasks;

var _jsontoxml = _interopRequireDefault(require("jsontoxml"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Tasks() {
  return {
    // https://docs.greenbone.net/API/GMP/gmp-8.0.html#command_create_task
    async create_task({
      name,
      // required
      comment,
      config,
      // required, uuid
      target,
      // required, uuid
      scanner //required, uuid

    }) {
      await this.connect();
      let json = {
        create_task: [{
          name: 'name',
          text: name
        }, {
          name: 'comment',
          text: comment
        }, {
          name: 'config',
          attrs: {
            id: config
          }
        }, {
          name: 'target',
          attrs: {
            id: target
          }
        }, {
          name: 'scanner',
          attrs: {
            id: scanner
          }
        }]
      };
      return await this.buildResponsePromiseWithTimeout((0, _jsontoxml.default)(json));
    },

    // https://docs.greenbone.net/API/GMP/gmp-8.0.html#command_get_tasks
    async get_tasks(uuid = null) {
      await this.connect(); // Give root element attributes
      // https://github.com/soldair/node-jsontoxml/issues/26

      let json = [{
        name: 'get_tasks'
      }];
      if (uuid) json[0] = { ...json[0],
        attrs: {
          task_id: uuid
        }
      };
      return await this.buildResponsePromiseWithTimeout((0, _jsontoxml.default)(json));
    },

    // https://docs.greenbone.net/API/GMP/gmp-8.0.html#command_get_results
    async get_task_results(taskUuid, resultId = null) {
      await this.connect(); // Give root element attributes
      // https://github.com/soldair/node-jsontoxml/issues/26

      let json = [{
        name: 'get_results',
        attrs: {}
      }];
      if (resultId) json[0].attrs.result_id = resultId;else if (taskUuid) json[0].attrs.filter = `task_id=${taskUuid}`;
      return await this.buildResponsePromiseWithTimeout((0, _jsontoxml.default)(json));
    }

  };
}