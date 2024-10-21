const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const fs = require('fs').promises;


const successful_photo_deletion = "Фото успешно удалено";
const successful_upload = "Книга успешно добавлена";
const successful_update = "Книга успешно обновлена";
const successful_deletion = "Книга успешно удалена";
const successful_duplication = "Книга успешно дублирована";
const successful_transfer = "Книга успешно выдана пользователю";
const successful_transfer_batch = "Все книги успешно выданы пользователю";
const transfer_resolved = "Книга успешно откреплена от пользователя";
const book_already_on_hand = "Эта книга уже выдана этому пользователю";
const book_already_on_hand_specific = "Книги не выданы! Некоторые книги из корзины уже есть у этого пользователя. Штрихкоды: ";
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