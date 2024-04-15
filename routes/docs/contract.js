require('module-alias/register');
const db = require("@apis/db");
const plt = require("@apis/platonus");
const common = require("@core/common");

const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const cert_id_not_found_msg = "Could not find certificate with this id";

const role_id = "plt_applicant";

module.exports = [
  {
    method: 'GET',
    path: '/contract/ru/:user_id', 
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

      // тут нужно скорее всего обратиться в platonus для необходимых данных
      // каких?
      const data = await plt.find_student_data_for_contract(role_index);
      if (!data) return reply.notFound(cert_id_not_found_msg);

      const meta_data = {
        user_id: token_data.id,
        for_user_id: request.params.user_id,
        type: "contract",
        lang: "ru"
      };
      // вообще await тут ни к чему
      await db.create_row("meta_generate_docs", meta_data);

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
  {
    method: 'GET',
    path: '/contract/kz/:user_id', 
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

      // тут нужно скорее всего обратиться в platonus для необходимых данных
      // каких?
      const data = await plt.find_student_data_for_contract_kz(role_index);
      if (!data) return reply.notFound(cert_id_not_found_msg);

      const meta_data = {
        user_id: token_data.id,
        for_user_id: request.params.user_id,
        type: "contract",
        lang: "kz"
      };
      // вообще await тут ни к чему
      await db.create_row("meta_generate_docs", meta_data);

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