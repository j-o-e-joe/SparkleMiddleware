const fs = require('fs');

module.exports = {
    getDBCredentialsUrl: function () {
        if (process.env.CLOUDANT_ACCOUNT_URL) {
            return process.env.CLOUDANT_ACCOUNT_URL;
        } else { 
            var jsonData = fs.readFileSync("vcap-local-server.json", "utf-8");
            var vcapServices = JSON.parse(jsonData);
            for (var vcapService in vcapServices) {
                if (vcapService.match(/cloudantNoSQLDB/i)) {
                    return vcapServices[vcapService][0].credentials.url;
                }
            }
        }
    },
    getCosServiceInstanceID: function () {
        if (process.env.COS_SERVICEINSTANCE_ID) {
            return process.env.COS_SERVICEINSTANCE_ID;
        } else { 
            var jsonData = fs.readFileSync("vcap-local-server.json", "utf-8");
            var vcapServices = JSON.parse(jsonData);
            for (var vcapService in vcapServices) {
                if (vcapService.match(/cloud-object-storage/i)) {
                    return vcapServices[vcapService][0].credentials.resource_instance_id;
                }
            }
        }
    },
    getCosAPIKeyID: function () {

        if (process.env.COS_API_KEY_ID) {
            return process.env.COS_API_KEY_ID;
        } else { 
            var jsonData = fs.readFileSync("vcap-local-server.json", "utf-8");
            var vcapServices = JSON.parse(jsonData);
            for (var vcapService in vcapServices) {
                if (vcapService.match(/cloud-object-storage/i)) {
                    return vcapServices[vcapService][0].credentials.apikey;
                }
            }
        }
    },
    getCosAuthEndpoint: function () {

        if (process.env.COS_AUTH_ENDPOINT) {
            return process.env.COS_AUTH_ENDPOINT;
        } else { 
            return 'https://iam.ng.bluemix.net/oidc/token';
        }
    },
    getCosEndpoint: function () {
        if (process.env.COS_ENDPOINT) {
            return process.env.COS_ENDPOINT;
        } else { 
            return 'https://s3.us-south.cloud-object-storage.appdomain.cloud';
        }
    },
    getAppIDTenantID: function () {
        if (process.env.APPID_TENANTID) {
            return process.env.APPID_TENANTID;
        } else { 
            var jsonData = fs.readFileSync("vcap-local-server.json", "utf-8");
            var vcapServices = JSON.parse(jsonData);
            for (var vcapService in vcapServices) {
                if (vcapService.match(/appid/i)) {
                    return vcapServices[vcapService][0].credentials.tenantId;
                }
            }
        }
    },
    getAppIDClientID: function () {
        if (process.env.APPID_CLIENTID) {
            return process.env.APPID_CLIENTID;
        } else { 
            var jsonData = fs.readFileSync("vcap-local-server.json", "utf-8");
            var vcapServices = JSON.parse(jsonData);
            for (var vcapService in vcapServices) {
                if (vcapService.match(/appid/i)) {
                    return vcapServices[vcapService][0].credentials.clientId;
                }
            }
        }
    },
    getAppIDSecret: function () {
        if (process.env.APPID_SECRET) {
            return process.env.APPID_SECRET;
        } else { 
            var jsonData = fs.readFileSync("vcap-local-server.json", "utf-8");
            var vcapServices = JSON.parse(jsonData);
            for (var vcapService in vcapServices) {
                if (vcapService.match(/appid/i)) {
                    return vcapServices[vcapService][0].credentials.secret;
                }
            }
        }
    },
    getAppIDOAuthServerUrl: function () {
        if (process.env.APPID_OAUTHSERVERURL) {
            return process.env.APPID_OAUTHSERVERURL;
        } else { 
            var jsonData = fs.readFileSync("vcap-local-server.json", "utf-8");
            var vcapServices = JSON.parse(jsonData);
            for (var vcapService in vcapServices) {
                if (vcapService.match(/appid/i)) {
                    return vcapServices[vcapService][0].credentials.oauthServerUrl;
                }
            }
        }
    },
    getAppIDCutwiseOAuthServerUrl: function () {
        if (process.env.APPID_CUTWISE_OAUTHSERVERURL) {
            return process.env.APPID_CUTWISE_OAUTHSERVERURL;
        } else { 
            var jsonData = fs.readFileSync("vcap-local-server.json", "utf-8");
            var vcapServices = JSON.parse(jsonData);
            for (var vcapService in vcapServices) {
                if (vcapService.match(/appid/i)) {
                    return vcapServices[vcapService][0].credentials.oauthServerUrl;
                }
            }
        }
    },
    getRabbitMQConnection: function () {
        if (process.env.RABBITMQ_CONNECTION) {
            return process.env.RABBITMQ_CONNECTION;
        } else { 
            var jsonData = fs.readFileSync("vcap-local-server.json", "utf-8");
            var vcapServices = JSON.parse(jsonData);
            for (var vcapService in vcapServices) {
                if (vcapService.match(/messages-for-rabbitmq/i)) {
                    return vcapServices[vcapService][0].credentials.connection.amqps.composed[0];
                }
            }
        }
    },
    getRabbitMQCertificateBase64: function () {
        if (process.env.RABBITMQ_CERTIFICATE_BASE64) {
            return process.env.RABBITMQ_CERTIFICATE_BASE64;
        } else { 
            var jsonData = fs.readFileSync("vcap-local-server.json", "utf-8");
            var vcapServices = JSON.parse(jsonData);
            for (var vcapService in vcapServices) {
                if (vcapService.match(/messages-for-rabbitmq/i)) {
                    return vcapServices[vcapService][0].credentials.connection.amqps.certificate.certificate_base64;
                }
            }
        }
    },
    getSessionSecret: function (jsonData) {
        if (process.env.SECRET_KEY) {
            return process.env.SECRET_KEY;
        } else { 
            var jsonData = fs.readFileSync("vcap-local-server.json", "utf-8");
            var vcapServices = JSON.parse(jsonData);
            for (var vcapService in vcapServices) {
                if (vcapService.match(/session/i)) {
                    return vcapServices[vcapService][0].credentials.secret;
                }
            }
        }
    }
};