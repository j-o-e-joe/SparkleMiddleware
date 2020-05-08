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

// S3 Buckets 
const CUTWISEUPLOADS = process.env.CUTWISEUPLOADS

var db = cloudant_data.initDBConnection();
var router = express.Router();

const APIStrategy = require("ibmcloud-appid").APIStrategy;

passport.use(new APIStrategy({
	oauthServerUrl: config.getAppIDCutwiseOAuthServerUrl()
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

    var filebody = req.file.buffer;
    var zip = new AdmZip(filebody);
    var zipEntries = zip.getEntries();
    var timestamp = new Date(new Date().toUTCString()).toISOString();

    var filemap = new Map()
    var filedata = new Map()
    for (var i = 0; i < zipEntries.length; i++) {
        var data = zipEntries[i].getData();
        var entryname = path.basename(zipEntries[i].entryName);
        if (entryname != '__MACOSX') {
            if (!entryname.startsWith(".")) {
                var ext = entryname.split('.').pop()
                if (ext == "jpg" || ext == "jpeg") {
                    var components = entryname.split('_');
                    if (components.length > 1) {
                        var control = components[0]
                        var filetype = components.slice(1).join('_');
            
                        if (filetype == "ASET.jpg") {
                            var cutwise_item = new Object();
                            cutwise_item.bucketname = CUTWISEUPLOADS;
                            cutwise_item.controlnumber = control
                            cutwise_item.timestamp = timestamp
                            cutwise_item.filepath = entryname;
                            filedata.set('ASET', data);
                            filemap.set('ASET', cutwise_item);
                        } else if (filetype == "Top_White.jpg") {
                            var cutwise_item = new Object();
                            cutwise_item.bucketname = CUTWISEUPLOADS;
                            cutwise_item.controlnumber = control
                            cutwise_item.timestamp = timestamp
                            cutwise_item.filepath = entryname;
                            filedata.set('Top_White', data);
                            filemap.set('Top_White', cutwise_item);
                        } else if (filetype == "Top_White_Wireframe.jpg") {
                            var cutwise_item = new Object();
                            cutwise_item.bucketname = CUTWISEUPLOADS;
                            cutwise_item.controlnumber = control
                            cutwise_item.timestamp = timestamp
                            cutwise_item.filepath = entryname;
                            filedata.set('Top_White_Wireframe', data);
                            filemap.set('Top_White_Wireframe', cutwise_item);
                        } else if (filetype == "Wireframe.jpg") {
                            var cutwise_item = new Object();
                            cutwise_item.bucketname = CUTWISEUPLOADS;
                            cutwise_item.controlnumber = control
                            cutwise_item.timestamp = timestamp
                            cutwise_item.filepath = entryname;
                            filedata.set('Wireframe', data);
                            filemap.set('Wireframe', cutwise_item);
                        } else if (filetype == "DF-Low.jpg") {
                            var cutwise_item = new Object();
                            cutwise_item.bucketname = CUTWISEUPLOADS;
                            cutwise_item.controlnumber = control
                            cutwise_item.timestamp = timestamp
                            cutwise_item.filepath = entryname;
                            filedata.set('DF-Low', data);
                            filemap.set('DF-Low', cutwise_item);
                        } else if (filetype == "DF-High.jpg") {
                            var cutwise_item = new Object();
                            cutwise_item.bucketname = CUTWISEUPLOADS;
                            cutwise_item.controlnumber = control
                            cutwise_item.timestamp = timestamp
                            cutwise_item.filepath = entryname;
                            filedata.set('DF-High', data);
                            filemap.set('DF-High', cutwise_item);
                        } else if (filetype == "DF.jpg") {
                            var cutwise_item = new Object();
                            cutwise_item.bucketname = CUTWISEUPLOADS;
                            cutwise_item.controlnumber = control
                            cutwise_item.timestamp = timestamp
                            cutwise_item.filepath = entryname;
                            filedata.set('DF', data);
                            filemap.set('DF', cutwise_item);
                        }
                    }
                } else if (ext == "asc") {
                    var components = entryname.split('.');
                    if (components.length > 1) {
                        var control = components[0]
                        var cutwise_item = new Object();
                        cutwise_item.bucketname = CUTWISEUPLOADS;
                        cutwise_item.controlnumber = control
                        cutwise_item.timestamp = timestamp
                        cutwise_item.filepath = entryname;
                        filedata.set('ASC', data);
                        filemap.set('ASC', cutwise_item);
                    }
                }
            }
        }
    }

    var aset = filemap.get('ASET')
    if (aset === undefined) {
        res.status(400).send("ERROR: Missing ASET File");
        res.end()
        return
    }
    var top_white = filemap.get('Top_White')
    if (top_white === undefined) {
        res.status(400).send("ERROR: Missing Top_White File");
        res.end()
        return
    }
    var top_white_wireframe = filemap.get('Top_White_Wireframe')
    if (top_white_wireframe === undefined) {
        res.status(400).send("ERROR: Missing Top_White_Wireframe File");
        res.end()
        return
    }
    var wireframe = filemap.get('Wireframe') 
    if (wireframe === undefined) {
        res.status(400).send("ERROR: Missing Wireframe File");
        res.end()
        return
    }
    var df_low = filemap.get('DF-Low')
    if (df_low === undefined) {
        res.status(400).send("ERROR: Missing DF-Low File");
        res.end()
        return
    }
    var df_high = filemap.get('DF-High')
    if (df_high === undefined) {
        res.status(400).send("ERROR: Missing DF-High File");
        res.end()
        return
    }
    var df = filemap.get('DF')
    if (df === undefined) {
        res.status(400).send("ERROR: Missing DF File");
        res.end()
        return
    }
    var asc = filemap.get('ASC')
    if (asc === undefined) {
        res.status(400).send("ERROR: Missing ASC File");
        res.end()
        return
    }


    var promises = []
    promises.push(cloudant_data.addItemToCloudantDB(db, aset))
    promises.push(s3_data.addCutwiseItemToStorage(CUTWISEUPLOADS, aset.controlnumber + "/" + aset.timestamp + "/" + aset.filepath,  filedata.get('ASET')))
    promises.push(cloudant_data.addItemToCloudantDB(db, top_white))
    promises.push(s3_data.addCutwiseItemToStorage(CUTWISEUPLOADS, top_white.controlnumber + "/" + top_white.timestamp + "/" + top_white.filepath, filedata.get('Top_White')))
    promises.push(cloudant_data.addItemToCloudantDB(db, top_white_wireframe))
    promises.push(s3_data.addCutwiseItemToStorage(CUTWISEUPLOADS, top_white_wireframe.controlnumber + "/" + top_white_wireframe.timestamp + "/" + top_white_wireframe.filepath, filedata.get('Top_White_Wireframe')))
    promises.push(cloudant_data.addItemToCloudantDB(db, wireframe))
    promises.push(s3_data.addCutwiseItemToStorage(CUTWISEUPLOADS, wireframe.controlnumber + "/" + wireframe.timestamp + "/" + wireframe.filepath, filedata.get('Wireframe')))
    promises.push(cloudant_data.addItemToCloudantDB(db, df_low))
    promises.push(s3_data.addCutwiseItemToStorage(CUTWISEUPLOADS, df_low.controlnumber + "/" + df_low.timestamp + "/" + df_low.filepath, filedata.get('DF-Low')))
    promises.push(cloudant_data.addItemToCloudantDB(db, df_high))
    promises.push(s3_data.addCutwiseItemToStorage(CUTWISEUPLOADS, df_high.controlnumber + "/" + df_high.timestamp + "/" + df_high.filepath, filedata.get('DF-High')))
    promises.push(cloudant_data.addItemToCloudantDB(db, df))
    promises.push(s3_data.addCutwiseItemToStorage(CUTWISEUPLOADS, df.controlnumber + "/" + df.timestamp + "/" + df.filepath, filedata.get('DF')))
    promises.push(cloudant_data.addItemToCloudantDB(db, asc))
    promises.push(s3_data.addCutwiseItemToStorage(CUTWISEUPLOADS, asc.controlnumber + "/" + asc.timestamp + "/" + asc.filepath, filedata.get('ASC')))
  
    Promise.all(promises)    
    .then(() => { 
        res.status(200).send("Success: Zip package uploaded successfully");
        res.end()
    }).catch((e)=>{
        res.status(500).send(`ERROR: ${e.code} - ${e.message}\n`);
        res.end()
    }) 
});

  

module.exports = router;