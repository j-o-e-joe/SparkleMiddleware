const express = require('express');
const passport = require('passport');
const multer  = require('multer');
const AdmZip = require('adm-zip');
const s3_data = require('./s3_data');
const cloudant_data = require('./cloudant_data');
const path = require('path');
const storage = multer.memoryStorage()
const upload = multer({ storage });
const config = require('./config');
const fs = require('fs');

var db = cloudant_data.initDBConnection();
var router = express.Router();

const APIStrategy = require("ibmcloud-appid").APIStrategy;
var appid = config.getAppIDCutwiseCredentials(fs.readFileSync("vcap-local.json", "utf-8"));

passport.use(new APIStrategy({
	oauthServerUrl: appid.oauthServerUrl
}));
    

router.post('/api/uploadcutwise',
    passport.authenticate(APIStrategy.STRATEGY_NAME, {
        session: false
    }),	
    upload.single('file'), async (req, res) => {

    if (req.file == undefined) {
        res.status(400).send("Invalid or missing input file")
        return
    }

    var timestamp = new Date(new Date().toUTCString()).toISOString();

    var filebody = req.file.buffer;
    var zip = new AdmZip(filebody);
    var zipEntries = zip.getEntries();

    var promises = [];
    for (var i = 0; i < zipEntries.length; i++) {
        var data = zipEntries[i].getData();
     
        var entryname = path.basename(zipEntries[i].entryName);
        var components = entryname.split('_');
        if (components.length > 1) {
            var control = components[0]
            var filetype = components[1]
            if (components[0] == "GIA") {
                control = components[1];
                filetype = components.slice(2, components.length).join("_");
            } 

            if (filetype == "Position-1-Darkfield_ML-01.jpg") {
                var cutwise_item = new Object();
                cutwise_item.bucketname = "cutwiseuploads";
                cutwise_item.controlnumber = control
                cutwise_item.timestamp = timestamp
                cutwise_item.filepath = entryname;
                promises.push(cloudant_data.addItemToCloudantDB(db, cutwise_item))
                promises.push(s3_data.addCutwiseItemToStorage("cutwiseuploads", control + "/" + timestamp + "/" + entryname, data))
            } else if (filetype == "Position-1-Darkfield_ML-01-4.jpg") {
                var cutwise_item = new Object();
                cutwise_item.bucketname = "cutwiseuploads";
                cutwise_item.controlnumber = control
                cutwise_item.timestamp = timestamp
                cutwise_item.filepath = entryname;
                promises.push(cloudant_data.addItemToCloudantDB(db, cutwise_item))
                promises.push(s3_data.addCutwiseItemToStorage("cutwiseuploads", control + "/" + timestamp + "/" + entryname, data))
            }  else if (filetype == "Position-1-Chex1 Full-01-3Wireframe.jpg") {
                var cutwise_item = new Object();
                cutwise_item.bucketname = "cutwiseuploads";
                cutwise_item.controlnumber = control
                cutwise_item.timestamp = timestamp
                cutwise_item.filepath = entryname;
                promises.push(cloudant_data.addItemToCloudantDB(db, cutwise_item))
                promises.push(s3_data.addCutwiseItemToStorage("cutwiseuploads", control + "/" + timestamp + "/" + entryname, data))
            } else if (filetype == "Position-1-Chex1 Full-01-3.jpg") {
                var cutwise_item = new Object();
                cutwise_item.bucketname = "cutwiseuploads";
                cutwise_item.controlnumber = control
                cutwise_item.timestamp = timestamp
                cutwise_item.filepath = entryname;
                promises.push(cloudant_data.addItemToCloudantDB(db, cutwise_item))
                promises.push(s3_data.addCutwiseItemToStorage("cutwiseuploads", control + "/" + timestamp + "/" + entryname, data))
            } else if (filetype == "Position-1-ASET White ML-01.jpg") {
                var cutwise_item = new Object();
                cutwise_item.bucketname = "cutwiseuploads";
                cutwise_item.controlnumber = control
                cutwise_item.timestamp = timestamp
                cutwise_item.filepath = entryname;
                promises.push(cloudant_data.addItemToCloudantDB(db, cutwise_item))
                promises.push(s3_data.addCutwiseItemToStorage("cutwiseuploads", control + "/" + timestamp + "/" + entryname, data))
            } else if (filetype == "ML_Composite.jpg") {
                var cutwise_item = new Object();
                cutwise_item.bucketname = "cutwiseuploads";
                cutwise_item.controlnumber = control
                cutwise_item.timestamp = timestamp
                cutwise_item.filepath = entryname;
                promises.push(cloudant_data.addItemToCloudantDB(db, cutwise_item))
                promises.push(s3_data.addCutwiseItemToStorage("cutwiseuploads", control + "/" + timestamp + "/" + entryname, data))
            } else if (filetype == "Oriented.asc") {
                var cutwise_item = new Object();
                cutwise_item.bucketname = "cutwiseuploads";
                cutwise_item.controlnumber = control
                cutwise_item.timestamp = timestamp
                cutwise_item.filepath = entryname;
                promises.push(cloudant_data.addItemToCloudantDB(db, cutwise_item))
                promises.push(s3_data.addCutwiseItemToStorage("cutwiseuploads", control + "/" + timestamp + "/" + entryname, data))
            }
        }
    }
    Promise.all(promises)    
    .then(() => { 
        res.json({
            "code": 200,
            "type": "Response",
            "message": "Success"
          })
        res.end()
    }).catch((e)=>{
        res.status(500).send(`ERROR: ${e.code} - ${e.message}\n`);
        res.end()
    })
});

  

module.exports = router;