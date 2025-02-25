const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const mdl = require('@apis/moodle');
const fs = require('fs').promises;


const successful_upload = "Книга успешно добавлена";

module.exports = [
  {
    method: 'GET',
    path: '/getextradatacert',
    handler: async function (request, reply) {
      const params = request.query;
      const user_id = params.user_id;
      const data = await db.find_user_role(user_id,'plt_student');
      const groupdata = await plt.find_student_group(data.assotiated_id);
      if(groupdata) return groupdata.groupname
      else return undefined;
    },
  },
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
    path: '/getemployeeattendanceinfoshort',
    handler: async function (request, reply) {
      const params = request.query;
      const user_id = params.user_id;
      const iin = await db.get_iin_by_user_id(user_id);
      const attendance_data = await db.get_attendance_data_by_iin_employee(iin.iin,6);
      return attendance_data;
    },
  },
  {
    method: 'GET',
    path: '/getemployeeattendanceinfo',
    handler: async function (request, reply) {
      const params = request.query;
      const user_id = params.user_id;
      const iin = await db.get_iin_by_user_id(user_id);
      const attendance_data = await db.get_attendance_data_by_iin_employee(iin.iin,1000);
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
    path: '/gettutoracademicstatus',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const iin = await db.get_iin_by_user_id(userid);
      const tutor = await plt.get_tutor_academic_degree_by_iin(iin.iin);
      return tutor ? tutor.AcademicStatusID : 0;
    },
  },
  {
    method: 'GET',
    path: '/getpubsinfotutor',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const iin = await db.get_iin_by_user_id(userid);
      const info = await plt.get_tutorpubs_help(iin.iin);
      return info;
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
    path: '/getdataforstatement',
    handler: async function (request, reply) {
      const params = request.query;
      const user = await db.get_user_roles(params.userid);
      const info = await plt.get_student_statement_data(user[0].assotiated_id);
      return info;
    },
  },
  {
    method: 'GET',
    path: '/getdataforcard',
    handler: async function (request, reply) {
      const params = request.query;
      const user = await db.get_user_roles(params.userid);
      const info = await plt.get_student_card_data(user[0].assotiated_id);
      return info;
    },
  },
  {
    method: 'GET',
    path: '/getroomnumber',
    handler: async function (request, reply) {
      const params = request.query;
      const roomnumber = await db.get_student_dorm_room_number(params.iin);
      return roomnumber;
    },
  },
  {
    method: 'GET',
    path: '/getagreementdata',
    handler: async function (request, reply) {
      const params = request.query;
      const data = await plt.get_student_agreement_data(params.iin);
      return data;
    },
  },
  {
    method: 'GET',
    path: '/createdormdocs',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const statementdata = params.statementdata;
      const carddata = params.carddata;
      const parentsdata = params.parentsdata;
      const exists = await db.find_student_dorm_docs(userid);
      if (exists.length > 0){
        await db.update_student_dorm_docs(userid,statementdata,carddata,parentsdata);
      }
      else{
        const docs = {
            userid: userid,
            statementdata: statementdata,
            carddata: carddata,
            parentsdata: parentsdata
          };
          await db.create_row("dormdocuments", docs);
      }
      return;
    },
  },
];