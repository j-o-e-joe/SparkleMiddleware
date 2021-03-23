const express = require('express');
const passport = require('passport');
const s3_data = require('./s3_data');
const cloudant_data = require('./cloudant_data');
const rabbitmq_messages = require('./rabbitmq_messages');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const admzip = require('adm-zip');
const formidable = require('formidable');

// S3 Buckets 
const CISGOUPLOADS = process.env.CISGOUPLOADS
const CUTWISEUPLOADS = process.env.CUTWISEZIPUPLOADS
const HELIUMUPLOADS =  process.env.HELIUMUPLOADS

// sleep               
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

var router = express.Router();
rabbitmq_messages.initAMQPConnection();

const APIStrategy = require("ibmcloud-appid").APIStrategy;
passport.use(new APIStrategy({
	oauthServerUrl: config.getAppIDCutwiseOAuthServerUrl()
}));

router.post('/uploadasc',
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

            let controlnumber = filename.split('.')[0];
            let ext = filename.split('.').pop();
            if (ext != "asc") {
                fs.unlink(filepath, function (err) { console.error(err); });
                res.status(403).send("Error: file must have zip extension.")
                res.end()
            } else if (filesize == 0) {
                fs.unlink(filepath, function (err) { console.error(err); });
                res.status(403).send("Error: file size is zero.")
                res.end()
            } else {
                
                let timestamp = new Date(new Date().toUTCString()).toISOString();
               
                var asc_item = new Object();
                asc_item.bucketname = HELIUMUPLOADS;
                asc_item.controlnumber = controlnumber;
                asc_item.timestamp = timestamp;
                asc_item.filepath = controlnumber + "/" + timestamp + "/" + filename;
                
                var promises = []
                var db = cloudant_data.initDBConnection();
                promises.push(cloudant_data.addItemToCloudantDB(db, asc_item))
                promises.push(s3_data.addItemToStorage(HELIUMUPLOADS, asc_item.filepath,  fs.createReadStream(filepath)))
                Promise.all(promises)    
                .then(() => { 
                    res.status(200).send("Success: ASC uploaded successfully");
                    res.end()
                }).catch((e)=>{
                    fs.unlink(filepath, function (err) { console.error(err); });
                        res.status(200).send("Success: RabbitMQ not availabe - zip saved and message is queued.");
                    res.end()
                }) 
            }
        });
    }
);

router.post('/uploadcutwise',
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
                cutwise_item.processed = 'no';
                cutwise_item.filepath = timestamp + "/" + filename;
            
                var promises = []

                var db = cloudant_data.initDBConnection();
                promises.push(cloudant_data.addItemToCloudantDB(db, cutwise_item))
                promises.push(s3_data.addItemToStorage(CUTWISEUPLOADS, timestamp + "/" + filename,  fs.createReadStream(filepath)))
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


async function processrequests(filemap, controlnumber, cisgotimestamp, cisgouser, cisgodevice) {
    return new Promise(async (resolve, reject)=>{
        
        var a_crown_wireframe = filemap.get('a_crown');
        var b_crown_high = filemap.get('b_crown_high');
        var b_crown_low = filemap.get('b_crown_low');
      
        var db = cloudant_data.initDBConnection();
        
        s3_data.addItemToStorage(CISGOUPLOADS, controlnumber + "/" + cisgotimestamp + "/" + a_crown_wireframe.protocol + "/" + a_crown_wireframe.filename, a_crown_wireframe.data)
        .then(() => { 
        }).catch((e) => { 
            console.log("failed to add item to data store")
            console.log(e)
            reject(e)
            return
        }); 
        
        s3_data.addItemToStorage(CISGOUPLOADS, controlnumber + "/" + cisgotimestamp + "/" + b_crown_high.protocol + "/" + b_crown_high.filename,  b_crown_high.data)
        .then(() => { 
        }).catch((e) => { 
            console.log("failed to add item to data store")
            console.log(e)
            reject(e)
            return
        }); 

        s3_data.addItemToStorage(CISGOUPLOADS, controlnumber + "/" + cisgotimestamp + "/" + b_crown_low.protocol + "/" + b_crown_low.filename,  b_crown_low.data)
        .then(() => { 
        }).catch((e) => { 
            console.log("failed to add item to data store")
            console.log(e)
            reject(e)
            return
        }); 

        await sleep(1000);
        if (filemap.has('asc')) {
            var asc = filemap.get('asc');
            s3_data.addItemToStorage(CISGOUPLOADS, controlnumber + "/" + cisgotimestamp + "/" + asc.protocol + "/" + asc.filename,  asc.data)
            .then(()=>{
                var asc_item = new Object();
                asc_item.bucketname = CISGOUPLOADS;
                asc_item.cisgotimestamp = cisgotimestamp;
                asc_item.cisgousername = cisgouser;
                asc_item.cisgodevice = cisgodevice;
                asc_item.controlnumber = controlnumber;
                asc_item.protocol = asc.protocol;
                asc_item.filepath = controlnumber + "/" + cisgotimestamp + "/" + asc.protocol + "/" + asc.filename;
                cloudant_data.addItemToCloudantDB(db, asc_item).then(()=>{    
                }).catch((e)=>{ 
                    console.log(e)
                })
            }).catch((e)=>{
                console.log("failed to write ASC to data store")
                console.log(e)
                reject(e)
                return
            });
        }
      
        await sleep(1000);
        var a_crown_item = new Object();
        a_crown_item.bucketname = CISGOUPLOADS;
        a_crown_item.cisgotimestamp = cisgotimestamp;
        a_crown_item.cisgousername = cisgouser;
        a_crown_item.cisgodevice = cisgodevice;
        a_crown_item.controlnumber = controlnumber;
        a_crown_item.protocol = a_crown_wireframe.protocol;
        a_crown_item.filepath = controlnumber + "/" + cisgotimestamp + "/" + a_crown_wireframe.protocol + "/" + a_crown_wireframe.filename;
        cloudant_data.addItemToCloudantDB(db, a_crown_item).then(()=>{    
        }).catch((e)=>{ 
            console.log("failed to write A Crown to data store")
            console.log(e)
            reject(e)
            return
        })
        
        await sleep(1000);
        var b_high_item = new Object();
        b_high_item.bucketname = CISGOUPLOADS;
        b_high_item.cisgotimestamp = cisgotimestamp;
        b_high_item.cisgousername = cisgouser;
        b_high_item.cisgodevice = cisgodevice;
        b_high_item.controlnumber = controlnumber;
        b_high_item.protocol = b_crown_high.protocol;
        b_high_item.filepath = controlnumber + "/" + cisgotimestamp + "/" + b_crown_high.protocol + "/" + b_crown_high.filename;
        cloudant_data.addItemToCloudantDB(db, b_high_item).then(()=>{
        }).catch((e)=>{ 
            console.log("failed to write B High to data store")
            console.log(e)
            reject(e)
            return
        })
        
        await sleep(1000);
        var b_low_item = new Object();
        b_low_item.bucketname = CISGOUPLOADS;
        b_low_item.cisgotimestamp = cisgotimestamp;
        b_low_item.cisgousername = cisgouser;
        b_low_item.cisgodevice = cisgodevice;
        b_low_item.controlnumber = controlnumber;
        b_low_item.protocol = b_crown_low.protocol;
        b_low_item.filepath = controlnumber + "/" + cisgotimestamp + "/" + b_crown_low.protocol + "/" + b_crown_low.filename;
        cloudant_data.addItemToCloudantDB(db, b_low_item).then(()=> {
            let message = "{\"controlnumber\":\"" + controlnumber + "\", \"cisgotimestamp\":\"" + cisgotimestamp + "\"}"
            rabbitmq_messages.publish("sparkle_fitting_pipeline", Buffer.from(message)).then(() => {
                resolve(message);
            }).catch((e)=>{
                reject(e);
            })
        }).catch((e)=>{
            console.log("failed to write B Low to data store")
            console.log(e)
            reject(e)
            return
        });

    });

}

router.post('/uploadcisgo',
    passport.authenticate(APIStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res)  {
        const form = formidable({ multiples: false });
        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.log("Error: " + err);
                res.status(403).send(`${err.code} - ${err.message}\n`);
                res.end()
                return;
            }

            let filepath = files.file.path;
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
                if (fields.controlnumber == undefined || fields.controlnumber.length <= 0) {
                    fs.unlink(filepath, function (err) { console.error(err); });
                    res.status(403).send("Error: invalid input.")
                    res.end()
                    return
                }
                var controlnumber = fields.controlnumber;
                var cisgouser = fields.cisgouser;
                var cisgodevice = fields.cisgodevice;
                var cisgotimestamp = new Date(new Date().toUTCString()).toISOString();
                
                var filebody = fs.readFileSync(filepath);
                var zip = new admzip(filebody);
                var zipEntries = zip.getEntries();
                
                var filemap = new Map()
                
                for (var i = 0; i < zipEntries.length; i++) {
                    var data = zipEntries[i].getData();
                    var entryname = path.basename(zipEntries[i].entryName);
                    if (entryname != '__MACOSX') {
                        var fileext = entryname.split('.').pop()
                        if (fileext == "jpg" || fileext == "jpeg") {
                            
                            var components = entryname.split('_');
                            if (components.length > 2) {
                               
                                if (components[1] === "A") {
                                    var fileitem = new Object();
                                    fileitem.controlnumber = components[0];
                                    fileitem.protocol = "A_Crown_Wireframe" 
                                    fileitem.filename = entryname
                                    fileitem.data = data;
                                    filemap.set('a_crown', fileitem);
                                } else if (components[1] === "B") {
                                    if (components[components.length - 1].includes('Low')) {
                                        var fileitem = new Object();
                                        fileitem.controlnumber = components[0];
                                        fileitem.protocol = "B_Crown_Clarity" 
                                        fileitem.filename = entryname
                                        fileitem.data = data;
                                        filemap.set('b_crown_low', fileitem);
                
                                    } else if (components[components.length - 1].includes('High')) {
                                        var fileitem = new Object();
                                        fileitem.controlnumber = components[0];
                                        fileitem.protocol = "B_Crown_Clarity" 
                                        fileitem.filename = entryname
                                        fileitem.data = data;
                                        filemap.set('b_crown_high', fileitem);
                                    }
                                } 
                            }
                        } else if (entryname == controlnumber + ".asc") {
                            var fileitem = new Object();
                            fileitem.controlnumber = controlnumber;
                            fileitem.protocol = "ASC" 
                            fileitem.filename = controlnumber + ".asc";
                            fileitem.data = data;
                            filemap.set('asc', fileitem);
                        } 
                    }
                }
                if (filemap.get('a_crown') === undefined) {
                    fs.unlink(filepath, function (err) { console.error(err); });
                    res.write('Invalid input: A Crown Wireframe not found!');
                    res.end();
                    return
                }
                if (filemap.get('b_crown_low') === undefined) {
                    fs.unlink(filepath, function (err) { console.error(err); });
                    res.write('Invalid input: B Crown Low not found!');
                    res.end();
                    return
                }
                if (filemap.get('b_crown_high') === undefined) {
                    fs.unlink(filepath, function (err) { console.error(err); });
                    res.write('Invalid input: B Crown High not found!');
                    res.end();
                    return
                }
            
                await processrequests(filemap, controlnumber, cisgotimestamp, cisgouser, cisgodevice).then((controlnumbers)=>{
                    fs.unlink(filepath, function (err) { console.error(err); });
                    res.status(200).send("Success: Zip package uploaded successfully");
                    res.end()
                }).catch((e)=>{
                    fs.unlink(filepath, function (err) { console.error(err); });
                    res.write(`ERROR: ${e.code} - ${e.message}\n`);
                    res.end();
                })
            }
        });
    }
); 

module.exports = router;