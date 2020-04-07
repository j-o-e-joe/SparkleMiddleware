const fs = require('fs');

module.exports = {
    getDBCredentialsUrl: function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        for (var vcapService in vcapServices) {
            if (vcapService.match(/cloudantNoSQLDB/i)) {
                return vcapServices[vcapService][0].credentials.url;
            }
        }
    },

    getCosCredentials: function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        for (var vcapService in vcapServices) {
            if (vcapService.match(/cloud-object-storage/i)) {
                return vcapServices[vcapService][0].credentials;
            }
        }
    },
    
    getAppIDCredentials: function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        for (var vcapService in vcapServices) {
            if (vcapService.match(/AppID/i)) {
                return vcapServices[vcapService][0].credentials;
            }
        }
    },
    
    getRabbitMQCredentials: function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        for (var vcapService in vcapServices) {
            if (vcapService.match(/messages-for-rabbitmq/i)) {
                return vcapServices[vcapService][0].credentials;
            }
        }
    },
    getSession: function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        for (var vcapService in vcapServices) {
            if (vcapService.match(/session/i)) {
                return vcapServices[vcapService][0].credentials;
            }
        }
    }
};