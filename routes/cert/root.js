require('module-alias/register');
const boom = require("@hapi/boom");
const joi = require("joi");
const db = require("@apis/db");
const common = require("@core/common");

const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const could_not_get_cert_data_msg = "Cert data request is not possible";
const cert_id_not_found_msg = "Could not find certificate with this id";
const cert_user_id_not_found_msg = "Could not find certificates by user id";

module.exports = [
  {
    method: 'GET',
    path: '/{cert_id}', 
    handler: async function (request, h) {
      const cert_data = await db.find_cert_record(request.params.cert_id);
      if (!cert_data) throw boom.notFound(cert_id_not_found_msg);

      return cert_data;
    },
    options: {
      validate: {
        params: joi.object({
          cert_id: joi.number().required()
        })
      }
    }
  },
  {
    method: 'GET',
    path: '/list/{user_id}', 
    handler: async function (request, h) {
      // request.query.token

      const cert_datas = await db.get_cert_records_by_user_id(request.params.user_id);
      if (cert_datas.length === 0) throw boom.notFound(cert_user_id_not_found_msg);

      return cert_datas;
    },
    options: {
      validate: {
        params: joi.object({
          user_id: joi.number().required()
        })
      }
    }
  }
];