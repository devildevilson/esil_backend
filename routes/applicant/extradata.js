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
        method: 'POST',
        path: '/update',
        handler: async function (req, reply) {
          //const user_id = req.body.userid;
          //const column = req.body.column;
          //const data = req.body.data;
          //console.log("...");
          //console.log(user_id);
          //console.log(column);
          //console.log(data);
          console.log("...");
          console.log(req.body);
          return {message: 'test_complete'};
        //   if(canupload){ 
        //     const file_data = {
        //       userid: req.body.user_id,
        //       activityid: req.body.activity_id,
        //       extradata1: req.body.info,
        //       file_path: FILE_PATH+cleared_filename,
        //       filename: cleared_filename,
        //       upload_date: common.human_date(new Date()),
        //     };
        //     const file = await db.create_row("files", file_data);
        //     //await res.code(200).send('processed');
        //     const update = await db.update_kpi_for_user(req.body.user_id);
        //     return {message: successful_upload};
        //   }
        //   else{
        //     const file_storage = await deleteFile(cleared_filename);
        //     //await reply.setHeader('message',cant_upload_unique_activity);
        //     return {message: cant_upload_unique_activity};
        //   }
        },
    },
];