require('module-alias/register');
const db = require("@apis/db");
const plt = require("@apis/platonus");
const common = require("@core/common");

const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const could_not_get_cert_data_msg = "Cert data request is not possible";
const cert_id_not_found_msg = "Could not find certificate with this id";
const cert_user_id_not_found_msg = "Could not find certificates by user id";

const role_id = "plt_applicant";

module.exports = [
  {
    method: 'GET',
    handler: async function (request, reply) {
      const token_data = await common.decode_token(request.query.token);
      if (token_data.error) return reply.forbidden(token_data.error);

      const adm_role = await db.find_user_role(token_data.id, "admissionadmin");
      if (!adm_role) return reply.forbidden(role_not_found_msg);

      const users = await db.get_users_with_role(role_id);
      return users;
    },
    schema: {
      querystring: {
        type: "object",
        required: [ "token" ],
        properties: {
          token: { type: "string" }
        } 
      }
    }
  },
];