const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const fs = require('fs').promises;


const successful_upload = "Книга успешно добавлена";

module.exports = [
  {
    method: 'GET',
    path: '/getstudentinfo',
    handler: async function (request, reply) {
      const params = request.query;
      const user_id = params.user_id;
      const user = await db.find_user_role(user_id,'plt_student');
      const studentinfo = await plt.get_student_data_by_qr(user.assotiated_id);
      return studentinfo;
    },
  },
  {
    method: 'GET',
    path: '/getuserrole',
    handler: async function (request, reply) {
      const params = request.query;
      const user_id = params.user_id;
      const user = await db.get_user_role(user_id);
      return user;
    },
  },
];