const express = require('express');
const passport = require('passport');
const multer  = require('multer');
const AdmZip = require('adm-zip');
const request = require('request')
const xlsx = require('xlsx');
const s3_data = require('./s3_data');
const cloudant_data = require('./cloudant_data');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const amqp = require("amqplib");

const storage = multer.memoryStorage()
const upload = multer({ storage });
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

// S3 Buckets 
const CISGOIMAGES = process.env.CISGOIMAGES
const HELIUMUPLOADS = process.env.HELIUMUPLOADS
const SPARKLETRAININGCLARITY = process.env.SPARKLETRAININGCLARITY
const SPARKLETRAININGINCLUSIONS = process.env.SPARKLETRAININGINCLUSIONS

var db = cloudant_data.initDBConnection();
var router = express.Router();

let connectionString = config.getRabbitMQConnection();
let certificateBase64 = config.getRabbitMQCertificateBase64();
let caCert = Buffer.from(certificateBase64, 'base64');

let open = amqp.connect(connectionString, { ca: [caCert] });
open
  .then(conn => {
    return conn.createChannel();
  })
  .then(ch => {
    return ch.assertQueue("sparkle_fitting_pipeline", { autoDelete: false, durable: false });
  })
  .catch(err => {
    console.log(err);
});


var sparklepipelinelogs = []
open.then(conn => {
    return conn.createChannel();
})
.then(ch => {
    var exchange = 'sparkle_pipeline_logs';
    return ch
    .assertExchange(exchange, "fanout", { durable: false })
    .then(() => {
        return ch.assertQueue('', { exclusive: true });
    })
    .then(q => {
        sparklepipelinelogs = []
        ch.bindQueue(q.queue, exchange, '');
        ch.consume(q.queue, function(msg) {
            if(msg.content) {
                sparklepipelinelogs.push(msg.content.toString());
            }
        }, {
            noAck: true
        });
    });
})
.catch(err => {
    console.log(err);
});

function additemtodatastore(bucketname, fileitem, cisgotimestamp, controlnumber) {
    return new Promise((resolve, reject)=>{
        s3_data.addItemToStorage(bucketname, cisgotimestamp, controlnumber, fileitem.protocol, fileitem.filename, fileitem.data)
        .then(() => { 
           resolve()
        }).catch((e) => { 
            console.log(e)
            reject(e)
        }); 
    })
}

function removeitemfromdatastore(bucketname, fileitem, cisgotimestamp, controlnumber) {
    return new Promise((resolve, reject)=>{
        s3_data.removeItemFromStorage(bucketname, cisgotimestamp, controlnumber, fileitem.protocol, fileitem.filename, fileitem.data)
        .then(() => { 
           resolve()
        }).catch((e) => { 
            console.log(e)
            reject(e)
        }); 
    })
}

function runsparkleprocessing(controlnumber, cisgotimestamp) {
    return new Promise((resolve, reject)=>{
        open.then(conn => {
            return conn.createChannel();
        })
        .then(ch => {
            let message = "{\"controlnumber\":\"" + controlnumber + "\", \"cisgotimestamp\":\"" + cisgotimestamp + "\"}"
            ch.publish('', 'sparkle_fitting_pipeline', Buffer(message));
            resolve(message);
        })
        .catch(err => {
          reject(err);
        });
    });
}

function runtraining(trainingitem, trainingtype) {
    return new Promise((resolve, reject)=>{      
        let open = amqp.connect(connectionString, { ca: [caCert] });
        open.then(conn => {
            return conn.createChannel();
        })
        .then(ch => {
            let message = "{\"trainingid\" : \"" + trainingitem.trainingtimestamp 
            + "\", \"trianingtype\" : \"" + trainingtype
            + "\", \"epocs\" : \"" + trainingitem.epocs
            + "\", \"spe\" : \"" + trainingitem.spe + "\"}"
            ch.assertQueue("sparkle_training", { autoDelete: false, durable: false });
            ch.publish('', 'sparkle_training', Buffer(message));
            resolve(message);
        })
        .catch(err => {
            console.log("Error running training: " + err)
            reject(err);
        });
    });
}

async function processrequests(filemap, controlnumber, cisgotimestamp, cisgouser, cisgodevice) {
    return new Promise(async (resolve, reject)=>{
        
        var a_crown_wireframe = filemap.get('a_crown');
        var b_crown_high = filemap.get('b_crown_high');
        var b_crown_low = filemap.get('b_crown_low');
      
        additemtodatastore(CISGOIMAGES, a_crown_wireframe, cisgotimestamp, controlnumber).then(()=>{}).catch((e)=>{
            console.log("failed to add item to data store")
            console.log(e)
            reject(e)
            return
        });
        additemtodatastore(CISGOIMAGES, b_crown_high, cisgotimestamp, controlnumber).then(()=>{}).catch((e)=>{
            console.log("failed to add item to data store")
            console.log(e)
            reject(e)
            return
        });
        additemtodatastore(CISGOIMAGES, b_crown_low, cisgotimestamp, controlnumber).then(()=>{}).catch((e)=>{
            console.log("failed to add item to data store")
            console.log(e)
            reject(e)
            return
        });

        await sleep(1000);
        if (filemap.has('asc')) {
            var asc = filemap.get('asc');
            additemtodatastore(HELIUMUPLOADS, asc, cisgotimestamp, controlnumber).then(()=>{
                var asc_item = new Object();
                asc_item.bucketname = HELIUMUPLOADS;
                asc_item.cisgotimestamp = cisgotimestamp;
                asc_item.cisgousername = cisgouser;
                asc_item.cisgodevice = cisgodevice;
                asc_item.controlnumber = controlnumber;
                asc_item.protocol = asc.protocol;
                asc_item.filepath = cisgotimestamp + "/" + asc.protocol + "/" + asc.filename;
                asc_item.sparkleprocessed = false;
                cloudant_data.addItemToCloudantDB(db, asc_item).then(()=>{    
                }).catch((e)=>{ 
                    console.log(e)
                    //reject(e)
                })
            }).catch((e)=>{
                console.log(e)
            });
        }
      
        await sleep(1000);
        var a_crown_item = new Object();
        a_crown_item.bucketname = CISGOIMAGES;
        a_crown_item.cisgotimestamp = cisgotimestamp;
        a_crown_item.cisgousername = cisgouser;
        a_crown_item.cisgodevice = cisgodevice;
        a_crown_item.controlnumber = controlnumber;
        a_crown_item.protocol = a_crown_wireframe.protocol;
        a_crown_item.filepath = cisgotimestamp + "/" + a_crown_wireframe.protocol + "/" + a_crown_wireframe.filename;
        a_crown_item.sparkleprocessed = false;
        cloudant_data.addItemToCloudantDB(db, a_crown_item).then(()=>{    
        }).catch((e)=>{ 
            console.log(e)
            //reject(e)
        })
        
        await sleep(1000);
        var b_high_item = new Object();
        b_high_item.bucketname = CISGOIMAGES;
        b_high_item.cisgotimestamp = cisgotimestamp;
        b_high_item.cisgousername = cisgouser;
        b_high_item.cisgodevice = cisgodevice;
        b_high_item.controlnumber = controlnumber;
        b_high_item.protocol = b_crown_high.protocol;
        b_high_item.filepath = cisgotimestamp + "/" + b_crown_high.protocol + "/" + b_crown_high.filename;
        b_high_item.sparkleprocessed = false;
        cloudant_data.addItemToCloudantDB(db, b_high_item).then(()=>{
        }).catch((e)=>{ 
            console.log(e)
            //reject(e)
        })
        
        await sleep(1000);
        var b_low_item = new Object();
        b_low_item.bucketname = CISGOIMAGES;
        b_low_item.cisgotimestamp = cisgotimestamp;
        b_low_item.cisgousername = cisgouser;
        b_low_item.cisgodevice = cisgodevice;
        b_low_item.controlnumber = controlnumber;
        b_low_item.protocol = b_crown_low.protocol;
        b_low_item.filepath = cisgotimestamp + "/" + b_crown_low.protocol + "/" + b_crown_low.filename;
        b_low_item.sparkleprocessed = false;
        cloudant_data.addItemToCloudantDB(db, b_low_item).then(()=>{
            runsparkleprocessing(controlnumber, cisgotimestamp).then(()=>{
            resolve(controlnumber)
        }).catch((e)=>{ 
            console.log(e)
            resolve(controlnumber)
            //reject(e)
        })
        
    }).catch((e)=>{
        //reject(e)
        console.log(e)
    });

    });
}

// Web APIs
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;
router.get('/appid/callback', passport.authenticate(WebAppStrategy.STRATEGY_NAME));

router.get('/api/user', (req, res) => {
    res.json({
        user: {
            name: req.user.name
        }
    });
});

router.get('/api/logout', function(req, res) {
    WebAppStrategy.logout(req);
    res.redirect('https://us-south.appid.cloud.ibm.com/oauth/v4/153281e8-9e03-40ec-93a1-0e5b2be7ef68')
});

router.post('/api/runclaritytraining', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    upload.array('files'), (req, res) => {
    
        if (req.files == undefined) {
            res.write("Invalid Input!")
            res.end()
            return
        }
        
        var bucketname = SPARKLETRAININGCLARITY
        var testfile = undefined
        var trainingfile = undefined
        var trainingtimestamp = new Date(new Date().toUTCString()).toISOString();
        var spe = req.body.spe;
        var epocs = req.body.epocs;
        var promises = [];

        for (var i = 0; i < req.files.length; i++) {
            var filename = req.files[i].originalname;
            var filebody = req.files[i].buffer;
            if (filename.toLowerCase().includes('test')) {
                testfile = filename
                promises.push(s3_data.addTrainingToStorage(bucketname, trainingtimestamp, testfile, filebody))
            } 
            if (filename.toLowerCase().includes('training')) {
                trainingfile = filename
                promises.push(s3_data.addTrainingToStorage(bucketname, trainingtimestamp, trainingfile, filebody))
            }
        }

        if (testfile == undefined || trainingfile == undefined) {
            res.write("Invalid Input!")
            res.end()
            return
        }

        Promise.all(promises)    
        .then(() => { 
                var trainingitem = new Object();
                trainingitem.bucketname = bucketname;
                trainingitem.testfile = testfile;
                trainingitem.trainingfile = trainingfile;
                trainingitem.trainingtimestamp = trainingtimestamp;
                trainingitem.epocs = epocs;
                trainingitem.spe = spe;
                cloudant_data.addItemToCloudantDB(db, trainingitem).then(()=>{
                    runtraining(trainingitem, "clarity").then(()=>{
                        res.write("Success");
                        res.end();
                    }).catch((e)=>{
                        res.write(`ERROR: ${e.code} - ${e.message}\n`);
                        res.end();
                    })
                }).catch((e) => {
                    res.write(`ERROR: ${e.code} - ${e.message}\n`);
                    res.end();
                })
        })
        .catch((e) => { 
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        });   
    }
   
);

router.post('/api/runinclusiontraining', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    upload.array('files'), (req, res) => {
    
        if (req.files == undefined) {
            res.write("Invalid Input!")
            res.end()
            return
        }

        var bucketname = SPARKLETRAININGINCLUSIONS
        var testfile = undefined
        var trainingfile = undefined
        var trainingtimestamp = new Date(new Date().toUTCString()).toISOString();
        var promises = [];

        for (var i = 0; i < req.files.length; i++) {
            var filename = req.files[i].originalname;
            var filebody = req.files[i].buffer;
            if (filename.toLowerCase().includes('test')) {
                testfile = filename
                promises.push(s3_data.addTrainingToStorage(bucketname, trainingtimestamp, testfile, filebody))
            } 
            if (filename.toLowerCase().includes('training')) {
                trainingfile = filename
                promises.push(s3_data.addTrainingToStorage(bucketname, trainingtimestamp, trainingfile, filebody))
            }
        }

        if (testfile == undefined || trainingfile == undefined) {
            res.write("Invalid Input!")
            res.end()
            return
        }

        Promise.all(promises)    
        .then(() => { 
                var trainingitem = new Object();
                trainingitem.bucketname = bucketname;
                trainingitem.testfile = testfile;
                trainingitem.trainingfile = trainingfile;
                trainingitem.trainingtimestamp = trainingtimestamp;
                trainingitem.epocs = epocs;
                trainingitem.spe = spe;
                cloudant_data.addItemToCloudantDB(db, trainingitem).then(()=>{
                    runtraining(trainingtimestamp, "inclusions").then(()=>{
                        res.write("Success");
                        res.end();
                    }).catch((e)=>{
                        res.write(`ERROR: ${e.code} - ${e.message}\n`);
                        res.end();
                    })
                }).catch((e) => {
                    res.write(`ERROR: ${e.code} - ${e.message}\n`);
                    res.end();
                })
        })
        .catch((e) => { 
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        });   
    }
   
);

router.get('/api/getsparklepipelinestatus',
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {        
        var item = new Object();
        item.rows = sparklepipelinelogs
        res.json(item);
        res.end();
        sparklepipelinelogs = []
    }
);

router.get('/api/getsparkletrainingstatus',
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {        
        var item = new Object();
        item.rows = sparkletraininglogs
        res.json(item);
        res.end();
        sparkletraininglogs = []
    }
);


router.post('/api/setitemcontents', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    upload.single('file'), async (req, res) => {

    if (req.body == undefined || req.body.control == undefined || req.body.control.length <= 0) {
        res.write("Invalid Input!")
        res.end()
        return
    }

    if (req.file == undefined) {
        res.write("Invalid Input!")
        res.end()
        return
    }

    var controlnumber = req.body.control;
    var cisgotimestamp = new Date(new Date().toUTCString()).toISOString();
    var cisgouser = req.body.cisgouser;
    var cisgodevice = req.body.cisgodevice;

    var filebody = req.file.buffer;
    var zip = new AdmZip(filebody);
    var zipEntries = zip.getEntries();
    
    var filemap = new Map()
    
    for (var i = 0; i < zipEntries.length; i++) {
        var data = zipEntries[i].getData();
        var entryname = path.basename(zipEntries[i].entryName);
        if (entryname != '__MACOSX') {
            var ext = entryname.split('.').pop()
            if (ext == "jpg" || ext == "jpeg") {
                
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
        res.write('Invalid input: A Crown Wireframe not found!');
        res.end();
        return
    }
    if (filemap.get('b_crown_low') === undefined) {
        res.write('Invalid input: B Crown Low not found!');
        res.end();
        return
    }
    if (filemap.get('b_crown_high') === undefined) {
        res.write('Invalid input: B Crown High not found!');
        res.end();
        return
    }

    await processrequests(filemap, controlnumber, cisgotimestamp, cisgouser, cisgodevice).then((controlnumbers)=>{
        res.write(controlnumber);
        res.end();
    }).catch((e)=>{
        res.write(`ERROR: ${e.code} - ${e.message}\n`);
        res.end();
    })
});

router.get('/api/deleteitem', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var docid = req.query.id;
        var bucketname = req.query.bucketname;
        var filepath = req.query.filepath;
        cloudant_data.removeItemByIdFromCloudantDB(db, docid).then(() => {
            s3_data.removeItemFromStorage(bucketname, filepath).then(()=>{
                res.write("success");
                res.end();
            })
            .catch((e) => {
                res.write(`ERROR: ${e.code} - ${e.message}\n`);
                res.end();
            });
        }).catch((e)=>{
            console.log(e)
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/deletedbitem', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var docid = req.query.id;
        cloudant_data.removeItemByIdFromCloudantDB(db, docid).then(() => {
            res.write("success");
            res.end();
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/getclaritytraininguploads', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {  
        cloudant_data.getTrainingItems(db).then((rows) =>{
            var trows = []
            for (var i = 0; i < rows.length; i++) {
                rows[i].value.trainingfile = "<a href='/api/gettrainingfile?bucketname=" + SPARKLETRAININGCLARITY + "&contenttype=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&filepath=" + rows[i].value.trainingtimestamp + "/" + rows[i].value.trainingfile + "'>" + rows[i].value.trainingfile + "</a>"
                rows[i].value.testfile = "<a href='/api/gettrainingfile?bucketname=" + SPARKLETRAININGCLARITY + "&contenttype=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&filepath=" + rows[i].value.trainingtimestamp + "/" + rows[i].value.testfile + "'>" + rows[i].value.testfile + "</a>"            
                if (rows[i].value.confusionmatrix != undefined) {
                    rows[i].value.completed = 'Yes'
                } else {
                    rows[i].value.completed = 'No'
                }
                trows.push(rows[i])
            }
            var item = new Object();
            item.rows = trows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/getclaritytrainingresults', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {  
        cloudant_data.getTrainingItems(db).then((rows) =>{
            var trows = []
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].value.confusionmatrix != undefined) {
                    rows[i].value.trainingfile = "<a href='/api/gettrainingfile?bucketname=" + SPARKLETRAININGCLARITY + "&contenttype=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&filepath=" + rows[i].value.trainingtimestamp + "/" + rows[i].value.trainingfile + "'>" + rows[i].value.trainingfile + "</a>"
                    rows[i].value.testfile = "<a href='/api/gettrainingfile?bucketname=" + SPARKLETRAININGCLARITY + "&contenttype=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&filepath=" + rows[i].value.trainingtimestamp + "/" + rows[i].value.testfile + "'>" + rows[i].value.testfile + "</a>"
                    rows[i].value.ensembletable = "<a href='/api/gettrainingfile?bucketname=" + SPARKLETRAININGCLARITY + "&contenttype=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&filepath=" + rows[i].value.trainingtimestamp + "/" + rows[i].value.ensembletable + "'>" + rows[i].value.ensembletable + "</a>"
                    rows[i].value.testsplitimages = "<a href='/api/gettrainingfile?bucketname=" + SPARKLETRAININGCLARITY + "&contenttype=application/zip&filepath=" + rows[i].value.trainingtimestamp + "/" + rows[i].value.testsplitimages + "'>" + rows[i].value.testsplitimages + "</a>"
                    rows[i].value.confusionmatrix = "<a href='/api/getobject?bucketname=" + SPARKLETRAININGCLARITY + "&filepath=" + rows[i].value.trainingtimestamp + "/" + rows[i].value.confusionmatrix + "'>" + rows[i].value.confusionmatrix + "</a>"
                    trows.push(rows[i])
                }
            }
            var item = new Object();
            item.rows = trows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/getinclusiontraininguploads', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {  
        cloudant_data.getInclusionTrainingItems(db).then((rows) =>{
            var trows = []
            for (var i = 0; i < rows.length; i++) {
                rows[i].value.trainingfile = "<a href='/api/gettrainingfile?bucketname=" + SPARKLETRAININGINCLUSIONS + "&contenttype=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&filepath=" + rows[i].value.trainingtimestamp + "/" + rows[i].value.trainingfile + "'>" + rows[i].value.trainingfile + "</a>"
                rows[i].value.testfile = "<a href='/api/gettrainingfile?bucketname=" + SPARKLETRAININGINCLUSIONS + "&contenttype=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&filepath=" + rows[i].value.trainingtimestamp + "/" + rows[i].value.testfile + "'>" + rows[i].value.testfile + "</a>"            
                if (rows[i].value.roc_ar != undefined) {
                    rows[i].value.completed = 'Yes'
                } else {
                    rows[i].value.completed = 'No'
                }
                trows.push(rows[i])
            }
            var item = new Object();
            item.rows = trows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/getinclusiontrainingresults', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {  
        cloudant_data.getInclusionTrainingItems(db).then((rows) =>{
            var trows = []
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].value.roc_ar != undefined) {
                    rows[i].value.trainingfile = "<a href='/api/gettrainingfile?bucketname=" + SPARKLETRAININGINCLUSIONS + "&contenttype=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&filepath=" + rows[i].value.trainingtimestamp + "/" + rows[i].value.trainingfile + "'>" + rows[i].value.trainingfile + "</a>"
                    rows[i].value.testfile = "<a href='/api/gettrainingfile?bucketname=" + SPARKLETRAININGINCLUSIONS + "&contenttype=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&filepath=" + rows[i].value.trainingtimestamp + "/" + rows[i].value.testfile + "'>" + rows[i].value.testfile + "</a>"
                    rows[i].value.roc_ar = "<a href='/api/getobject?bucketname=" + SPARKLETRAININGINCLUSIONS + "&filepath=" + rows[i].value.trainingtimestamp + "/" + encodeURIComponent(rows[i].value.roc_ar) + "'>" + rows[i].value.roc_ar + "</a>"
                    rows[i].value.roc_a = "<a href='/api/getobject?bucketname=" + SPARKLETRAININGINCLUSIONS + "&filepath=" + rows[i].value.trainingtimestamp + "/" + encodeURIComponent(rows[i].value.roc_a) + "'>" + rows[i].value.roc_a + "</a>"
                    rows[i].value.roc_r = "<a href='/api/getobject?bucketname=" + SPARKLETRAININGINCLUSIONS + "&filepath=" + rows[i].value.trainingtimestamp + "/" + encodeURIComponent(rows[i].value.roc_r) + "'>" + rows[i].value.roc_r + "</a>"
                    rows[i].value.test_images_zip = "<a href='/api/gettrainingfile?bucketname=" + SPARKLETRAININGINCLUSIONS + "&contenttype=application/zip&filepath=" + rows[i].value.trainingtimestamp + "/" + rows[i].value.test_images_zip + "'>" + rows[i].value.test_images_zip + "</a>"
                    trows.push(rows[i])
                }
            }
            var item = new Object();
            item.rows = trows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/getcisgoitems', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {  
        var controlnumber = req.query.controlnumber;
        cloudant_data.getCisgoCloudantItems(db, controlnumber).then((rows) =>{
            var crows = []
            for (var i = 0; i < rows.length; i++) {
                rows[i].value.fileanchor = "<a href='/api/getobject?bucketname=" + rows[i].value.bucketname + "&filepath=" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "'>" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "</a>"
                crows.push(rows[i]);    
            }
            var item = new Object();
            item.rows = crows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/getsparkletableitems', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {  
        var controlnumber = req.query.controlnumber;
        cloudant_data.getSparkleCloudantItems(db, controlnumber).then((rows) =>{
            var crows = []
            for (var i = 0; i < rows.length; i++) {
                rows[i].value.fileanchor = "<a href='/api/getobject?bucketname=" + rows[i].value.bucketname  + "&filepath=" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "'>" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "</a>"
                crows.push(rows[i]);    
            }
            var item = new Object();
            item.rows = crows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/getascitems', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {  
        var controlnumber = req.query.controlnumber;
        cloudant_data.getASCCloudantItems(db, controlnumber).then((rows) =>{
            var crows = []
            for (var i = 0; i < rows.length; i++) {
                var ctrlnumber = rows[i].value.controlnumber
                rows[i].value.fileanchor = "<a href='/api/getobject?bucketname=" + rows[i].value.bucketname  + "&filepath=" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "'>" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "</a>"
                crows.push(rows[i]);    
            }
            var item = new Object();
            item.rows = crows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/getplotitems',
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var controlnumber = req.query.controlnumber;
        cloudant_data.getPlotCloudantItems(db, controlnumber).then((rows) =>{
            var crows = []
            for (var i = 0; i < rows.length; i++) {
                rows[i].value.fileanchor = "<a href='/api/getobject?bucketname=" + rows[i].value.bucketname + "&filepath=" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "'>" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "</a>"
                crows.push(rows[i]);    
            }
            var item = new Object();
            item.rows = crows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/getgradeitems', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var controlnumber = req.query.controlnumber;
        cloudant_data.getGradeCloudantItems(db, controlnumber).then((rows) =>{
            var item = new Object();
            item.rows = rows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);


router.get('/api/getsparkletableitems',
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var controlnumber = req.query.controlnumber;
        cloudant_data.getSparkleCloudantItems(db, controlnumber).then((rows) =>{
            var item = new Object();
            item.rows = rows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/getreportitems', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var controlnumber = req.query.controlnumber;
        cloudant_data.getReportCloudantItems(db, controlnumber).then((rows) =>{
            var item = new Object();
            item.rows = rows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);


router.get('/api/getobject',
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var bucketname = req.query.bucketname
        var filepath = req.query.filepath;
        var fileext = filepath.split('.').pop();
        var contenttype = 'application/octet-stream';
        if (fileext.includes('png')) {
            contenttype = 'image/png'
        } else if (fileext.includes('jpg')) {
            contenttype = 'image/jpeg'
        } else if (fileext.includes('jpeg')) {
            contenttype = 'image/jpeg'
        } else if (fileext.includes('svg')) {
            contenttype = 'image/svg+xml'
        }  else if (fileext.includes('json')) {
            contenttype = 'text/plain'
        }  else if (fileext.includes('txt')) {
            contenttype = 'text/plain'
        }

        s3_data.getItemFromStorage(bucketname, filepath).then((data)=>{
            res.setHeader('Content-disposition', 'filename=' + filepath);
            res.writeHead(200, {'Content-Type': contenttype});
            res.write(data.Body, 'binary');
            res.end(null, 'binary');
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/gettrainingfile',
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var bucketname = req.query.bucketname
        var filepath = req.query.filepath;
        var contenttype = req.query.contenttype;
        s3_data.getItemFromStorage(bucketname, filepath).then((data)=>{
            res.setHeader('Content-disposition', 'attachment; filename=' + filepath);
            res.writeHead(200, {'Content-Type': contenttype});
            res.write(data.Body, 'binary');
            res.end(null, 'binary');
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

router.get('/api/gettrainingbaselist',
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var startdate = req.query.startdate
        var enddate = req.query.enddate;
        cloudant_data.getTrainingCloudantItems(db, startdate, enddate).then((map) => {

            var crows = []
            for (var [key, value] of map) {
                var plotitem = []
                plotitem.push(key);
                plotitem.push(value[0]);
                plotitem.push(value[1]);
                crows.push(plotitem);    
            }

            var ws_name = "Sheet1";
            var ws = xlsx.utils.aoa_to_sheet(crows);
            var wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, ws_name);
            var wbout = xlsx.write(wb, {bookType:'xlsx', bookSST:false, type:'array' });
            res.setHeader('Content-disposition', 'attachment; filename=test.xlsx');
            res.writeHead(200, {'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
            res.write(new Buffer.from(wbout), 'binary');
            res.end();
           
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);
router.get('/api/getgradelist',
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var startdate = req.query.startdate
        var enddate = req.query.enddate;
        cloudant_data.getGradeListCloudantItems(db, startdate, enddate).then((map) => {

            var crows = []
            crows.push(["Control Number", "Grade Timestamp", "Training ID", "GIA Grade", "Continuous Score", "A Score", "B Score", "C Score"])
            for (var [key, value] of map) {
                var gradeitem = []
                gradeitem.push(key);
                gradeitem.push(value[0]);
                gradeitem.push(value[1]);
                gradeitem.push(value[2]);
                gradeitem.push(value[3]);
                gradeitem.push(value[4]);
                gradeitem.push(value[5]);
                gradeitem.push(value[6]);
                crows.push(gradeitem);    
            }

            var ws_name = "Sheet1";
            var ws = xlsx.utils.aoa_to_sheet(crows);
            var wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, ws_name);
            var wbout = xlsx.write(wb, {bookType:'xlsx', bookSST:false, type:'array' });
            res.setHeader('Content-disposition', 'attachment; filename=test.xlsx');
            res.writeHead(200, {'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
            res.write(new Buffer.from(wbout), 'binary');
            res.end();
           
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);

module.exports = router;