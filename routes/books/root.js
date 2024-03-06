const common = require('@core/common');
const db = require('@apis/db');
const fs = require('fs').promises;


const successful_upload = "Книга успешно добавлена";
const book_upload_error = "Внутренняя ошибка загрузки новой книги";
const book_deletion_error = "Внутренняя ошибка удаления книги";
const book_assignment_error = "Внутренняя ошибка создания прикрепления";
const book_assignment_removal_error = "Внутренняя ошибка удаления прикрепления";

// async function deleteFile(filename) {
//   if (filename != '') {
//     try {
//       console.log(`File ${filename} has been deleted.`);
//     } catch (err) {
//       console.log(err);
//     }
//   }
//   else {
//     return 'failed';
//   }
// }

module.exports = [
    {
      method: 'POST',
      url: '/uploadBook',
      handler: async function (req, reply) {
        const canupload = await db.check_upload_eligibility(req.body.activity_id, req.body.user_id);
        const payload = req.file;
        console.log(payload);
        let cleared_filename = payload.filename;
        cleared_filename = cleared_filename.replace(/\s+/g, '-');
        if(canupload){ 
          const file_data = {
            userid: req.body.user_id,
            activityid: req.body.activity_id,
            extradata1: req.body.info,
            
            filename: cleared_filename,
            upload_date: common.human_date(new Date()),
          };
          const file = await db.create_row("files", file_data);
          const update = await db.update_kpi_for_user(req.body.user_id);
          return {message: successful_upload};
        }
        else{
          const file_storage = await deleteFile(cleared_filename);
          return {message: cant_upload_unique_activity};
        }
      },
    },
    {
      method: 'GET',
      path: '/files/:user_id', 
      handler: async function (request, reply) {
        const file_datas = await db.get_file_records_by_user_id(request.params.user_id);
        return file_datas;
      },
      schema: {
        params: {
          type: "object",
          required: [ "user_id" ],
          properties: {
            user_id: { type: "number" }
          } 
        },
      }
    },
    {
      method: 'DELETE',
      path: '/delete', 
      handler: async function (request, reply) {
        console.log('logging out the request params');
        console.log(request.body);
        try{
          const file_storage = await deleteFile(request.body.filename);
          const file_db = await db.delete_file_by_filename(request.body.filename);
          const update = await db.update_kpi_for_user(request.body.user_id);
        }
        catch(err){
          return err;
        }
        return 'deleted';
      },
    }, 
    {
      method: 'GET',
      path: '/getstats',
      handler: async function (request,reply){
        const tutors = await db.get_cafedra_stats();
        return tutors;
      },
    },
];