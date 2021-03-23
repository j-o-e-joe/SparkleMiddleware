const config = require('./config');
const Cloudant = require('@cloudant/cloudant');
const dbCredentials = {
    dbName: 'sparkle_db',
    url: config.getCloudantAccountUrl(),
    apikey: config.getCloudantAPIKey()
}

module.exports = {
    initDBConnection: function() {
        var cloudant = new Cloudant({ url: dbCredentials.url, plugins: { iamauth: { iamApiKey: dbCredentials.apikey, retryDelayMultiplier: 4 } } });
        const db = cloudant.use(dbCredentials.dbName);
        return db;
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
    }
};