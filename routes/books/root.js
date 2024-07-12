const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const fs = require('fs').promises;


const successful_upload = "Книга успешно добавлена";
const successful_update = "Книга успешно обновлена";
const successful_deletion = "Книга успешно удалена";
const successful_transfer = "Книга успешно выдана студенту";
const transfer_resolved = "Книга успешно откреплена от студента";
const book_already_on_hand = "Эта книга уже выдана этому студенту.";
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
    path: '/allbooks',
    handler: async function (request, reply) {
      const books = await db.get_all_physical_books();
      return books;
    },
  },
  {
    method: 'GET',
    path: '/getbook',
    handler: async function (request, reply) {
      const params = request.query;
      const book = await db.get_physical_book_by_id(params.id);
      console.log(book);
      return book;
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
    path: '/getduebooks',
    handler: async function (request, reply) {
      const duebooks = await db.get_due_books();
      return duebooks;
    },
  },
  {
    method: 'GET',
    path: '/getduebooksforstudent',
    handler: async function (request, reply) {
      const params = request.query;
      const duebooks = await db.get_due_books_for_student(params.user_id);
      return duebooks;
    },
  },
  {
    method: 'GET',
    path: '/getbookcategories',
    handler: async function (request, reply) {
      const duebooks = await db.get_book_categories();
      return duebooks;
    },
  },
  {
    method: 'GET',
    path: '/transferbook',
    handler: async function (request, reply) {
      const params = request.query;
      const iin = params.iin;

      const plt_data = await plt.find_student_by_iin(iin);
      if (!plt_data) return reply.notFound('ИИН не найден в базе студентов');

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
          role: "plt_student",
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
    path: '/resolvebooktransfer',
    handler: async function (request, reply) {
      const params = request.query;
      await db.resolve_book_transfer(params.id);
      return { message: transfer_resolved };
    },
  },
  {
    method: 'GET',
    path: '/addbook',
    handler: async function (request, reply) {
      const params = request.query;
      const book_data = {
        NameRuBook: params.Name,
        Author: params.Author,
        Pages: params.Pages,
        Annotation: params.Annotation,
        Barcode: params.Barcode,
        Subject: params.Subject,
        CopyrightSigns: params.CopyrightSigns,
        Heading: params.Heading,
        ISBN: params.ISBN,
        InventoryNumber: params.InventoryNumber,
        KeyWords: params.KeyWords,
        LLC: params.LLC,
        Language: params.Language,
        Price: params.Price,
        PublishedCountryCity: params.PublishedCountryCity,
        PublishedTime: params.PublishedTime,
        PublishingHouse: params.PublishingHouse,
        RLibraryCategoryRLibraryBook: params.RLibraryCategoryRLibraryBook,
        TypeOfBook: params.TypeOfBook,
        UDC: params.UDC,
        DateCreated: common.human_date(new Date()),
      };
      await db.create_row("librarybooks", book_data);
      return { message: successful_upload };
    },
  },
  {
    method: 'GET',
    path: '/editbook',
    handler: async function (request, reply) {
      const params = request.query;
      await db.edit_library_book(params.id, params.Name, params.Author, params.Pages, params.Annotation, params.Barcode, params.Subject, params.CopyrightSigns, params.Heading, params.ISBN, params.InventoryNumber, params.KeyWords, params.LLC, params.Language, params.Price, params.PublishedCountryCity, params.PublishedTime, params.PublishingHouse, params.RLibraryCategoryRLibraryBook, params.TypeOfBook, params.UDC);
      return { message: successful_update };
    },
  },
];