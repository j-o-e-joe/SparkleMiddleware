const express = require('express');
const passport = require('passport');
const multer  = require('multer');
const request = require('request')
const s3_data = require('./s3_data');
const cloudant_data = require('./cloudant_data');
const config = require('./config');
const fs = require('fs');

const storage = multer.memoryStorage()
const upload = multer({ storage });

var db = cloudant_data.initDBConnection();
var router = express.Router();

// iPad APIs
const APIStrategy = require('ibmcloud-appid').APIStrategy;
var serverauth = config.getServerAuth2(fs.readFileSync("vcap-local.json", "utf-8"))
router.get('/api/getclaritygrade',
    passport.authenticate(APIStrategy.STRATEGY_NAME, {
        session: false
    }),
    function(req, res)  {

        var controlnumber = req.query.controlnumber;
        var cisgotimestamp = req.query.cisgotimestamp;
        var sparkletimestamp = req.query.sparkletimestamp;
        var plottimestamp = req.query.plottimestamp;

        var auth = "Basic " + new Buffer.from(serverauth.user + ":" + serverauth.password).toString("base64");
        request.debug = true

        const options = {
            url: serverauth.url + 'getclaritygrade?controlnumber='+ controlnumber 
            + '&cisgotimestamp=' + cisgotimestamp 
            + '&sparkletimestamp='+ sparkletimestamp
            + '&plottimestamp=' + plottimestamp, 
            headers: {
            'Authorization' : auth
            },
            agentOptions: {
                ca: fs.readFileSync('nginx-selfsigned.crt', {encoding: 'utf-8'}),
                checkServerIdentity: function (host, cert) {
                    return undefined;
                  }
            }
        };
        
        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                res.write(body);
                res.end();
            } else { 
                res.write('Error Received: ' + error);
                res.end();
            }
        }
        request(options, callback);
     }
);  

router.get('/api/getcisgoitems_processed',
	passport.authenticate(APIStrategy.STRATEGY_NAME, {
	    session: false
	}),
	function(req, res)  {
        cloudant_data.getGradeViewItems(db, req.query.controlnumber).then((obj)=>{
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
        var sparklemodel = req.body.sparklemodel;
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
            plotitem.sparklemodel = sparklemodel;
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
        s3_data.getItemFromStorage(bucketname, filepath).then((data)=>{
            res.writeHead(200, {'Content-Type': 'image/jpeg'});
            res.write(data.Body, 'binary');
            res.end(null, 'binary');
        }).catch((e)=>{
            res.write('ERROR: ${e.code} - ${e.message}\n');
            res.end();
        });
    }
);

module.exports = router;