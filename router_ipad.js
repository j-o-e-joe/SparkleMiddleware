const express = require('express');
const passport = require('passport');
const multer  = require('multer');
const s3_data = require('./s3_data');
const cloudant_data = require('./cloudant_data');
const config = require('./config');
const fs = require('fs');
const storage = multer.memoryStorage()
const upload = multer({ storage });

// S3 Buckets 
const SPARKLETRAININGCLARITY = process.env.SPARKLETRAININGCLARITY

var db = cloudant_data.initDBConnection();
var router = express.Router();

// iPad APIs
const APIStrategy = require("ibmcloud-appid").APIStrategy;
passport.use(new APIStrategy({
    "oAuthServerUrl":  config.getAppIDOAuthServerUrl()  
}));

router.get('/api/getcisgoitems_processed',
	passport.authenticate(APIStrategy.STRATEGY_NAME, {
	    session: false
	}),
	function(req, res)  {
        cloudant_data.getPlotViewItems(db, req.query.controlnumber).then((obj)=>{
            res.json(obj);
            res.end(); 
        }).catch((e)=>{
            res.write('Error Received: ' + e);
            res.end();
        });
    }
);

router.get('/api/getwireframeitems_processed',
	passport.authenticate(APIStrategy.STRATEGY_NAME, {
	    session: false
	}),
	function(req, res)  {
        cloudant_data.getWireframeViewItems(db, req.query.controlnumber).then((obj)=>{
            res.json(obj);
            res.end(); 
        }).catch((e)=>{
            res.write('Error Received: ' + e);
            res.end();
        });
    }
);


router.get('/api/getgradeitems_bycontrolnumber',
     passport.authenticate(APIStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        cloudant_data.getLatestGradeItem(db, req.query.controlnumber).then((obj)=>{
            res.json(obj)
            res.end();
        }).catch((e)=>{
            res.write('Error Received: ' + e);
            res.end();
        });
    }
);

router.get('/api/getreportbycontrolid', 
    passport.authenticate(APIStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        cloudant_data.getReportViewItems(db, req.query.controlnumber).then((obj)=>{
            res.json(obj)
            res.end();
        }).catch((e)=>{
            res.write('Error Received: ' + e);
            res.end();
        });
    }
);

router.get('/api/getactiveclaritymodel', 
    passport.authenticate(APIStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        cloudant_data.getActiveClarityModel(db).then((obj)=>{
            res.json(obj)
            res.end();
        }).catch((e)=>{
            res.write('Error Received: ' + e);
            res.end();
        });
    }
);

router.get('/api/getclaritymodel',
    passport.authenticate(APIStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res) {
        var trainingid = req.query.modelid;
        var modelname = req.query.modelname
        console.log(trainingid)
        console.log(modelname)
        var filepath = trainingid + '/' + modelname;
        console.log(filepath)
        s3_data.getItemFromStorage(SPARKLETRAININGCLARITY, filepath).then((data)=>{
            res.setHeader('Content-disposition', 'attachment; filename=' + filepath);
            res.writeHead(200, {'Content-Type': 'application/octet-stream'});
            res.write(data.Body, 'binary');
            res.end(null, 'binary');
        }).catch((e)=>{
            res.write(`ERROR: ${e.code} - ${e.message}\n`);
            res.end();
        })
    }
);


router.post('/api/uploadreport',
    passport.authenticate(APIStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res)  {
        try {
            var jsondata = req.body;
            cloudant_data.addItemToCloudantDB(db, jsondata).then(()=>{
                res.write('New report success.');
                res.end();
            }).catch((e)=>{
                res.write('Error Received: ' + e);
                res.end();
            });
        } catch (err) {
            res.write('Error: Json data not formatted correctly! ' + err);
            res.end();
            return;
        }
    }
);

router.post('/api/uploadgrade',
    passport.authenticate(APIStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res)  {
        try {
            var jsondata = req.body;
            cloudant_data.addItemToCloudantDB(db, jsondata).then(()=>{
                res.write('New grade success.');
                res.end();
            }).catch((e)=>{
                res.write('Error Received: ' + e);
                res.end();
            });
        } catch (err) {
            res.write('Error: Json data not formatted correctly! ' + err);
            res.end();
        }
    }
);

router.post('/api/uploadsvg', 
    passport.authenticate(APIStrategy.STRATEGY_NAME, {
        session: false
    }),
    upload.single('file'), (req, res) => {

        var bucketname = req.body.bucketname;
        var controlnumber = req.body.controlnumber;
        var cisgotimestamp = req.body.cisgotimestamp;
        var sparkletabletimestamp =  req.body.sparkletabletimestamp;
        var wireframetimestamp = req.body.wireframetimestamp;
        var wireframedevice = req.body.wireframedevice;
        var wireframeusername = req.body.wireframeusername;
        var trainingid = req.body.trainingid;
        var filename = req.file.originalname;
        var filebody = req.file.buffer;
    
        s3_data.addWireframeToStorage(bucketname, controlnumber, wireframetimestamp, filename, filebody)
        .then(() => { 
            var wireframeitem = new Object();
            wireframeitem.bucketname = bucketname;
            wireframeitem.controlnumber = controlnumber;
            wireframeitem.cisgotimestamp = cisgotimestamp;
            wireframeitem.sparkletabletimestamp = sparkletabletimestamp;
            wireframeitem.wireframetimestamp = wireframetimestamp;
            wireframeitem.wireframedevice = wireframedevice;
            wireframeitem.wireframeusername = wireframeusername;
            wireframeitem.trainingid = trainingid;
            wireframeitem.filepath = wireframetimestamp + "/A_Crown_Wireframe/" + filename;
            cloudant_data.addItemToCloudantDB(db, wireframeitem).then(()=>{
                res.write('New Wireframe success.');
                res.end();
            }).catch((e)=>{
                res.write('Error Received: ' + e);
                res.end();
            });
        }).catch((e) => { 
            res.write('Error: Json data not formatted correctly! ' + err);
            res.end();
        }); 

    }
);

router.post('/api/uploadplot', 
    passport.authenticate(APIStrategy.STRATEGY_NAME, {
        session: false
    }),
    upload.single('file'), (req, res) => {

        var bucketname = req.body.bucketname;
        var controlnumber = req.body.controlnumber;
        var cisgotimestamp = req.body.cisgotimestamp;
        var sparkletabletimestamp =  req.body.sparkletabletimestamp;
        var plottimestamp = req.body.plottimestamp;
        var plotdevice = req.body.plotdevice;
        var plotusername = req.body.plotusername;
        var sparklegradeprocessed = req.body.sparklegradeprocessed;
        var trainingid = req.body.trainingid;
        var filename = req.file.originalname;
        var filebody = req.file.buffer;
    
        s3_data.addPlotToStorage(bucketname, controlnumber, plottimestamp, filename, filebody)
        .then(() => { 
            var plotitem = new Object();
            plotitem.bucketname = bucketname;
            plotitem.controlnumber = controlnumber;
            plotitem.cisgotimestamp = cisgotimestamp;
            plotitem.sparkletabletimestamp = sparkletabletimestamp;
            plotitem.plottimestamp = plottimestamp;
            plotitem.plotdevice = plotdevice;
            plotitem.plotusername = plotusername;
            plotitem.sparklegradeprocessed = sparklegradeprocessed;
            plotitem.trainingid = trainingid;
            plotitem.filepath = plottimestamp + "/" + filename;
            cloudant_data.addItemToCloudantDB(db, plotitem).then(()=>{
                res.write('New plot success.');
                res.end();
            }).catch((e)=>{
                res.write('Error Received: ' + e);
                res.end();
            });
        }).catch((e) => { 
            res.write('Error: Json data not formatted correctly! ' + err);
            res.end();
        }); 

    }
);

router.get('/api/getitemcontents',
	passport.authenticate(APIStrategy.STRATEGY_NAME, {
	    session: false
    }),
    function(req, res)  {
        var bucketname = req.query.bucketname;
        var foldername = req.query.foldername;
        var itemname = req.query.itemname;
        var filepath = foldername + '/' + itemname;

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
            res.write('ERROR: ${e.code} - ${e.message}\n');
            res.end();
        });
    }
);

module.exports = router;