const express = require('express');
const passport = require('passport');
const multer  = require('multer');
const AdmZip = require('adm-zip');
const s3_data = require('./s3_data');
const cloudant_data = require('./cloudant_data');
const rabbitmq_messages = require('./rabbitmq_messages');
const config = require('./config');
const fs = require('fs');
const formidable = require('formidable');
const { resolve } = require('path');

// S3 Buckets 
const CUTWISEUPLOADS = process.env.CUTWISEUPLOADS

var db = cloudant_data.initDBConnection();
var router = express.Router();
//rabbitmq_messages.initAMQPConnection();

const APIStrategy = require("ibmcloud-appid").APIStrategy;
passport.use(new APIStrategy({
	oauthServerUrl: config.getAppIDCutwiseOAuthServerUrl()
}));
    

router.post('/api/uploadcutwise',
    passport.authenticate(APIStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res)  {
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
            if (err) {
                console.log("Error: " + err);
                res.status(403).send(`${err.code} - ${err.message}\n`);
                res.end()
                return;
            }
            let filepath = files.file.path;
            let filename = files.file.name;
            let filesize = files.file.size;
 
            let ext = files.file.name.split('.').pop();
            if (ext != "zip") {
                fs.unlink(filepath, function (err) { console.error(err); });
                res.status(403).send("Error: file must have zip extension.")
                res.end()
            } else if (filesize == 0) {
                fs.unlink(filepath, function (err) { console.error(err); });
                res.status(403).send("Error: file size is zero.")
                res.end()
            } else {
                let timestamp = new Date(new Date().toUTCString()).toISOString();
                var cutwise_item = new Object();
                cutwise_item.bucketname = CUTWISEUPLOADS;
                cutwise_item.timestamp = timestamp;
                cutwise_item.filepath = timestamp + "/" + filename;
                
                var promises = []
                promises.push(cloudant_data.addItemToCloudantDB(db, cutwise_item))
                promises.push(s3_data.addCutwiseItemToStorage(CUTWISEUPLOADS, timestamp + "/" + filename,  fs.createReadStream(filepath)))
                Promise.all(promises)    
                .then(() => { 
                    let message = "{\"timestamp\":\"" + timestamp + "\"}";   
                    rabbitmq_messages.publish("cutwise_zip_pipeline", Buffer.from(message)).then(() => {
                        console.log(message)
                        fs.unlink(filepath, function (err) { 
                            if (err) {
                                console.error(err); 
                            }
                        });
                        res.status(200).send("Success: Zip package uploaded successfully");
                        res.end()

                    }).catch((e)=>{
                    fs.unlink(filepath, function (err) { console.error(err); });
                        res.status(200).send("Success: RabbitMQ not availabe - zip saved and message is queued.");
                    res.end()
                    }) 

                }).catch((e)=>{
                    fs.unlink(filepath, function (err) { console.error(err); });
                    res.status(500).send(`${e.code} - ${e.message}\n`);
                    res.end()
                }) 
            }
        });
    }
); 

module.exports = router;