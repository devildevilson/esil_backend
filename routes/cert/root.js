require('module-alias/register');
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
    path: '/:cert_id', 
    handler: async function (request, reply) {
      const cert_data = await db.find_cert_record(request.params.cert_id);
      if (!cert_data) return reply.notFound(cert_id_not_found_msg);

      return cert_data;
    },
    schema: {
      params: {
        type: "object",
        required: [ "cert_id" ],
        properties: {
          cert_id: { type: "number" }
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/list/:user_id', 
    handler: async function (request, reply) {
      const token_data = await common.decode_token(request.query.token);
      if (token_data.error) return reply.forbidden(token_data.error);

      if (token_data.id === request.params.user_id) {
        const role = await db.find_user_role(request.params.user_id, "plt_student");
        if (!role || role.assotiated_id === 0) return reply.forbidden(role_not_found_msg);
      } else {
        // должна быть роль просмотра справок
        const adm_role = await db.find_user_role(token_data.id, "admissionadmin");
        if (!adm_role) return reply.forbidden(role_not_found_msg);

        const role = await db.find_user_role(request.params.user_id, "plt_student");
        if (!role || role.assotiated_id === 0) return reply.forbidden(role_not_found_msg);
      }

      const cert_datas = await db.get_cert_records_by_user_id(request.params.user_id);
      if (cert_datas.length === 0) return reply.notFound(cert_user_id_not_found_msg);

      return cert_datas;
    },
    schema: {
      params: {
        type: "object",
        required: [ "user_id" ],
        properties: {
          user_id: { type: "number" }
        } 
      },
      querystring: {
        type: "object",
        required: [ "token" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  }
];