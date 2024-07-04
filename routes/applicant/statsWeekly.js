require('module-alias/register');
const db = require("@apis/db");
const plt = require("@apis/platonus");
const common = require("@core/common");

const auth_error_msg = "Authorization failed";
const role_not_found_msg = "Insufficient privilege";
const could_not_get_cert_data_msg = "Cert data request is not possible";
const cert_id_not_found_msg = "Could not find certificate with this id";
const cert_user_id_not_found_msg = "Could not find certificates by user id";

module.exports = [
    {
        method: 'GET',
        handler: async function (request, reply) {
            let stats = await plt.form_admission_stats();
            let june7counter = 0;
            let june14counter = 0;
            let june21counter = 0;
            let june28counter = 0;
            let july5counter = 0;
            let july12counter = 0;
            let july19counter = 0;
            let july26counter = 0;
            let august2counter = 0;
            let august9counter = 0;
            let august16counter = 0;
            let august23counter = 0;
            let august30counter = 0;
            for (rs of stats) {
                june7counter += parseInt(rs.june7);
                june14counter += parseInt(rs.june14);
                june21counter += parseInt(rs.june21);
                june28counter += parseInt(rs.june28);
                july5counter += parseInt(rs.july5);
                july12counter += parseInt(rs.july12);
                july19counter += parseInt(rs.july19);
                july26counter += parseInt(rs.july26);
                august2counter += parseInt(rs.august2);
                august9counter += parseInt(rs.august9);
                august16counter += parseInt(rs.august16);
                august23counter += parseInt(rs.august23);
                august30counter += parseInt(rs.august30);
            }
            stats.push({
                StudyFormName: 'Всего',
                june7: june7counter + '',
                june14: june14counter + '',
                june21: june21counter + '',
                june28: june28counter + '',
                july5: july5counter + '',
                july12: july12counter + '',
                july19: july19counter + '',
                july26: july26counter + '',
                august2: august2counter + '',
                august9: august9counter + '',
                august16: august16counter + '',
                august23: august23counter + '',
                august30: august30counter + ''
            });
            return stats;
        },
    },
];

