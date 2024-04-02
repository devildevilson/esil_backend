require('module-alias/register');
const db = require("@apis/db");
const plt = require("@apis/platonus");
const common = require("@core/common");

const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const could_not_get_cert_data_msg = "Cert data request is not possible";
const app_data_not_found_msg = "Could not find student application data";
const cert_user_id_not_found_msg = "Could not find certificates by user id";

const role_id = "plt_applicant";

// это только русский, наверное нужно еще казахский вариант сделать
module.exports = [
  {
    method: 'GET',
    path: '/application/:user_id', 
    handler: async function (request, reply) {
      const token_data = await common.decode_token(request.query.token);
      if (token_data.error) return reply.forbidden(token_data.error);

      let role_index = 0;
      // скорее всего сменится роль + из роли нам нужно получить id
      if (token_data.id === request.params.user_id) {
        const role = await db.find_user_role(request.params.user_id, role_id);
        if (!role || role.assotiated_id === 0) return reply.forbidden(role_not_found_msg);
        role_index = role.assotiated_id;
      } else {
        // должна быть роль просмотра справок
        const adm_role = await db.find_user_role(token_data.id, "admissionadmin");
        if (!adm_role) return reply.forbidden(role_not_found_msg);

        const role = await db.find_user_role(request.params.user_id, role_id);
        if (!role || role.assotiated_id === 0) return reply.forbidden(role_not_found_msg);
        role_index = role.assotiated_id;
      }

      const data = await plt.find_student_data_for_application(role_index);
      if (!data) return reply.notFound(app_data_not_found_msg);

      return data;
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
  },
];