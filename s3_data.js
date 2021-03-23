const AWS = require('ibm-cos-sdk');
const fs = require('fs');
const config = require('./config');
const cos_config = {
    endpoint: config.getCosEndpoint(),
    apiKeyId: config.getCosAPIKeyID(),
    ibmAuthEndpoint: config.getCosAuthEndpoint(),
    serviceInstanceId: config.getCosServiceInstanceID(),
};

const cos = new AWS.S3(cos_config);
module.exports = {
    addItemToStorage: function(bucketname, filename, filebody) {
        return new Promise((resolve, reject)=>{
            cos.putObject({
                Bucket: bucketname, 
                Key: filename, 
                Body: filebody
            }).promise()
            .then(() => {
                resolve();
            })
            .catch((e) => {
                reject(e)
            });
            
        })
    }
}