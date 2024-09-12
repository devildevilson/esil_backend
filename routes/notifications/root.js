const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const fs = require('fs').promises;


const successful_upload = "Книга успешно добавлена";
const successful_update = "Книга успешно обновлена";
const successful_deletion = "Книга успешно удалена";
const successful_transfer = "Книга успешно выдана пользователю";
const successful_transfer_batch = "Все книги успешно выданы пользователю";
const transfer_resolved = "Книга успешно откреплена от пользователя";
const book_already_on_hand = "Эта книга уже выдана этому пользователю";
const book_already_on_hand_specific = "Книги не выданы! Некоторые книги из корзины уже есть у этого пользователя. Штрихкоды: ";
const book_upload_error = "Внутренняя ошибка загрузки новой книги";
const book_deletion_error = "Внутренняя ошибка удаления книги";
const book_assignment_error = "Внутренняя ошибка создания прикрепления";
const book_assignment_removal_error = "Внутренняя ошибка удаления прикрепления";


module.exports = [
  {
    method: 'GET',
    path: '/geticondata',
    handler: async function (request, reply) {
      const params = request.query;
      const data = await db.get_notification_icon_data(params.user_id);
      return data;
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
    path: '/deletebook',
    handler: async function (request, reply) {
      const params = request.query;
      await db.delete_library_book(params.id);
      return { message: successful_deletion };
    },
  },
  {
    method: 'GET',
    path: '/getuserdata',
    handler: async function (request, reply) {
      const params = request.query;
      const iin = params.iin;
      let role = 'student';
      let plt_data = await plt.find_student_by_iin(iin);
      if (!plt_data) {
        plt_data = await plt.find_tutor_by_iin(iin);
        role = 'tutor';
        if (!plt_data) return reply.notFound('ИИН не найден в базе студентов и преподавателей.');
      }
      let userdata;
      switch(role){
        case 'student':
          userdata = await plt.get_student_data_for_library(iin); break;
        case 'tutor':
          userdata = await plt.get_tutor_data_for_library(iin); break;
      }
      return userdata;
    },
  },
  {
    method: 'GET',
    path: '/transferbook',
    handler: async function (request, reply) {
      const params = request.query;
      const iin = params.iin;
      let role = 'student';
      let plt_data = await plt.find_student_by_iin(iin);
      if (!plt_data) {
        plt_data = await plt.find_tutor_by_iin(iin);
        role = 'tutor';
        if (!plt_data) return reply.notFound('ИИН не найден в базе студентов и преподавателей.');
      }
      
      const user = await db.get_user_id_by_iin(iin);
      if (!user) {
        const password_hash = await common.hash_password(iin);
        const db_user_data = {
          name: plt_data.name,
          lastname: plt_data.lastname,
          middlename: plt_data.middlename,
          username: iin,
          iin: iin,
          password: password_hash,
        };
        const user_id = await db.create_row("users", db_user_data);
        const role_data = {
          user_id,
          role: `plt_${role}`,
          assotiated_id: plt_data.plt_id
        };
        await db.create_row("roles", role_data);
      }
      const userid = await db.get_user_id_by_iin(iin);
      const eligibility = await db.check_book_transfer_eligibility(userid.id, params.bookid);
      if(parseInt(eligibility[0].sum)>0) return { message: book_already_on_hand }; 
      const transfer_data = {
        userid: userid.id,
        bookid: params.bookid,
        DateCreated: common.human_date(new Date()),
      };
      await db.create_row("booktransfer", transfer_data);
      return { message: successful_transfer };
    },
  },
  {
    method: 'GET',
    path: '/transferbookbatch',
    handler: async function (request, reply) {
      const params = request.query;
      const iin = params.iin;
      let role = 'student';
      let plt_data = await plt.find_student_by_iin(iin);
      if (!plt_data) {
        plt_data = await plt.find_tutor_by_iin(iin);
        role = 'tutor';
        if (!plt_data) return reply.notFound('ИИН не найден в базе студентов и преподавателей.');
      }
      
      const user = await db.get_user_id_by_iin(iin);
      if (!user) {
        const password_hash = await common.hash_password(iin);
        const db_user_data = {
          name: plt_data.name,
          lastname: plt_data.lastname,
          middlename: plt_data.middlename,
          username: iin,
          iin: iin,
          password: password_hash,
        };
        const user_id = await db.create_row("users", db_user_data);
        const role_data = {
          user_id,
          role: `plt_${role}`,
          assotiated_id: plt_data.plt_id
        };
        await db.create_row("roles", role_data);
      }
      const userid = await db.get_user_id_by_iin(iin);
      // bookidsJSON
      let books = JSON.parse(params.bookidsJSON);
      let givenbooks=[];
      for(book of books){
        const eligibility = await db.check_book_transfer_eligibility(userid.id, book.id);
        if(parseInt(eligibility[0].sum)>0) givenbooks.push(book.barcode);
      }
      if(givenbooks.length>0){
        return { message: `${book_already_on_hand_specific} ${givenbooks.toString()}` }; 
      }
      for(book of books){
        const transfer_data = {
          userid: userid.id,
          bookid: book.id,
          DateCreated: common.human_date(new Date()),
        };
        await db.create_row("booktransfer", transfer_data);
      }
      return { message: successful_transfer_batch };
    },
  },
];