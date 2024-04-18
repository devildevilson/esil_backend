require('module-alias/register');
const db = require("@apis/db");
const plt = require("@apis/platonus");
const common = require("@core/common");

const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const could_not_get_cert_data_msg = "Cert data request is not possible";
const cert_id_not_found_msg = "Could not find certificate with this id";
const cert_user_id_not_found_msg = "Could not find certificates by user id";

const role_id = "plt_applicant";

module.exports = [
    {
        method: 'GET',
        handler: async function (request, reply) {
            const token_data = await common.decode_token(request.query.token);
            if (token_data.error) return reply.forbidden(token_data.error);

            const adm_role = await db.find_user_role(token_data.id, "admissionstats");
            if (!adm_role) return reply.forbidden(role_not_found_msg);

            const role_arr = await db.get_assotiated_id_arr_by_role("plt_applicant");
            const str_arr = role_arr.map(elem => elem.assotiated_id).join(",");
            const users = await plt.get_student_data_by_id_arr(str_arr);

            const specializationsObj = await plt.get_relevant_specializations(str_arr);
            const studyformsObj = await plt.get_relevant_studyforms(str_arr);

            let users_table = {};
            users.forEach(elem => { users_table[elem.plt_id] = elem; });
            role_arr.forEach(elem => { users_table[elem.assotiated_id].id = elem.user_id; });

            let specializationsArr = [], studyformsArr = [];

            for (let i = 0; i < specializationsObj.length; i++) {
                specializationsArr.push(specializationsObj[i].specialization);
            }
            for (let i = 0; i < studyformsObj.length; i++) {
                studyformsArr.push(studyformsObj[i].study_form);
            }

            let statistics = [];
            for (let i = 0; i < specializationsArr.length; i++) {
                for (let j = 0; j < studyformsArr.length; j++) {
                    let [{ counter }] = await plt.get_count(str_arr, specializationsArr[i], studyformsArr[j]);
                    if (counter == 0) continue;
                    statistics.push({ "specialization": specializationsArr[i], "study_form": studyformsArr[j], "count": counter });
                }
            }
            return (statistics);

        },
        schema: {
            querystring: {
                type: "object",
                required: ["token"],
                properties: {
                    token: { type: "string" }
                }
            }
        }
    },
];

