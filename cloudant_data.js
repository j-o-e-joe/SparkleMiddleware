const config = require('./config');
const fs = require('fs');
const dbCredentials = {
    dbName: 'sparkle_db'
}

module.exports = {
    initDBConnection: function() {
        if (process.env.VCAP_SERVICES) {
            dbCredentials.url = config.getDBCredentialsUrl(process.env.VCAP_SERVICES);
        } else { 
        dbCredentials.url = config.getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
        }
        var cloudant = require('cloudant')(dbCredentials.url);
        cloudant.db.create(dbCredentials.dbName, function(err, res) {
            if (err) {
                console.log("Error here: " + err);
                console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.');
            } else {
                console.log("creating design document")
                var design = {
                     "_id": "_design/all",
                     "views": {
                      "cisgoitems_processed": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.cisgotimestamp && doc.sparkleprocessed == true && doc.bucketname === \"cisgoimages\") {\n    emit([doc.controlnumber, doc.cisgotimestamp], doc);\n  }\n}"
                      },
                      "sparkletableitems": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.bucketname === \"sparkletabledata\") {\n    emit(doc.controlnumber, doc);\n  }\n}"
                      },
                      "plotitems": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.bucketname === \"sparkleplots\") {\n    emit(doc.controlnumber, doc);\n  }\n}"
                      },
                      "gradeitems": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.continuous_grade) {\n    emit(doc.controlnumber, doc);\n  }\n}"
                      },
                      "cisgoitems_notprocessed": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.sparkleprocessed == false) {\n    emit([doc.controlnumber, doc.cisgotimestamp, doc._id], doc);\n  }\n}"
                      },
                      "cisgoitems": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.bucketname == \"cisgoimages\") {\n    emit(doc.controlnumber, doc);\n  }\n}"
                      },
                      "reportitems": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.report) {\n    emit(doc.controlnumber, doc);\n  }\n}"
                      },
                      "sparkletableitems_batch": {
                       "map": "function (doc) {\n  if (doc.bucketname === \"sparkletabledata\" && doc.sparklemodel === \"2019-11-21T13:50:03.221926\") {\n    emit(doc.controlnumber, doc);\n  }\n}"
                      },
                      "plotitems_batch": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.bucketname === \"sparkleplots\" && doc.plotusername == 'gia') {\n    emit(doc.controlnumber, doc);\n  }\n}"
                      },
                      "cisgoitems_batch": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.sparkleprocessed == false && doc.cisgousername == 'gia') {\n      emit([doc.controlnumber, doc.cisgotimestamp, doc._id], doc);\n  }\n}"
                      },
                      "sparkletrainingitems": {
                       "map": "function (doc) {\n  if (doc.bucketname === \"sparkletrainingclarity\") {\n    emit(doc.trainingtimestamp, doc);\n  }\n}"
                      },
                      "plot_timestamp_items": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.bucketname === \"sparkleplots\") {\n    emit(doc.plottimestamp, doc.controlnumber);\n  }\n}"
                      },
                      "sparkletrainingjobs": {
                       "map": "function (doc) {\n  if (doc.trainingid) {\n    emit(doc.trainingid, doc);\n  }\n}"
                      },
                      "sparkleinclusiontrainingitems": {
                       "map": "function (doc) {\n  if (doc.bucketname === \"sparkletraininginclusions\") {\n    emit(doc.trainingtimestamp, doc);\n  }\n}"
                      },
                      "cisgoitems_asc": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.bucketname == \"heliumuploads\") {\n    emit([doc.controlnumber, doc.cisgotimestamp], doc);\n  }\n}"
                      },
                      "cisgoitems_asc_aligned": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.bucketname == \"heliumwireframes\") {\n    emit([doc.controlnumber, doc.cisgotimestamp], doc);\n  }\n}"
                      },
                      "cutwiseitems": {
                       "map": "function (doc) {\n  if (doc.controlnumber && doc.bucketname == \"cutwisedata\") {\n    emit(doc.controlnumber, doc);\n  }\n}"
                      }
                     },
                     "indexes": {
                      "cisgo_by_controlnumber": {
                       "analyzer": "standard",
                       "index": "function (doc) {\n  if (doc.controlnumber && doc.bucketname == \"cisgoimages\") {\n    index(\"controlnumber\", doc.controlnumber, {store:true});\n  }\n}"
                      },
                      "sparkle_by_controlnumber": {
                       "analyzer": "standard",
                       "index": "function (doc) {\n  if (doc.controlnumber && doc.bucketname === \"sparkletabledata\") {\n    index(\"controlnumber\", doc.controlnumber, {store:true});\n  }\n}"
                      },
                      "plot_by_controlnumber": {
                       "analyzer": "standard",
                       "index": "function (doc) {\n  if (doc.controlnumber && doc.bucketname === \"sparkleplots\") {\n    index(\"controlnumber\", doc.controlnumber, {store:true});\n  }\n}"
                      },
                      "grade_by_controlnumber": {
                       "analyzer": "standard",
                       "index": "function (doc) {\n  if (doc.controlnumber && doc.continuous_grade) {\n    index(\"controlnumber\", doc.controlnumber, {store:true});\n  }\n}"
                      },
                      "report_by_controlnumber": {
                       "analyzer": "standard",
                       "index": "function (doc) {\n  if (doc.controlnumber && doc.report) {\n    index(\"controlnumber\", doc.controlnumber, {store:true});\n  }\n}"
                      },
                      "training_by_timestamp": {
                       "analyzer": "standard",
                       "index": "function (doc) {\n  if (doc.trainingtimestamp && doc.bucketname === \"sparkletraining\") {\n    index(\"trainingtimestamp\", doc.trainingtimestamp, {store:true});\n  }\n}"
                      },
                      "inclusion_training_by_timestamp": {
                       "analyzer": "standard",
                       "index": "function (doc) {\n  if (doc.trainingtimestamp && doc.bucketname === \"sparkletraininginclusions\") {\n    index(\"trainingtimestamp\", doc.trainingtimestamp, {store:true});\n  }\n}"
                      },
                      "asc_by_controlnumber": {
                       "analyzer": "standard",
                       "index": "function (doc) {\n  if (doc.controlnumber && doc.bucketname == \"heliumuploads\") {\n    index(\"controlnumber\", doc.controlnumber, {store:true});\n  }\n}"
                      },
                      "plot_by_timestamp": {
                       "analyzer": "standard",
                       "index": "function (doc) {\n  if (doc.controlnumber && doc.bucketname === \"sparkleplots\") {\n    index(\"plottimestamp\", doc.plottimestamp, {store:true});\n  }\n}"
                      },
                      "plot_by_username": {
                       "analyzer": "standard",
                       "index": "function (doc) {\n  if (doc.controlnumber && doc.bucketname === \"sparkleplots\") {\n    index(\"plotusername\", doc.plotusername, {store:true});\n  }\n}"
                      },
                      "asc_aligned_by_controlnumber": {
                       "analyzer": "standard",
                       "index": "function (doc) {\n  if (doc.controlnumber && doc.bucketname == \"heliumwireframes\") {\n    index(\"controlnumber\", doc.controlnumber, {store:true});\n  }\n}"
                      },
                      "cisgo_by_timestamp": {
                       "analyzer": "standard",
                       "index": "function (doc) {\n  if (doc.cisgotimestamp && doc.bucketname == \"cisgoimages\") {\n    index(\"cisgotimestamp\", doc.cisgotimestamp, {store:true});\n  }\n}"
                      }
                     }
                }

                try {
                    cloudant.use(dbCredentials.dbName).insert(design, function(err, body, header) {      
                        if (err) {
                            console.log("Error inserting the design document: " + err);
                        } 
                        console.log(body)
                    });
                } catch (err) {
                    console.log("Error inserting design document: " + err);
                }

            }
        });
        return cloudant.use(dbCredentials.dbName);
    },
    addItemToCloudantDB: function(db, jsondata) {
        return new Promise((resolve, reject)=>{
            try {
                db.insert(jsondata, new Date().toISOString(), function(err, body, header) {      
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } catch (err) {
               reject(err)
            }
        })
    },
    removeItemByIdFromCloudantDB: function(db, docid) {
        return new Promise((resolve, reject)=>{
            db.get(docid, function(err, doc) {
                if (err) {
                    reject(err);
                } else {
                    db.destroy(doc._id, doc._rev, function(err, doc) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }
            });
        });
    }, 
    getTrainingItems: function(db) {
        return new Promise((resolve, reject)=>{
            db.view('all', 'sparkletrainingitems', 
            {'include_docs': true},
            function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    var rows = []
                    for (var i = 0; i < data.rows.length; i++) {
                        rows.push({value: data.rows[i].value});    
                    }
                    resolve(rows)
                }
            });  
        });
    },
    getInclusionTrainingItems: function(db) {
        return new Promise((resolve, reject)=>{
            db.view('all', 'sparkleinclusiontrainingitems', 
            {'include_docs': true},
            function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    var rows = []
                    for (var i = 0; i < data.rows.length; i++) {
                        rows.push({value: data.rows[i].value});    
                    }
                    resolve(rows)
                }
            });  
        });
    },
    getCisgoCloudantItems: function(db, controlnumber) {
        return new Promise((resolve, reject)=>{
            db.search('all', 'cisgo_by_controlnumber', { 'include_docs': true, q: 'controlnumber:' + controlnumber + '*' }, function(err, result) {
                if (err) {
                    reject(err)
                } else {
                    var rows = []
                    for (var i = 0; i < result.rows.length; i++) {
                        rows.push({value: result.rows[i].doc});    
                    }
                    rows = rows.sort(function(a,b){
                        return new Date(b.value.cisgotimestamp) - new Date(a.value.cisgotimestamp);
                    });
                    resolve(rows)
                }
            });
        });
    },
    getASCCloudantItems: function(db, controlnumber) {
        return new Promise((resolve, reject)=>{
            db.search('all', 'asc_by_controlnumber', { 'include_docs': true, q: 'controlnumber:' + controlnumber + '*' }, function(err, result) {
                if (err) {
                    reject(err)
                } else {
                    var rows = []
                    for (var i = 0; i < result.rows.length; i++) {
                        rows.push({value: result.rows[i].doc});    
                    }
                    resolve(rows)
                }
            });
        });
    },
    getSparkleCloudantItems: function(db, controlnumber) {
        return new Promise((resolve, reject)=>{
            db.search('all', 'sparkle_by_controlnumber', { 'include_docs': true, q: 'controlnumber:' + controlnumber + '*' }, function(err, result) {
                if (err) {
                    reject(err)
                } else {
                    var rows = []
                    for (var i = 0; i < result.rows.length; i++) {
                        rows.push({value: result.rows[i].doc});    
                    }
                    rows = rows.sort(function(a,b){
                        return new Date(b.value.sparkletabletimestamp) - new Date(a.value.sparkletabletimestamp);
                    });
                    resolve(rows)
                }
            });
        });
    },
    getPlotCloudantItems: function(db, controlnumber) {
        return new Promise((resolve, reject)=>{
            db.search('all', 'plot_by_controlnumber', { 'include_docs': true, q: 'controlnumber:' + controlnumber + '*' }, function(err, result) {
                if (err) {
                    reject(err)
                } else {
                    var rows = []
                    for (var i = 0; i < result.rows.length; i++) {
                        rows.push({value: result.rows[i].doc});    
                    }
                    rows = rows.sort(function(a,b){
                        return new Date(b.value.plottimestamp) - new Date(a.value.plottimestamp);
                    });
                    resolve(rows)
                }
            });
        });
    },
    getGradeCloudantItems: function(db, controlnumber) {
        return new Promise((resolve, reject)=>{
            db.search('all', 'grade_by_controlnumber', { 'include_docs': true, q: 'controlnumber:' + controlnumber + '*' }, function(err, result) {
                if (err) {
                    reject(err)
                } else {
                    var rows = []
                    for (var i = 0; i < result.rows.length; i++) {
                        rows.push({value: result.rows[i].doc});    
                    }
                    rows = rows.sort(function(a,b){
                        return new Date(b.value.plottimestamp) - new Date(a.value.plottimestamp);
                    });
                    resolve(rows)
                }
            });
        });
    },
    getReportCloudantItems: function(db, controlnumber) {
        return new Promise((resolve, reject)=>{
            db.search('all', 'report_by_controlnumber', { 'include_docs': true, q: 'controlnumber:' + controlnumber + '*' }, function(err, result) {
                if (err) {
                    reject(err)
                } else {
                    var rows = []
                    for (var i = 0; i < result.rows.length; i++) {
                        rows.push({value: result.rows[i].doc});    
                    }
                    rows = rows.sort(function(a,b){
                        return new Date(b.value.plottimestamp) - new Date(a.value.plottimestamp);
                    });
                    resolve(rows)
                }
            });
        });
    },
    getTrainingSessions: function(db) {
        return new Promise((resolve, reject)=>{
 
            db.view('all', 'sparkletrainingjobs', {include_docs: true},
            function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    var rows = []
                    for (var i = 0; i < data.rows.length; i++) {
                        rows.push({value: data.rows[i].value});    
                    }
                    resolve(rows)
                }
            });  
        });
    },
    getTrainingCloudantItems: function(db, startdate, enddate) {
        return new Promise((resolve, reject)=>{
 
            var sdate = new Date(startdate);
            var edate = new Date(enddate);
            db.view('all', 'plot_timestamp_items', {include_docs: false},
            function (err, result) {
                if (err) {
                    console.log(err);
                    reject(err)
                } else {
                    var map = new Map()
                    for (var i = 0; i < result.rows.length; i++) {
                        var plotdate = result.rows[i].key
                        var ctrlnumber = result.rows[i].value
                        if (map.has(ctrlnumber)) {
                            var dnew = new Date(plotdate)
                            var dexisting = new Date(map.get(ctrlnumber))
                             if (dnew > dexisting) {
                                map.set(ctrlnumber, plotdate)
                            }
                        } else {
                            var cdate = new Date(plotdate)
                            if (cdate >= sdate && cdate <= edate) {
                                map.set(ctrlnumber, plotdate)
                            }
                        }
                    }
                    resolve(map);
                }
            });  
        });
    },
    getGradeViewItems: function(db, controlnumber) {
        return new Promise((resolve, reject)=>{
            db.view('all', 'gradeitems', 
            {'key': controlnumber},
            function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    var obj = {}
                    if (data.rows.length > 0) {
                        var value = data.rows[data.rows.length - 1].value;
                        obj = {"controlnumber": value.controlnumber,  "cisgotimestamp": value.cisgotimestamp, "sparkletabletimestamp": value.sparkletabletimestamp, "plottimestamp": value.plottimestamp};
                    }
                    resolve(obj);
                }
            });  
        });
    },
    getLatestGradeItem: function(db, controlnumber) {
        return new Promise((resolve, reject)=>{
            db.view('all', 'gradeitems', 
            {'include_docs': true,
            'key': controlnumber },
            function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    var item = new Object();
                    if (data.rows.length > 0) {
                        var value = data.rows[data.rows.length - 1].value;
                        var item = new Object();
                        item.controlnumber = value.controlnumber
                        item.cisgotimestamp= value.cisgotimestamp
                        item.sparkletabletimestamp= value.sparkletabletimestamp
                        item.plottimestamp = value.plottimestamp
                        item.gradetimestap = value.gradetimestap
                        item.user = value.user
                        item.gia_grade = value.gia_grade
                        item.continuous_grade = value.continuous_grade
                        item.high_clarity = value.high_clarity
                        item.vs1 = value.vs1
                        item.vs2 = value.vs2
                        item.si1 = value.si1
                        item.si2 = value.si2
                        item.i1 = value.i1
                        item.i2 = value.i2
                        item.i3 = value.i3
                    }
                    resolve(item)
                }
            });
        });
    },
    getReportViewItems: function(db, controlnumber) {
        return new Promise((resolve, reject)=>{
            db.view('all', 'reportitems', 
            {'include_docs': true,
             'key': controlnumber },
            function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    var item = new Object();
                    if (data.rows.length > 0) {
                        var value = data.rows[data.rows.length - 1].value;
                        var item = new Object();
                        item.clarity = value.clarity;
                        item.color =  value.color;
                        item.comments =  value.comments;
                        item.controlnumber = value.controlnumber;
                        item.cut = value.cut;
                        item.fluorescence = value.fluorescence;
                        item.polish = value.polish;
                        item.report = value.report;
                        item.symmetry = value.symmetry;
                        item.user = value.user;
                        item.weight = value.weight;
                    }
                    resolve(item)
                }
            });
        });
    },
    getActiveClarityModel: function(db) {
        return new Promise((resolve, reject)=>{
            db.view('all', 'sparkletrainingitems', {include_docs: false},
            function (err, result) {
                if (err) {
                    console.log(err);
                    reject(err)
                } else {
                    for (var i = 0; i < result.rows.length; i++) {
                        if (result.rows[i].value.active == 'yes'){
                             resolve(result.rows[i].value)
                             return
                        } 
                    }
                    resolve("Unable to find the active model in the Cloudant database")
                }
            });  
        });
    }

    // resetCisgoCloudantItem: function(db, controlnumber) {
    //     return new Promise((resolve, reject)=>{
    //         db.search('all', 'cisgo_by_controlnumber', { 'include_docs': true, q: 'controlnumber:' + controlnumber + '*' }, function(err, result) {
    //             if (err) {
    //                 reject(err)
    //             } else {
    //                 for (var i = 0; i < result.rows.length; i++) {
    //                     var id = result.rows[i].id;
    //                     db.get(id, function(err, doc) {
    //                         if (err) {
    //                             reject(err)
    //                         } else {
    //                             doc.sparkleprocessed = false;
    //                             db.insert(doc, doc.id, function(err, doc) {
    //                                 if (err) {
    //                                   reject(err)
    //                                 } else {
    //                                     resolve()
    //                                 }
    //                             })
    //                         }
    //                     });
    //                 }
    //             }
    //         });
    //     });
    // },

};