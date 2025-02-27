const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const fs = require('fs').promises;


const successful_photo_deletion = "Фото успешно удалено";
const user_already_exists = "Пользователь уже существует";
const user_created = "Пользователь успешно добавлен";

module.exports = [
  {
    method: 'GET',
    path: '/findphotodata',
    handler: async function (request, reply) {
      const params = request.query;
      const iin = params.iin;
      const photodata = await db.find_photo_data_for_admin(iin);
      return photodata;
    },
  },
  {
    method: 'GET',
    path: '/addnewuser',
    handler: async function (request, reply) {
      const params = request.query;
      const iin = params.iin;
      const lastname = params.lastname;
      const firstname = params.firstname;
      const patronymic = params.patronymic;
      const role = params.role;
      const user = await db.get_user_id_by_iin(iin);
      if (user) return { message: user_already_exists };
      try {
        const password_hash = await common.hash_password(iin);
        const db_user_data = {
          name: firstname,
          lastname: lastname,
          middlename: patronymic,
          username: iin,
          iin: iin,
          password: password_hash,
        };
        await db.create_row("users", db_user_data);
        const userid = await db.get_user_id_by_iin(iin);
        const db_role_data = {
          user_id: userid.id,
          role: role,
        };
        await db.create_row("roles", db_role_data);
        return { message: user_created };
      }
      catch {
        return { message: "Something went wrong. Suggesting to check the tables to revert changes" };
      }
    },
  },
  {
    method: 'GET',
    path: '/deletephotobyid',
    handler: async function (request, reply) {
      const params = request.query;
      const id = params.id;
      await db.delete_photo_by_id(id);
      return { message: successful_photo_deletion };
    },
  },
  {
    method: 'GET',
    path: '/ebooksperpage',
    handler: async function (request, reply) {
      const params = request.query;
      const books = await db.get_e_books_per_page(params.page);
      return books;
    },
  },
  {
    method: 'GET',
    path: '/booksperpage',
    handler: async function (request, reply) {
      const params = request.query;
      const books = await db.get_physical_books_per_page(params.page);
      return books;
    },
  },
];