const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const fs = require('fs').promises;


const successful_upload = "";

module.exports = [
  {
    method: 'GET',
    path: '/gettutorsbycafedra',
    handler: async function (request, reply) {
      const params = request.query;
      const cafedraid = params.cafedraid;
      const tutors = await db.get_tutors_by_cafedra_id_for_manager(cafedraid);
      return tutors;
    },
  },
  {
    method: 'GET',
    path: '/getbonuspoints',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const points = await db.get_bonus_points_by_id(userid);
      return points;
    },
  },
  {
    method: 'GET',
    path: '/gettutordata',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const tutordata = await db.get_tutor_bonus_data_by_user_id(userid);
      if(!tutordata) {
        const empty_data = {
          userid: userid,
        };
        await db.create_row("cafedra_bonus_general", empty_data);
        return await db.get_tutor_bonus_data_by_user_id(userid);
      }
      return tutordata;
    },
  },
  {
    method: 'GET',
    path: '/gettutordataproforientation',
    handler: async function (request, reply) {
      const params = request.query;
      const userid = params.userid;
      const tutordata = await db.get_tutor_proforientation_data_by_user_id(userid);
      if(!tutordata) {
        const empty_data = {
          userid: userid,
        };
        await db.create_row("cafedra_bonus_general", empty_data);
        return await db.get_tutor_proforientation_data_by_user_id(userid).proforientation_student_count;
      }
      return tutordata.proforientation_student_count;
    },
  }, 
  {
    method: 'GET',
    path: '/confirmtutorfile',
    handler: async function (request, reply) {
      const params = request.query;
      const confirmed_by = params.confirmed_by;
      const confirmed_for = params.confirmed_for;
      const category = params.category;
      await db.confirm_if_category_unconfirmed(confirmed_for, category);
      return { message: `Confirmed category ${category} for userid ${confirmed_for} by ${confirmed_by}` };
    },
  },
  {
    method: 'GET',
    path: '/confirmtutorcategory',
    handler: async function (request, reply) {
      const params = request.query;
      const confirmed_by = params.confirmed_by;
      const confirmed_for = params.confirmed_for;
      const category = params.category;
      await db.confirm_if_fileless_category_unconfirmed(confirmed_for, category);
      return { message: `Confirmed category ${category} for userid ${confirmed_for} by ${confirmed_by}` };
    },
  },
  
];