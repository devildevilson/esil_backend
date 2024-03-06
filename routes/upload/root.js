const Multer = require('fastify-multer');
const common = require('@core/common');
const db = require('@apis/db');
const fs = require('fs').promises;

const FILE_PATH = process.env.ROOT_PATH;

const kpi_internal_error = "Internal KPI counter error";
const file_id_not_found_msg = "Could not find file with this id";
const file_user_id_not_found_msg = "Could not find files by user id";
const cant_upload_unique_activity = "Этот показатель уже загружен";
const successful_upload="Файл был загружен";


var storage = Multer.diskStorage({
    destination: function(req,file,cb){
        cb(null, FILE_PATH)
    },
    filename: function(req,file,cb){
        cb(null, Date.now()+'-'+file.originalname.replace(/\s+/g, '-'));
    },
});

var upload = Multer({
    storage: storage,
    limits: { fileSize: 10000000  }
});

async function deleteFile(filename) {
  if (filename != '') {
    try {
      await fs.unlink(FILE_PATH + filename);
      console.log(`File ${filename} has been deleted.`);
    } catch (err) {
      console.log(err);
    }
  }
  else {
    return 'failed';
  }
}

module.exports = [
    {
      method: 'POST',
      url: '/upload',
      preHandler: upload.single('file'),
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
            file_path: FILE_PATH+cleared_filename,
            filename: cleared_filename,
            upload_date: common.human_date(new Date()),
          };
          const file = await db.create_row("files", file_data);
          //await res.code(200).send('processed');
          const update = await db.update_kpi_for_user(req.body.user_id);
          return {message: successful_upload};
        }
        else{
          const file_storage = await deleteFile(cleared_filename);
          //await reply.setHeader('message',cant_upload_unique_activity);
          return {message: cant_upload_unique_activity};
        }
      },
    },
    {
      method: 'GET',
      path: '/files/:user_id', 
      handler: async function (request, reply) {
          // должна быть роль просмотра файлов
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
      method: 'GET',
      path: '/getscore/:user_id', 
      handler: async function (request, reply) {
          // должна быть роль просмотра файлов
        const file_datas = await db.get_kpiscore_by_userid(request.params.user_id);
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
      method: 'GET',
      path: '/getcategoryscore/:user_id', 
      handler: async function (request, reply) {
        const file_datas = await db.get_total_scores_for_userid(request.params.user_id);
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
      method: 'GET',
      path: '/getumkdmoodle/:user_id', 
      handler: async function (request, reply) {
        const file_datas = await db.get_umkd_moodle_by_userid(request.params.user_id);
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
      method: 'GET',
      path: '/getpltdata/:user_id', 
      handler: async function (request, reply) {
        const score_datas = await db.get_tutor_plt_data(request.params.user_id);
        return score_datas;
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
      method: 'GET',
      path: '/download/:filename', 
      handler: async function (request, reply) {
        
        // должна быть роль просмотра файлов
        const file_datas = 1;
        return file_datas;
      },
      schema: {
        params: {
          type: "object",
          required: [ "filename" ],
          properties: {
            filename: { type: "string" }
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
      // schema
    },
    {
      method: 'DELETE',
      path: '/deleteuser/:iin', 
      handler: async function (request, reply) {
        try{
          const update = await db.delete_user_by_iin(request.params.iin);
          return update;
        }
        catch(err){
          return err;
        }
      },
    },
    {
      method: 'GET',
      path: '/activities/:categoryid', 
      handler: async function (request, reply) {
          const categories = await db.get_activities_by_category(request.params.categoryid)
          return categories;
      },
      schema: {
        params: {
          type: "object",
          required: [ "categoryid" ],
          properties: {
            categoryid: { type: "number" }
          } 
        },
      }
    },
    {
      method: 'GET',
      path: '/gettutors/:cafedraid',
      handler: async function (request,reply){
        const tutors = await db.get_tutors_by_cafedra_id(request.params.cafedraid);
        return tutors;
      },
      schema: {
        params: {
          type: "object",
          required: [ "cafedraid" ],
          properties: {
            cafedraid: { type: "number" }
          } 
        },
      }
    },
    {
      method: 'GET',
      path: '/getstats',
      handler: async function (request,reply){
        const stats = await db.get_cafedra_stats();
        return stats;
      },
    },
    {
      method: 'GET',
      path: '/getfacultystats',
      handler: async function (request,reply){
        const stats = await db.get_faculty_stats();
        return stats;
      },
    },
    {
      method: 'GET',
      path: '/gettopten',
      handler: async function (request,reply){
        const tutors = await db.get_top_ten_tutors_by_score();
        return tutors;
      },
    },
];