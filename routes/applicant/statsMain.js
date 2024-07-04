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
            let stats = await plt.form_admission_stats_main();
            let sf1_sl1count = 0;
            let sf1_sl2count = 0;
            let sf3_sl1count = 0;
            let sf3_sl2count = 0;
            let sf4_sl1count = 0;
            let sf4_sl2count = 0;
            let sf5_sl1count = 0;
            let sf5_sl2count = 0;
            let sf8_sl1count = 0;
            let sf8_sl2count = 0;
            let sf15_sl1count = 0;
            let sf15_sl2count = 0;
            let sf17_sl1count = 0;
            let sf17_sl2count = 0;
            let sf21_sl1count = 0;
            let sf21_sl2count = 0;
            let sf23_sl1count = 0;
            let sf23_sl2count = 0;
            let sf24_sl1count = 0;
            let sf24_sl2count = 0;
            let sf29_sl1count = 0;
            let sf29_sl2count = 0;
            let sf30_sl1count = 0;
            let sf30_sl2count = 0;
            let sf31_sl1count = 0;
            let sf31_sl2count = 0;
            for (res of stats) {
                sf1_sl1count += parseInt(res.sf1_sl1);
                sf1_sl2count += parseInt(res.sf1_sl2);
                sf3_sl1count += parseInt(res.sf3_sl1);
                sf3_sl2count += parseInt(res.sf3_sl2);
                sf4_sl1count += parseInt(res.sf4_sl1);
                sf4_sl2count += parseInt(res.sf4_sl2);
                sf5_sl1count += parseInt(res.sf5_sl1);
                sf5_sl2count += parseInt(res.sf5_sl2);
                sf8_sl1count += parseInt(res.sf8_sl1);
                sf8_sl2count += parseInt(res.sf8_sl2);
                sf15_sl1count += parseInt(res.sf15_sl1);
                sf15_sl2count += parseInt(res.sf15_sl2);
                sf17_sl1count += parseInt(res.sf17_sl1);
                sf17_sl2count += parseInt(res.sf17_sl2);
                sf21_sl1count += parseInt(res.sf21_sl1);
                sf21_sl2count += parseInt(res.sf21_sl2);
                sf23_sl1count += parseInt(res.sf23_sl1);
                sf23_sl2count += parseInt(res.sf23_sl2);
                sf24_sl1count += parseInt(res.sf24_sl1);
                sf24_sl2count += parseInt(res.sf24_sl2);
                sf29_sl1count += parseInt(res.sf29_sl1);
                sf29_sl2count += parseInt(res.sf29_sl2);
                sf30_sl1count += parseInt(res.sf30_sl1);
                sf30_sl2count += parseInt(res.sf30_sl2);
                sf31_sl1count += parseInt(res.sf31_sl1);
                sf31_sl2count += parseInt(res.sf31_sl2);
            }
            stats.push({
                specialization: 'Всего',
                 sf1_sl1: sf1_sl1count + '',
                 sf1_sl2: sf1_sl2count + '',
                 sf3_sl1: sf3_sl1count + '',
                 sf3_sl2: sf3_sl2count + '',
                 sf4_sl1: sf4_sl1count + '',
                 sf4_sl2: sf4_sl2count + '',
                 sf5_sl1: sf5_sl1count + '',
                 sf5_sl2: sf5_sl2count + '',
                 sf8_sl1: sf8_sl1count + '',
                 sf8_sl2: sf8_sl2count + '',
                sf15_sl1: sf15_sl1count + '',
                sf15_sl2: sf15_sl2count + '',
                sf17_sl1: sf17_sl1count + '',
                sf17_sl2: sf17_sl2count + '',
                sf21_sl1: sf21_sl1count + '',
                sf21_sl2: sf21_sl2count + '',
                sf23_sl1: sf23_sl1count + '',
                sf23_sl2: sf23_sl2count + '',
                sf24_sl1: sf24_sl1count + '',
                sf24_sl2: sf24_sl2count + '',
                sf29_sl1: sf29_sl1count + '',
                sf29_sl2: sf29_sl2count + '',
                sf30_sl1: sf30_sl1count + '',
                sf30_sl2: sf30_sl2count + '',
                sf31_sl1: sf31_sl1count + '',
                sf31_sl2: sf31_sl2count + ''
            });
            for(res of stats){
                let sf_overall = parseInt(res.sf1_sl1) + parseInt(res.sf1_sl2) + parseInt(res.sf3_sl1) + parseInt(res.sf3_sl2) + parseInt(res.sf4_sl1) + parseInt(res.sf4_sl2) + parseInt(res.sf5_sl1) + parseInt(res.sf5_sl2) + parseInt(res.sf8_sl1) + parseInt(res.sf8_sl2) + parseInt(res.sf15_sl1) + parseInt(res.sf15_sl2) + parseInt(res.sf17_sl1) + parseInt(res.sf17_sl2) + parseInt(res.sf21_sl1) + parseInt(res.sf21_sl2) + parseInt(res.sf23_sl1) + parseInt(res.sf23_sl2) + parseInt(res.sf24_sl1) + parseInt(res.sf24_sl2) + parseInt(res.sf29_sl1) + parseInt(res.sf29_sl2) + parseInt(res.sf30_sl1) + parseInt(res.sf30_sl2) + parseInt(res.sf31_sl1) + parseInt(res.sf31_sl2);
                Object.assign(res, { sf_overall:sf_overall+'' });
                let sf_fulltime = parseInt(res.sf1_sl1) + parseInt(res.sf1_sl2) + parseInt(res.sf5_sl1) + parseInt(res.sf5_sl2) + parseInt(res.sf15_sl1) + parseInt(res.sf15_sl2) + parseInt(res.sf17_sl1) + parseInt(res.sf17_sl2) + parseInt(res.sf21_sl1) + parseInt(res.sf21_sl2) + parseInt(res.sf23_sl1) + parseInt(res.sf23_sl2) + parseInt(res.sf24_sl1) + parseInt(res.sf24_sl2) + parseInt(res.sf29_sl1) + parseInt(res.sf29_sl2) + parseInt(res.sf31_sl1) + parseInt(res.sf31_sl2)
                Object.assign(res, { sf_fulltime:sf_fulltime+'' });
                let sf_dl = parseInt(res.sf3_sl1) + parseInt(res.sf3_sl2) + parseInt(res.sf4_sl1) + parseInt(res.sf4_sl2) + parseInt(res.sf8_sl1) + parseInt(res.sf8_sl2) + parseInt(res.sf30_sl1) + parseInt(res.sf30_sl2);
                Object.assign(res, { sf_dl:sf_dl+'' });
            }
            return stats;
        },
    },
];

