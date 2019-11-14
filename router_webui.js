const express = require('express');
const passport = require('passport');
const multer  = require('multer');
const AdmZip = require('adm-zip');
const request = require('request')
const s3_data = require('./s3_data');
const cloudant_data = require('./cloudant_data');
const config = require('./config');
const fs = require('fs');
const path = require('path');

const storage = multer.memoryStorage()
const upload = multer({ storage });

var db = cloudant_data.initDBConnection();
var router = express.Router();

function additemtodatastore(bucketname, cisgouser, cisgodevice, cisgotimestamp, fileitem) {
    return new Promise((resolve, reject)=>{
        s3_data.addItemToStorage(bucketname, cisgotimestamp, fileitem.controlnumber, fileitem.protocol, fileitem.filename, fileitem.data)
        .then(() => { 
            var cisgoitem = new Object();
            cisgoitem.bucketname = bucketname;
            cisgoitem.cisgotimestamp = cisgotimestamp;
            cisgoitem.cisgousername = cisgouser;
            cisgoitem.cisgodevice = cisgodevice;
            cisgoitem.controlnumber = fileitem.controlnumber;
            cisgoitem.protocol = fileitem.protocol;
            cisgoitem.filepath = cisgotimestamp + "/" + fileitem.protocol + "/" + fileitem.filename;
            cisgoitem.sparkleprocessed = false;
            cloudant_data.addItemToCloudantDB(db, cisgoitem).then(()=>{
                resolve()
            }).catch((e)=>{
                console.log(e)
                reject(e)
            });
        }).catch((e) => { 
            console.log(e)
            reject(e)
        }); 
    })
}

var serverauth = config.getServerAuth(fs.readFileSync("vcap-local.json", "utf-8"))
function runsparkleprocessing(controlnumber, cisgotimestamp) {
    return new Promise((resolve, reject)=>{
        var auth = "Basic " + new Buffer.from(serverauth.user + ":" + serverauth.password).toString("base64");
        const options = {
            url: serverauth.url + 'runsparkleprocessing?controlnumber='+ controlnumber 
            + '&cisgotimestamp=' + cisgotimestamp,
            headers: {
            'Authorization' : auth
            },
            agentOptions: {
                ca: fs.readFileSync('nginx-selfsigned-2.crt', {encoding: 'utf-8'}),
                checkServerIdentity: function (host, cert) {
                    return undefined;
                }
            }
        };
        
        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(body);
            } else { 
                reject(error);
            }
        }
        request(options, callback)
    });
}
async function processrequests(filemap, cisgouser, cisgodevice, cisgotimestamp) {
    return new Promise(async (resolve, reject)=>{
        var sparklecloudantpromises = []
        var controlnumbers = []
        for (var [key, value] of filemap) {
            if (value.length != 3) {
                reject(new Error("Invalid Input!"))
                return;
            }

            controlnumbers.push(value[0].controlnumber)
            await additemtodatastore("cisgo", cisgouser, cisgodevice, cisgotimestamp, value[0]).then(()=>{}).catch((e)=>{
                reject(e)
                return
            });
            await additemtodatastore("cisgo", cisgouser, cisgodevice, cisgotimestamp, value[1]).then(()=>{}).catch((e)=>{
                reject(e)
                return
            });
            await additemtodatastore("cisgo", cisgouser, cisgodevice, cisgotimestamp, value[2]).then(()=>{}).catch((e)=>{
                reject(e)
                return
            });
            sparklecloudantpromises.push(runsparkleprocessing(value[0].controlnumber, cisgotimestamp));
        }
        
        Promise.all(sparklecloudantpromises).then(()=>{
            resolve(controlnumbers)
        }).catch((e)=>{
            reject(e)
        })
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

router.get('/appid/logout', function(req, res) {
    WebAppStrategy.logout(req);
    res.redirect('https://us-south.appid.cloud.ibm.com/oauth/v4/153281e8-9e03-40ec-93a1-0e5b2be7ef68')
});

router.post('/api/setitemcontents', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    upload.single('file'), async (req, res) => {
    
    if (req.file == undefined) {
        res.write("Invalid Input!")
        res.end()
        return
    }

    var cisgouser = req.body.cisgouser;
    var cisgodevice = req.body.cisgodevice;
    var filebody = req.file.buffer;
    var cisgotimestamp = new Date(new Date().toUTCString()).toISOString();
   
    var zip = new AdmZip(filebody);
    var zipEntries = zip.getEntries();
    
    var filemap = new Map()
    
    for (var i = 0; i < zipEntries.length; i++) {
        var data = zipEntries[i].getData();
        var entryname = path.basename(zipEntries[i].entryName);
        if (entryname != '__MACOSX') {
            var ext = entryname.split('.').pop()
            if(ext == "jpg" || ext == "jpeg") {
                
                var components = entryname.split('_');
                if (components.length > 2) {
                    var fileitem = new Object();
                    fileitem.controlnumber = components[0];
                    if (components[1] === "A") {
                        fileitem.protocol = "A_Crown_Wireframe" 
                    } else if (components[1] === "B") {
                        fileitem.protocol = "B_Crown_Clarity" 
                    } else {
                        continue;
                    }

                    fileitem.filename = entryname
                    fileitem.data = data;
                    var array = filemap.get(components[0])
                    if (array == null) {
                        array = [fileitem]
                    } else {
                        array.push(fileitem)
                    }
                    filemap.set(components[0], array);
                }
            } 
        }
    }
    await processrequests(filemap, cisgouser, cisgodevice, cisgotimestamp).then((controlnumbers)=>{
        res.write(controlnumbers.join(','));
        res.end();
    }).catch((e)=>{
        res.write(`ERROR: ${e.code} - ${e.message}\n`);
        res.end();
    })
});


router.get('/api/reprocesscisgoitem', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var controlnumber = req.query.controlnumber;
        var sparklecloudantpromises = []
        var sparklefilepaths = []
        cloudant_data.getSparkleCloudantItems(db, controlnumber).then((rows) =>{
            for (var i = 0; i < rows.length; i++) {
                var docid = rows[i].value._id
                var fpath = controlnumber + '/' + rows[i].value.filepath
                console.log(fpath)
                sparklefilepaths.push( { "Key": fpath })
                sparklecloudantpromises.push(cloudant_data.removeItemByIdFromCloudantDB(db, docid))
            }
        }).catch((e)=>{
            res.write('ERROR: ${e.code} - ${e.message}\n');
            res.end();
        })

        Promise.all(sparklecloudantpromises).then(()=>{
            s3_data.removeItemsFromStorage("sparkletableprocessing", sparklefilepaths).then(()=>{
                console.log("success")
                res.write("success");
                res.end();
            }).catch((e)=>{
                console.log(e)
                res.write('ERROR: ${e.code} - ${e.message}\n');
                res.end();
            })
        }).catch((e)=>{
            console.log(e)
            res.write('ERROR: ${e.code} - ${e.message}\n');
            res.end();
        })
    }
);

router.get('/api/deleteitem', 
    passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var docid = req.query.id;
        var bucketname = req.query.bucketname;
        var filepath = req.query.filepath;
        cloudant_data.removeItemByIdFromCloudantDB(db, docid).then(() => {
            console.log(filepath)
            s3_data.removeItemFromStorage(bucketname, filepath).then(()=>{
                res.write("success");
                res.end();
            })
            .catch((e) => {
                console.log(e)
                res.write('ERROR: ${e.code} - ${e.message}\n');
                res.end();
            });
        }).catch((e)=>{
            console.log(e)
            res.write('ERROR: ${e.code} - ${e.message}\n');
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
            res.write('ERROR: ${e.code} - ${e.message}\n');
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
                var ctrlnumber = rows[i].value.controlnumber
                var v = crows.find(e => e.value.controlnumber === ctrlnumber);
                if (v) {
                    v.value.sparkleprocessed += '<br/>' + rows[i].value.sparkleprocessed;
                    v.value.protocol += '<br/>' + rows[i].value.protocol;
                    v.value.fileanchor += "<br/><a href='/api/getobject?bucketname=cisgo&filepath=" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "'>" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "</a>"
                } else {
                    rows[i].value.fileanchor = "<a href='/api/getobject?bucketname=cisgo&filepath=" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "'>" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "</a>"
                    crows.push(rows[i]);    
                }
            }
            var item = new Object();
            item.rows = crows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write('ERROR: ${e.code} - ${e.message}\n');
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
                rows[i].value.fileanchor = "<a href='/api/getobject?bucketname=csplots&filepath=" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "'>" + rows[i].value.controlnumber + "/" + rows[i].value.filepath + "</a>"
                crows.push(rows[i]);    
            }
            var item = new Object();
            item.rows = crows
            res.json(item);
            res.end();
        }).catch((e)=>{
            res.write('ERROR: ${e.code} - ${e.message}\n');
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
            res.write('ERROR: ${e.code} - ${e.message}\n');
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
            res.write('ERROR: ${e.code} - ${e.message}\n');
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
        s3_data.getItemFromStorage(bucketname, filepath).then((data)=>{
            res.writeHead(200, {'Content-Type': 'image/jpeg'});
            res.write(data.Body, 'binary');
            res.end(null, 'binary');
        }).catch((e)=>{
            res.write('ERROR: ${e.code} - ${e.message}\n');
            res.end();
        })
    }
);

module.exports = router;