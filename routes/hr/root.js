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


module.exports = [
  {
    method: 'GET',
    path: '/employeelist',
    handler: async function (request, reply) {
      const employees = await plt.get_employees_for_hr();
      return employees;
    },
  },
];