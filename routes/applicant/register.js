require('module-alias/register');
const db = require("@apis/db");
const plt = require("@apis/platonus");
const common = require("@core/common");

const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const app_data_not_found_msg = "Абитуриент с этим ИИН не найден в базе";
const user_already_exists = "Этот пользователь уже есть в базе";
const success = "успешно добавлен";

const role_id = "plt_applicant";

module.exports = [
  {
    method: 'GET',
    path: '/register/:iin', 
    handler: async function (request, reply) {
      const iin = request.params.iin;
      const token_data = await common.decode_token(request.query.token);
      if (token_data.error) return reply.forbidden(token_data.error);

      const adm_role = await db.find_user_role(token_data.id, "admissionadmin");
      if (!adm_role) return reply.forbidden(role_not_found_msg);

      const user = await db.get_user_id_by_iin(iin);
      if (user) return { message: user_already_exists };

      const plt_data = await plt.find_applicant_by_iin(iin);
      if (!plt_data) return reply.notFound(app_data_not_found_msg);

      const password_hash = await common.hash_password(iin);
        
      const db_user_data = {
        name: plt_data.name,
        lastname: plt_data.lastname,
        middlename: plt_data.middlename,
        username: iin,
        iin: iin,
        password: password_hash,
      };
      
      const user_id = await db.create_row("users", db_user_data);
      const role_data = {
        user_id,
        role: "plt_applicant",
        assotiated_id: plt_data.plt_id
      };
      await db.create_row("roles", role_data);
      return { message: `${plt_data.lastname} ${plt_data.name} ` + success };
    },
    schema: {
      params: {
        type: "object",
        required: [ "iin" ],
        properties: {
          iin: { type: "string" }
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