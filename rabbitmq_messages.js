const config = require('./config');
const amqp = require('amqplib/callback_api');

let connectionString = config.getRabbitMQConnection();
let certificateBase64 = config.getRabbitMQCertificateBase64();
let caCert = Buffer.from(certificateBase64, 'base64');

var amqpConn = null;
var pubChannel = null;
var offlinePubQueue = [];
var claritytrainingstatus = []
var inclusiontrainingstatus = []
var gradingstatus = []
var fittingstatus = []
module.exports = {

    initAMQPConnection: function() {
        amqp.connect(connectionString, { ca: [caCert] }, function(err, conn) {
            if (err) {
                console.error("[AMQP]", err.message);
                return setTimeout(module.exports.initAMQPConnection, 1000);
            }
            conn.on("error", function(err) {
                if (err.message !== "Connection closing") {
                    console.error("[AMQP] conn error", err.message);
                }
            });
            conn.on("close", function() {
                console.error("[AMQP] reconnecting");
                return setTimeout(module.exports.initAMQPConnection, 1000);
            });

            console.log("[AMQP] connected");
            amqpConn = conn;
            amqpConn.createConfirmChannel(function(err, ch) {
                if (module.exports.closeOnErr(err)) return;
                ch.on("error", function(err) {
                    console.error("[AMQP] channel error", err.message);
                });
                ch.on("close", function() {
                    console.log("[AMQP] channel closed");
                });
                pubChannel = ch;
                while (true) {
                    var m = offlinePubQueue.shift();
                    if (!m) break;
                    publish(m[0], m[1], m[2]);
                }
            });

            amqpConn.createConfirmChannel(function(err, ch) {
                if (module.exports.closeOnErr(err)) return;
                ch.on("error", function(err) {
                    console.error("[AMQP] channel error", err.message);
                });
                ch.on("close", function() {
                    console.log("[AMQP] channel closed");
                });
                ch.assertExchange("sparkle_clarity_training_logs", "fanout", { durable: false })
                q = ch.assertQueue("", { exclusive: true });
                ch.bindQueue(q.queue, "sparkle_clarity_training_logs", '');
                ch.consume(q.queue, function(msg) {
                    if(msg.content) {
                        claritytrainingstatus.push(msg.content.toString());
                    }
                }, { noAck: true});
            });

            amqpConn.createConfirmChannel(function(err, ch) {
                if (module.exports.closeOnErr(err)) return;
                ch.on("error", function(err) {
                    console.error("[AMQP] channel error", err.message);
                });
                ch.on("close", function() {
                    console.log("[AMQP] channel closed");
                });
                ch.assertExchange("sparkle_inclusion_training_logs", "fanout", { durable: false })
                q = ch.assertQueue("", { exclusive: true });
                ch.bindQueue(q.queue, "sparkle_inclusion_training_logs", '');
                ch.consume(q.queue, function(msg) {
                    if(msg.content) {
                        inclusiontrainingstatus.push(msg.content.toString());
                    }
                }, { noAck: true});
            });

            amqpConn.createConfirmChannel(function(err, ch) {
                if (module.exports.closeOnErr(err)) return;
                ch.on("error", function(err) {
                    console.error("[AMQP] channel error", err.message);
                });
                ch.on("close", function() {
                    console.log("[AMQP] channel closed");
                });
                ch.assertExchange("sparkle_grading_logs", "fanout", { durable: false })
                q = ch.assertQueue("", { exclusive: true });
                ch.bindQueue(q.queue, "sparkle_grading_logs", '');
                ch.consume(q.queue, function(msg) {
                    if(msg.content) {
                        gradingstatus.push(msg.content.toString());
                    }
                }, { noAck: true});
            });

            amqpConn.createConfirmChannel(function(err, ch) {
                if (module.exports.closeOnErr(err)) return;
                ch.on("error", function(err) {
                    console.error("[AMQP] channel error", err.message);
                });
                ch.on("close", function() {
                    console.log("[AMQP] channel closed");
                });
                ch.assertExchange("sparkle_fitting_logs", "fanout", { durable: false })
                q = ch.assertQueue("", { exclusive: true });
                ch.bindQueue(q.queue, "sparkle_fitting_logs", '');
                ch.consume(q.queue, function(msg) {
                    if(msg.content) {
                        fittingstatus.push(msg.content.toString());
                    }
                }, { noAck: true});
            });

        });
    }, 
    publish: function(q, content) {
        console.log("queue: " + q + " content: " + content);
        return new Promise((resolve, reject)=>{
            try {
                pubChannel.assertQueue(q, { autoDelete: false, durable: false });
                pubChannel.sendToQueue(q, content);
                resolve();
            } catch (e) {
                console.error("[AMQP] publish", e.message);
                offlinePubQueue.push([exchange, routingKey, content]);
                module.exports.closeOnErr(err)
                reject(e)
            }
        })
    },
    closeOnErr: function(err) {
        if (!err) return false;
        console.error("[AMQP] error", err);
        amqpConn.close();
        return true;
    },
    getclaritytrainingstatus: function() {
        return claritytrainingstatus
    },
    clearclaritytrainingstatus: function() {
        claritytrainingstatus = []
    },
    getinclusiontrainingstatus: function() {
        return inclusiontrainingstatus
    },
    clearinclusiontrainingstatus: function() {
        inclusiontrainingstatus = []
    },
    getgradingstatus: function() {
        return gradingstatus
    },
    cleargradingstatus: function() {
        gradingstatus = []
    },
    getfittingstatus: function() {
        return fittingstatus
    },
    clearfittingstatus: function() {
        fittingstatus = []
    }
    
    
};
