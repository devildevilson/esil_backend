const Multer = require('fastify-multer');
const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const fs = require('fs').promises;
const filesystem = require('fs');
const path = require('path');
const fastifyStatic = require('fastify-static');

const FILE_PATH = process.env.ROOT_PATH;
const BONUS_FILE_PATH = process.env.ROOT_BONUSSYSTEM_PATH;
const PHOTO_FILE_PATH = process.env.ROOT_PHOTO_PATH;
const PDF_FILE_PATH = process.env.ROOT_PDF_PATH;

const kpi_internal_error = "Internal KPI counter error";
const file_id_not_found_msg = "Could not find file with this id";
const file_user_id_not_found_msg = "Could not find files by user id";
const cant_upload_unique_activity = "Этот показатель уже загружен";
const cant_upload_photo_exists = "Фото уже существует";
const cant_upload_photo = "Невозможно загрузить фото";
const cant_upload_pdf = "Ошибка загрузки";
const successful_upload = "Файл был загружен";
const successful_photo_upload = "Фото было загружено";
const successful_pdf_upload = "Книга успешно загружена";
const request_already_exists = "Для этого студента уже есть заявка";
const user_not_found = "Пользователь не найден";
const success = "Успешно";

function sanitizeFilename(filename) {
  return filename.replace(/[\\\/:*?"<>|\s]/g, '_');
}

var storage = Multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, FILE_PATH)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  },
});

var storageBonus = Multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, BONUS_FILE_PATH)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + sanitizeFilename(file.originalname));
  },
});

var storagePhoto = Multer.diskStorage({
  destination: async function (req, file, cb) {
    cb(null, PHOTO_FILE_PATH)
  },
  filename: async function (req, file, cb) {
    const userid = file.originalname.split('.')[0];
    const user = await db.find_user_by_id(userid);
    cb(null, `${user.lastname.trim()}+${user.name.trim()}_${user.iin}.png`);
  },
});

var storagePDF = Multer.diskStorage({
  destination: async function (req, file, cb) {
    cb(null, PDF_FILE_PATH)
  },
  filename: async function (req, file, cb) {
    const redactedFilename = sanitizeFilename(file.originalname.split('.')[0]);
    cb(null, `${redactedFilename}${Date.now()}.pdf`);
  },
});

var upload = Multer({
  storage: storage,
  limits: { fileSize: 20000000 }
});

var uploadBonus = Multer({
  storage: storageBonus,
  limits: { fileSize: 20000000 }
});

var uploadPhoto = Multer({
  storage: storagePhoto,
  fileFilter: function (req, file, callback) {
    let ext = file.originalname.split('.')[file.originalname.split('.').length - 1];
    if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg') {
      return callback(new Error('Допущены только фотографии'));
    }
    callback(null, true)
  },
  limits: { fileSize: 1000000 }
});

var uploadPDF = Multer({
  storage: storagePDF,
  fileFilter: function (req, file, callback) {
    let ext = file.originalname.split('.')[file.originalname.split('.').length - 1];
    if (ext !== 'PDF' && ext !== 'pdf') {
      return callback(new Error('Допущены только PDF'));
    }
    callback(null, true)
  },
  limits: { fileSize: 300000000 } //300 mb
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
async function deleteBonusFile(filename) {
  if (filename != '') {
    try {
      await fs.unlink(BONUS_FILE_PATH + filename);
      console.log(`File ${filename} has been deleted.`);
    } catch (err) {
      console.log(err);
    }
  }
  else {
    return 'failed';
  }
}
async function deletePDF(filename) {
  if (filename != '') {
    try {
      await fs.unlink(PDF_FILE_PATH + filename);
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
      if (canupload) {
        const file_data = {
          userid: req.body.user_id,
          activityid: req.body.activity_id,
          extradata1: req.body.info,
          file_path: FILE_PATH + cleared_filename,
          filename: cleared_filename,
          upload_date: common.human_date(new Date()),
        };
        const file = await db.create_row("files", file_data);
        //await res.code(200).send('processed');
        const update = await db.update_kpi_for_user(req.body.user_id);
        return { message: successful_upload };
      }
      else {
        const file_storage = await deleteFile(cleared_filename);
        //await reply.setHeader('message',cant_upload_unique_activity);
        return { message: cant_upload_unique_activity };
      }
    },
  },
  {
    method: 'POST',
    url: '/bonusfile',
    preHandler: uploadBonus.single('file'),
    handler: async function (req, reply) {
      const payload = req.file;
      //console.log(payload);
      let cleared_filename = payload.filename;
      const for_userid = req.body.for_user_id;
      const by_userid = req.body.by_user_id;
      const filetype = req.body.filetype;
      cleared_filename = cleared_filename.replace(/\s+/g, '-');
      const file_data = {
        filename: cleared_filename,
        filepath: BONUS_FILE_PATH + cleared_filename, 
        upload_date: common.human_date(new Date()),
        uploaded_by: by_userid,
      };
      console.log(file_data);
      await db.create_row("bonussystem_files", file_data);
      const fileid = await db.get_fileid_by_filename(cleared_filename);
      await db.update_bonussystem_data(for_userid, filetype, fileid*-1);
      return { message: successful_upload };
    },
  },
  {
    method: 'GET',
    path: '/bonusfileproforientation',
    handler: async function (request, reply) {
      const params = request.query;
      const for_userid = params.for_userid;
      const proforientation = params.student_count;
      await db.update_bonussystem_prof_data(for_userid,proforientation);
      return { message: 'Данные обновлены' };
    },
  },
  // {
  //   method: 'POST',
  //   url: '/bonusfileproforientation',
  //   preHandler: uploadBonus.single('file'),
  //   handler: async function (req, reply) {
  //     const payload = req.file;
  //     //console.log(payload);
  //     let cleared_filename = payload.filename;
  //     const for_userid = req.body.for_user_id;
  //     const by_userid = req.body.by_user_id;
  //     const filetype = req.body.filetype;
  //     const proforientation = req.body.student_count;
  //     cleared_filename = cleared_filename.replace(/\s+/g, '-');
  //     const file_data = {
  //       filename: cleared_filename,
  //       filepath: BONUS_FILE_PATH + cleared_filename, 
  //       upload_date: common.human_date(new Date()),
  //       uploaded_by: by_userid,
  //     };
  //     console.log(file_data);
  //     await db.create_row("bonussystem_files", file_data);
  //     const fileid = await db.get_fileid_by_filename(cleared_filename);
  //     await db.update_bonussystem_prof_data(for_userid, filetype, fileid, proforientation);
  //     return { message: successful_upload };
  //   },
  // },
  {
    method: 'POST',
    url: '/upload/pdf',
    preHandler: uploadPDF.single('file'),
    handler: async function (req, reply) {
      //req.body.user_id
      const payload = req.body;
      let filename = req.file.filename;
      try {
        const ebook_data = {
          NameRuBook: payload.Name,
          Author: payload.Author,
          Pages: payload.Pages,
          EBookPath: `/CSP/euniversity/img/eLibraryBooks/${filename}`,
          ISBN: payload.ISBN,
          LLC: payload.LLC,
          Language: payload.Language,
          PublishedCountryCity: payload.PublishedCountryCity,
          PublishedTime: payload.PublishedTime,
          PublishingHouse: payload.PublishingHouse,
          RLibraryCategoryRLibraryBook: payload.RLibraryCategoryRLibraryBook,
          UDC: payload.UDC,
          DateCreated: common.human_date(new Date()),
        };
        await db.create_row("ebooks", ebook_data);
        //await res.code(200).send('processed');
        return { message: successful_pdf_upload };
      }
      catch {
        await deletePDF(filename);
        return { message: cant_upload_pdf };
      }
    },
  },
  {
    method: 'POST',
    url: '/upload/photo',
    preHandler: uploadPhoto.single('file'),
    handler: async function (req, reply) {
      const user = await db.find_user_by_id(req.body.user_id);
      let canupload = await db.check_photo_upload_eligibility(user.iin);
      const filename = req.file.filename;
      console.log(canupload);
      if (!canupload) {
        //await deletePhoto(filename);
        return { message: cant_upload_photo_exists }
      };
      const photo_data = {
        iin: user.iin,
        photo_path: PHOTO_FILE_PATH + filename,
        photo_filename: filename,
        DateCreated: common.human_date(new Date()),
      };
      await db.create_row("photos", photo_data);
      return { message: successful_photo_upload };
    },
    schema: {
      consumes: ["multipart/form-data"]
    }
  },
  {
    method: 'GET',
    path: '/denytutorcategory',
    handler: async function (request, reply) {
      const params = request.query;
      const denied_by = params.denied_by;
      const denied_for = params.denied_for;
      const category = params.category;
      const filename = await db.get_bonus_filename_by_category(denied_for, category);
      await db.deny_if_category_unconfirmed(denied_for, category);
      await db.delete_bonus_file_from_db_by_filename(filename);
      await deleteBonusFile(filename);
      const notification_data = {
        sender_id: denied_by,
        receiver_id: denied_for,
        message: 'Ваш файл был отклонён и удалён заведующим кафедры.',
        notificationtype_id: 8,
        date_sent: common.human_date(new Date())
      };
      await db.create_row("notifications", notification_data);
      return { message: `Denied category ${category} for userid ${denied_for} by ${denied_by}` };
    },
  },
  {
    method: 'GET',
    path: '/checkphotoeligibility/:user_id',
    handler: async function (request, reply) {
      let user = await db.find_user_by_id(request.params.user_id)
      const data = await db.check_photo_upload_eligibility(user.iin);
      if (data) return 'true';
      return 'false';
    },
    schema: {
      params: {
        type: "object",
        required: ["user_id"],
        properties: {
          user_id: { type: "number" }
        }
      },
    }
  },
  {
    method: 'GET',
    path: '/getalldormrequests',
    handler: async function (request, reply) {
      const request_data = await db.get_all_dorm_requests();
      if (request_data.length == 0) return [];
      const str_arr = request_data.map(elem => elem.iin).join(",");
      const users = await plt.get_student_data_by_iin_arr(str_arr);

      for (let i = 0; i < users.length; i++) {
        const dormreq = await db.get_dorm_request_by_iin(users[i].iin);
        if (dormreq != undefined) {
          Object.assign(users[i], {
            approved: dormreq.approved,
            datecreated: dormreq.datecreated,
            datemodified: dormreq.datemodified,
            roomnumber: dormreq.roomnumber,
            notification_message: dormreq.notification_message,
            ishostel: dormreq.ishostel,
            iin: dormreq.iin,
            req_id: dormreq.id
          });
        }
      }
      users.sort((a, b) => a.datecreated - b.datecreated)
      return users;
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
        required: ["user_id"],
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
      const file_datas = await db.get_kpiscore_by_userid(request.params.user_id);
      return file_datas;
    },
    schema: {
      params: {
        type: "object",
        required: ["user_id"],
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
        required: ["user_id"],
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
        required: ["user_id"],
        properties: {
          user_id: { type: "number" }
        }
      },
    }
  },
  {
    method: 'GET',
    path: '/getdormrequest/:user_id',
    handler: async function (request, reply) {
      const user_id = request.params.user_id;
      const iin = await db.get_iin_by_user_id(user_id);
      let requests_data = [];
      const res = await db.get_dorm_request_by_iin(iin.iin);
      if (res != null) {
        requests_data.push(res);
      }
      return requests_data;
    },
    schema: {
      params: {
        type: "object",
        required: ["user_id"],
        properties: {
          user_id: { type: "number" }
        }
      },
    }
  },
  {
    method: 'GET',
    path: '/createdormrequest/:user_id',
    handler: async function (request, reply) {
      const user_id = request.params.user_id;
      const iin = await db.get_iin_by_user_id(user_id);
      console.log(iin.iin);
      const requestQuery = await db.get_dorm_request_by_iin(iin.iin);
      if (requestQuery) return { message: request_already_exists };

      const plt_data_student = await plt.find_student_by_iin(iin.iin);
      const plt_data_applicant = await plt.find_applicant_by_iin(iin.iin);
      if (!plt_data_student && !plt_data_applicant) return { message: user_not_found };

      const db_dormrequest_data = {
        iin: iin.iin,
        datecreated: common.human_date(new Date()),
      };

      await db.create_row("dormrequests", db_dormrequest_data);

      return { message: success };
    },
    schema: {
      params: {
        type: "object",
        required: ["user_id"],
        properties: {
          user_id: { type: "number" }
        }
      },
    }
  },
  {
    method: 'GET',
    path: '/approvedormrequest',
    handler: async function (request, reply) {
      const iin = request.query.iin;
      const dormtype = request.query.dormType;
      const message = request.query.dormMessage;
      const roomnumber = request.query.dormRoomNumber;
      const requestQuery = await db.get_dorm_request_by_iin(iin);
      let messageEdited = 'Заявка принята.';
      if (message != '') messageEdited = `Заявка принята. Сообщение: ${message}`;
      if (requestQuery) {
        await db.approve_dorm_request_by_iin(iin, dormtype, message, roomnumber, common.human_date(new Date()));
        const userid = await db.get_user_id_by_iin(iin);
        if (userid) {
          const db_notification_data = {
            receiver_id: userid.id,
            message: messageEdited,
            notificationtype_id: 4,
            date_sent: common.human_date(new Date()),
          };
          await db.create_row("notifications", db_notification_data);
        }
        return { message: success };
      }
      else {
        return { message: 'Не найдена заявка' };
      }

    },
    schema: {
      querystring: {
        type: "object",
        required: ["iin", "dormType", "dormMessage", "dormRoomNumber"],
        properties: {
          iin: { type: "string" },
          dormtype: { type: "string" },
          message: { type: "string" },
          roomnumber: { type: "string" },
        }
      },

    }
  },
  {
    method: 'GET',
    path: '/denydormrequest',
    handler: async function (request, reply) {
      const iin = request.query.iin;
      const message = request.query.dormMessage;
      const requestQuery = await db.get_dorm_request_by_iin(iin);
      let messageEdited = 'Заявка отклонена.';
      if (message != '') messageEdited = `Заявка отклонена по причине: "${message}"`;
      if (requestQuery) {
        await db.deny_dorm_request_by_iin(iin, message, common.human_date(new Date()));
        const userid = await db.get_user_id_by_iin(iin);
        if (!userid) {
          const db_notification_data = {
            receiver_id: userid.id,
            message: messageEdited,
            notificationtype_id: 4,
            date_sent: common.human_date(new Date()),
          };
          await db.create_row("notifications", db_notification_data);
        }
        return { message: success };
      }
      else {
        return { message: 'Не найдена заявка' };
      }

    },
    schema: {
      querystring: {
        type: "object",
        required: ["iin", "dormMessage"],
        properties: {
          iin: { type: "string" },
          message: { type: "string" },
        }
      },

    }
  },
  {
    method: 'GET',
    path: '/deletedormrequest/:userid',
    handler: async function (request, reply) {
      const userid = request.params.userid;
      const iin = await db.get_iin_by_user_id(userid);

      const requestQuery = await db.get_dorm_request_by_iin(iin.iin);
      if (requestQuery) {
        await db.delete_dorm_request_by_iin(iin.iin);
        return { message: success };
      }
      else {
        return { message: 'Не найдена заявка' };
      }
    },
    schema: {
      params: {
        type: "object",
        required: ["userid"],
        properties: {
          userid: { type: "number" }
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
        required: ["user_id"],
        properties: {
          user_id: { type: "number" }
        }
      },
    }
  },
  {
    method: 'GET',
    path: '/download/:fileid',
    handler: async function (request, reply) {
      const filename = await db.get_filename(request.params.fileid);
      if (filename) {
        if (!filesystem.existsSync(FILE_PATH + filename)) {
          reply.code(404).send({ error: 'File not found' });
          return;
        }
        const filename_parts = filename.split('.')
        let type;
        switch (filename_parts[filename_parts.length - 1]) {
          case '.jpg': type = 'image/jpeg'; break;
          case '.jpeg': type = 'image/jpeg'; break;
          case '.pdf': type = 'application.pdf'; break;
          case '.doc': type = 'application/msword'; break;
          case '.docx': type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; break;
          default: type = 'none'; break;
        }
        const stream = filesystem.createReadStream(path.resolve(FILE_PATH + filename));
        reply.send(stream).type(type);
        return reply;
      }
      else {
        return 'file not found';
      }
    },
    schema: {
      params: {
        type: "object",
        required: ["fileid"],
        properties: {
          filename: { type: "number" }
        }
      },
    }
  },
  {
    method: 'GET',
    path: '/downloadbonusfile/:fileid',
    handler: async function (request, reply) {
      const filename = await db.get_filename_bonus(request.params.fileid);
      if (filename) {
        if (!filesystem.existsSync(BONUS_FILE_PATH + filename)) {
          reply.code(404).send({ error: 'File not found' });
          return;
        }
        const filename_parts = filename.split('.')
        let type;
        switch (filename_parts[filename_parts.length - 1]) {
          case '.jpg': type = 'image/jpeg'; break;
          case '.png': type = 'image/png'; break;
          case '.jpeg': type = 'image/jpeg'; break;
          case '.pdf': type = 'application.pdf'; break;
          case '.doc': type = 'application/msword'; break;
          case '.docx': type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; break;
          default: type = 'none'; break;
        }
        const stream = filesystem.createReadStream(path.resolve(BONUS_FILE_PATH + filename));
        reply.send(stream).type(type);
        return reply;
      }
      else {
        return 'file not found';
      }
    },
    schema: {
      params: {
        type: "object",
        required: ["fileid"],
        properties: {
          filename: { type: "number" }
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
      try {
        const file_storage = await deleteFile(request.body.filename);
        const file_db = await db.delete_file_by_filename(request.body.filename);
        const update = await db.update_kpi_for_user(request.body.user_id);
      }
      catch (err) {
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
      try {
        const update = await db.delete_user_by_iin(request.params.iin);
        return update;
      }
      catch (err) {
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
        required: ["categoryid"],
        properties: {
          categoryid: { type: "number" }
        }
      },
    }
  },
  {
    method: 'GET',
    path: '/gettutors/:cafedraid',
    handler: async function (request, reply) {
      const tutors = await db.get_tutors_by_cafedra_id(request.params.cafedraid);
      return tutors;
    },
    schema: {
      params: {
        type: "object",
        required: ["cafedraid"],
        properties: {
          cafedraid: { type: "number" }
        }
      },
    }
  },
  {
    method: 'GET',
    path: '/getstats',
    handler: async function (request, reply) {
      const stats = await db.get_cafedra_stats();
      return stats;
    },
  },
  {
    method: 'GET',
    path: '/getfacultystats',
    handler: async function (request, reply) {
      const stats = await db.get_faculty_stats();
      return stats;
    },
  },
  {
    method: 'GET',
    path: '/gettopten/:toptentype',
    handler: async function (request, reply) {
      let tutors;
      if (request.params.toptentype == 6) {
        tutors = await db.get_top_ten_tutors_overall_by_score();
      }
      else {
        tutors = await db.get_top_ten_tutors_by_score(request.params.toptentype);
      }
      return tutors;
    },
    schema: {
      params: {
        type: "object",
        required: ["toptentype"],
        properties: {
          cafedraid: { type: "number" }
        }
      },
    }
  },
];