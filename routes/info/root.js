const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const mdl = require('@apis/moodle');
const fs = require('fs').promises;


const successful_upload = "Книга успешно добавлена";

module.exports = [
  {
    method: 'GET',
    path: '/getattendanceinfoshort',
    handler: async function (request, reply) {
      const params = request.query;
      const user_id = params.user_id;
      const iin = await db.get_iin_by_user_id(user_id);
      const attendance_data = await db.get_attendance_data_by_iin(iin.iin,6);
      return attendance_data;
    },
  },
  {
    method: 'GET',
    path: '/getattendanceinfo',
    handler: async function (request, reply) {
      const params = request.query;
      const user_id = params.user_id;
      const iin = await db.get_iin_by_user_id(user_id);
      const attendance_data = await db.get_attendance_data_by_iin(iin.iin,1000);
      return attendance_data;
    },
  },
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
  {
    method: 'GET',
    path: '/getmoodleinfotutor',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const iin = await db.get_iin_by_user_id(userid);
      const tutor = await plt.find_tutor_by_iin(iin.iin);
      const tutorid = tutor.plt_id;
      const info = await mdl.calculate_percentage_by_tutorid_info(tutorid);
      return info;
    },
  },
  {
    method: 'GET',
    path: '/gettutortestids',
    handler: async function (request, reply) {
      const params = request.query;
      const lastname = params.lastname;
      const info = await plt.get_tutor_tests_by_lastname(lastname);
      return info;
    },
  },
  
];