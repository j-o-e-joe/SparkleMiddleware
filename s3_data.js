const AWS = require('ibm-cos-sdk');
const fs = require('fs');
const config = require('./config');
const cos_configuration = config.getCosCredentials(fs.readFileSync("vcap-local.json", "utf-8"));
const cos = new AWS.S3(cos_configuration);
      
module.exports = {
    addItemToStorage: function(bucketname, timestamp, controlnumber, protocol, filename, filebody) {
        return new Promise((resolve, reject)=>{
            cos.putObject({
                Bucket: bucketname, 
                Key: controlnumber + "/" + timestamp + "/" + protocol + "/" + filename, 
                Body: filebody
            }).promise()
            .then(() => {
                resolve();
            })
            .catch((e) => {
                reject(e)
            });
            
        })
    },
    addPlotToStorage: function(bucketname, controlnumber, plottimestamp, filename, filebody) {
        return new Promise((resolve, reject)=>{
            cos.putObject({
                Bucket: bucketname, 
                Key: controlnumber + "/" + plottimestamp + "/" + filename, 
                Body: filebody
            }).promise()
            .then(() => {
                resolve();
            })
            .catch((e) => {
                reject(e)
            });
            
        })
    },
    removeItemFromStorage: function(bucketname, filepath) {
        return new Promise((resolve, reject)=>{
            cos.deleteObject(
                {Bucket: bucketname, Key: filepath}
            ).promise()
            .then((data) => {
                resolve()
            })
            .catch((e) => {
                reject(e)
            });
        });
    },
    removeItemsFromStorage: function(bucketname, objects) {
        return new Promise((resolve, reject)=>{
            cos.deleteObjects({
                Bucket: bucketname,
                Delete: {Objects: objects}
            }).promise()
            .then((data) => {
                resolve()
            })
            .catch((e) => {
                reject(e)
            });
        });
    },
    getItemFromStorage: function(bucketname, filepath) {
        return new Promise((resolve, reject)=>{
            cos.getObject(
                {Bucket: bucketname, Key: filepath}
            ).promise()
            .then((data) => {
                resolve(data)
            })
            .catch((e) => {
                reject(e)
            });
        });
    }

}