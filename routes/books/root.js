const common = require('@core/common');
const db = require('@apis/db');
const fs = require('fs').promises;


const successful_upload = "Книга успешно добавлена";
const successful_deletion = "Книга успешно удалена";
const successful_transfer = "Книга успешно выдана студенту";
const transfer_resolved = "Книга успешно откреплена от студента";
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
        return {message: successful_deletion};
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
      path: '/getbookcategories', 
      handler: async function (request, reply) {
        const duebooks = await db.get_book_categories();
        return duebooks;
      },
    },
    {
      method: 'GET',
      path: '/addbooktransfer', 
      handler: async function (request, reply) {
        const params = request.query;
        const transfer_data = {
          userid: params.userid,
          bookid: params.bookid, 
          DateCreated: common.human_date(new Date()),
        };
        await db.create_row("booktransfer", transfer_data);
        return {message: successful_transfer};
      },
    },
    {
      method: 'GET',
      path: '/resolvebooktransfer', 
      handler: async function (request, reply) {
        const params = request.query;
        await db.resolve_book_transfer(params.id);
        return {message: transfer_resolved};
      },
    },
    {
      method: 'GET',
      path: '/addbook', 
      handler: async function (request, reply) {
        const params = request.query;
        console.log(params);
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
        return {message: successful_upload};
      },
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