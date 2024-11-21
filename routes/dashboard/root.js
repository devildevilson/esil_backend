const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const fs = require('fs').promises;


const successful_upload = "";

module.exports = [
  {
    method: 'GET',
    path: '/generate',
    handler: async function (request, reply) {
        let data = {};
        const plt_data = await plt.generate_dashboard_data();
        const cloud_data = await db.get_dashboard_data();
        Object.assign(data,plt_data,cloud_data);
        
        return data;
    //  const params = request.query;
    //  const userid = params.userid;
    //  const tutordata = await db.get_tutor_bonus_data_by_user_id(userid);
    //  if(!tutordata) {
    //    const empty_data = {
    //      userid: userid,
    //    };
    //    await db.create_row("cafedra_bonus_general", empty_data);
    //    return await db.get_tutor_bonus_data_by_user_id(userid);
    //  }
    //  return tutordata;
    },
  },
];