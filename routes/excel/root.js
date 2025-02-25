const Multer = require('fastify-multer');
const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const fs = require('fs').promises;
const filesystem = require('fs');
const XLSX = require('xlsx');


const storage = Multer.memoryStorage();
const upload = Multer({ storage });

module.exports = [
  {
    method: 'POST',
    url: '/excel/upload',
    preHandler: upload.single('file'),
    handler: async function (req, reply) {
      const payload = req.file;
      console.log(payload);
      if (!payload) {
        reply.code(400).send({ error: 'No file uploaded' });
        return;
      }
      const workbook = XLSX.read(payload.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      jsonData.splice(0, 21);
      let formattedData = [];
      for (let i = 0; i < jsonData.length; i++) {
        if (jsonData[i].length > 6
          && jsonData[i][6] > 0
          && jsonData[i][0].toLowerCase().indexOf('отд.') == -1
          && jsonData[i][0].toLowerCase().indexOf('рус.отд') == -1
          && jsonData[i][0].toLowerCase().indexOf('каз.отд') == -1
          && jsonData[i][0].toLowerCase().indexOf('1 курс') == -1
          && jsonData[i][0].toLowerCase().indexOf('2 курс') == -1
          && jsonData[i][0].toLowerCase().indexOf('3 курс') == -1
          && jsonData[i][0].toLowerCase().indexOf('4 курс') == -1
          && jsonData[i][0].toLowerCase().indexOf('факультет') == -1
          && jsonData[i][0].toLowerCase().indexOf('итого') == -1) {
          let FIOArray = jsonData[i][0].trim().split(' ');
          let iin = await plt.find_student_iin_by_fio(FIOArray[0], FIOArray[1], FIOArray[2])
          let formattedFIO = FIOArray[0] + ' ' + FIOArray[1] + ' ' + FIOArray[2];
          if (FIOArray[2] == undefined || FIOArray[2] == 'undefined') formattedFIO = FIOArray[0] + ' ' + FIOArray[1];
          formattedData.push({
            'FIO': formattedFIO,
            'iin': iin,
            'overall': jsonData[i][4],
            'debt': jsonData[i][6]
          });
        }

      }
      await db.debt_update(formattedData);
      const excel_data = {
        upload_date: common.human_date(new Date()),
      };
      await db.create_row("excel_data", excel_data);
      reply.send(formattedData);
    },
  },
  {
    method: 'POST',
    url: '/excel/upload/attendance/students',
    preHandler: upload.single('file'),
    handler: async function (req, reply) {
      const payload = req.file;
      console.log(payload);
      if (!payload) {
        reply.code(400).send({ error: 'No file uploaded' });
        return;
      }
      const workbook = XLSX.read(payload.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      jsonData.splice(0, 8);
      let formattedData = [];
      for (let i = 0; i < jsonData.length; i++) {
        formattedData.push({
          'firstname': jsonData[i][0],
          'lastname': jsonData[i][1],
          'iin': jsonData[i][2],
          'department': jsonData[i][3].substring(jsonData[i][3].lastIndexOf(">") + 1).trim(),
          'date': jsonData[i][5],
          'checkin': jsonData[i][12],
          'checkout': jsonData[i][13]
        });
      }
      await db.attendance_update(formattedData, 'student_attendance');
      await db.delete_student_attendance_duplicates();
      reply.send('data inserted');
    },
  },
  {
    method: 'POST',
    url: '/excel/upload/attendance/employees',
    preHandler: upload.single('file'),
    handler: async function (req, reply) {
      const payload = req.file;
      console.log(payload);
      if (!payload) {
        reply.code(400).send({ error: 'No file uploaded' });
        return;
      }
      const workbook = XLSX.read(payload.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      jsonData.splice(0, 8);
      let formattedData = [];
      for (let i = 0; i < jsonData.length; i++) {
        formattedData.push({
          'firstname': jsonData[i][0],
          'lastname': jsonData[i][1],
          'iin': jsonData[i][2],
          'department': jsonData[i][3].indexOf('>') > -1 ? jsonData[i][3].substring(jsonData[i][3].lastIndexOf(">") + 1).trim() : jsonData[i][3],
          'date': jsonData[i][5],
          'checkin': jsonData[i][12],
          'checkout': jsonData[i][13]
        });
      }
      await db.attendance_update(formattedData, 'employee_attendance');
      await db.delete_employee_attendance_duplicates();
      reply.send('data inserted');
    },
  },
  {
    method: 'GET',
    path: '/getdebtdata/:user_id',
    handler: async function (request, reply) {
      const iin = await db.get_iin_by_user_id(request.params.user_id);
      try {
        const debtdata = await plt.get_debt_data_by_iin(iin.iin);
        // оплата теперь берется из платонуса, поэтому комменчу следующую строчку
        // const debtdata = await db.get_debt_data_by_iin(iin.iin);
        return debtdata;
      }
      catch {
        return [];
      }
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
    path: '/getdocdate',
    handler: async function (request, reply) {
      const docdate = await db.get_excel_doc_date();
      return reply.send(docdate);
    },
  },

];