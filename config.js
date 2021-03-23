module.exports = {
    getCloudantAccountUrl: function () {
        if (process.env.CLOUDANT_ACCOUNT_URL) {
            return process.env.CLOUDANT_ACCOUNT_URL;
        } else { 
            return ''
        }
    },
    getCloudantAPIKey: function () {
        if (process.env.CLOUDANT_API_KEY) {
            return process.env.CLOUDANT_API_KEY;
        } else { 
            return ''
        }
    },
    getCosServiceInstanceID: function () {
        if (process.env.COS_SERVICEINSTANCE_ID) {
            return process.env.COS_SERVICEINSTANCE_ID;
        } else { 
            return ''
        }
    },
    getCosAPIKeyID: function () {
        if (process.env.COS_API_KEY_ID) {
            return process.env.COS_API_KEY_ID;
        } else { 
            return ''
        }
    },
    getCosAuthEndpoint: function () {
        if (process.env.COS_AUTH_ENDPOINT) {
            return process.env.COS_AUTH_ENDPOINT;
        } else { 
            return ''
        }
    },
    getCosEndpoint: function () {
        if (process.env.COS_ENDPOINT) {
            return process.env.COS_ENDPOINT;
        } else { 
            return ''
        }
    },
    getAppIDTenantID: function () {
        if (process.env.APPID_TENANTID) {
            return process.env.APPID_TENANTID;
        } else { 
            return ''
        }
    },
    getAppIDClientID: function () {
        if (process.env.APPID_CLIENTID) {
            return process.env.APPID_CLIENTID;
        } else { 
            return ''
        }
    },
    getAppIDSecret: function () {
        if (process.env.APPID_SECRET) {
            return process.env.APPID_SECRET;
        } else { 
            return ''
        }
    },
    getAppIDOAuthServerUrl: function () {
        if (process.env.APPID_OAUTHSERVERURL) {
            return process.env.APPID_OAUTHSERVERURL;
        } else { 
            return ''
        }
    },
    getAppIDRedirectUrl: function () {
        if (process.env.APPID_REDIRECTURL) {
            return process.env.APPID_REDIRECTURL;
        } else {
            return ''
        }
    },
    getAppIDCutwiseOAuthServerUrl: function () {
        if (process.env.APPID_CUTWISE_OAUTHSERVERURL) {
            return process.env.APPID_CUTWISE_OAUTHSERVERURL;
        } else {
            return ''
        }
    },
    getRabbitMQConnection: function () {
        if (process.env.RABBITMQ_CONNECTION) {
            return process.env.RABBITMQ_CONNECTION;
        } else { 
            return ''
        }
    },
    getRabbitMQCertificateBase64: function () {
        if (process.env.RABBITMQ_CERTIFICATE_BASE64) {
            return process.env.RABBITMQ_CERTIFICATE_BASE64;
        } else { 
            return ''
        }
    },
    getRabbitMQHOST: function () {
        if (process.env.RABBITMQ_HOST) {
            return process.env.RABBITMQ_HOST;
        } else { 
            return ''
        }
    },
    getRabbitMQPORT: function () {
        if (process.env.RABBITMQ_PORT) {
            return process.env.RABBITMQ_PORT;
        } else { 
            return ''
        }
    },
    getSessionSecret: function () {
        if (process.env.SECRET_KEY) {
            return process.env.SECRET_KEY;
        } else { 
            return ''
        }
    }
};