const common = require('@core/common');
const db = require('@apis/db');
const plt = require('@apis/platonus');
const fs = require('fs').promises;


const successful_upload = "Книга успешно добавлена";
const successful_update = "Книга успешно обновлена";
const successful_deletion = "Книга успешно удалена";
const successful_transfer = "Книга успешно выдана пользователю";
const transfer_resolved = "Книга успешно откреплена от пользователя";
const book_already_on_hand = "Эта книга уже выдана этому пользователю";
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
    path: '/booksperpage',
    handler: async function (request, reply) {
      const params = request.query;
      const books = await db.get_physical_books_per_page(params.page);
      return books;
    },
  },
  {
    method: 'GET',
    path: '/getbook',
    handler: async function (request, reply) {
      const params = request.query;
      const book = await db.get_physical_book_by_id(params.id);
      //console.log(book);
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
    path: '/getphysicalbookpagecount',
    handler: async function (request, reply) {
      const res = await db.get_physical_book_page_count();
      return res;
    },
  },
  {
    method: 'GET',
    path: '/getbooksbyname',
    handler: async function (request, reply) {
      const params = request.query;
      const res = await db.get_physical_books_by_name(params.name);
      return res;
    },
  },  
  {
    method: 'GET',
    path: '/getbooksbyisbn',
    handler: async function (request, reply) {
      const params = request.query;
      const res = await db.get_physical_books_by_isbn(params.ISBN);
      return res;
    },
  }, 
  {
    method: 'GET',
    path: '/getbooksbykeywords',
    handler: async function (request, reply) {
      const params = request.query;
      const res = await db.get_physical_books_by_keywords(params.keywords);
      return res;
    },
  }, 
  {
    method: 'GET',
    path: '/getbooksbyinventory',
    handler: async function (request, reply) {
      const params = request.query;
      const res = await db.get_physical_books_by_inventory(params.inventory);
      return res;
    },
  }, 
  {
    method: 'GET',
    path: '/getbooksbybarcode',
    handler: async function (request, reply) {
      const params = request.query;
      const res = await db.get_physical_books_by_barcode(params.barcode);
      return res;
    },
  }, 
  {
    method: 'GET',
    path: '/getduebooksforuser',
    handler: async function (request, reply) {
      const params = request.query;
      const duebooks = await db.get_due_books_for_user(params.user_id);
      return duebooks;
    },
  },
  {
    method: 'GET',
    path: '/getbookcategories',
    handler: async function (request, reply) {
      const categories = await db.get_book_categories();
      return categories;
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
      return { message: `Книга ${params.Name} успешно загружена` };
    },
  },
  {
    method: 'GET',
    path: '/editbook',
    handler: async function (request, reply) {
      const params = request.query;
      await db.edit_library_book(params.id, params.Name, params.Author, params.Pages, params.Annotation, params.Barcode, params.Heading, params.ISBN, params.InventoryNumber, params.KeyWords, params.LLC, params.Language, params.Price, params.PublishedCountryCity, params.PublishedTime, params.PublishingHouse, params.RLibraryCategoryRLibraryBook, params.TypeOfBook, params.UDC);
      return { message: successful_update };
    },
  },
];