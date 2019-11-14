const fs = require('fs');

module.exports = {
    getDBCredentialsUrl: function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        for (var vcapService in vcapServices) {
            if (vcapService.match(/cloudant/i)) {
                return vcapServices[vcapService][0].credentials.url;
            }
        }
    },

    getCosCredentials: function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        for (var vcapService in vcapServices) {
            if (vcapService.match(/cos/i)) {
                return vcapServices[vcapService][0].credentials;
            }
        }
    },
    
    getWebAppStrategy: function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        for (var vcapService in vcapServices) {
            if (vcapService.match(/webappstrategy/i)) {
                return vcapServices[vcapService][0].credentials;
            }
        }
    },
    
    getApiStrategy: function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        for (var vcapService in vcapServices) {
            if (vcapService.match(/apistrategy/i)) {
                return vcapServices[vcapService][0].credentials;
            }
        }
    },
    
    getServerAuth: function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        for (var vcapService in vcapServices) {
            if (vcapService.match(/serverauth/i)) {
                return vcapServices[vcapService][0].credentials;
            }
        }
    },

    getServerAuth2: function (jsonData) {
        var vcapServices = JSON.parse(jsonData);
        for (var vcapService in vcapServices) {
            if (vcapService.match(/serverauth2/i)) {
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