const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const fs = require('fs');
const router_ipad = require('./router_ipad');
const router_webui = require('./router_webui');
const router_cutwise = require('./router_cutwise');
const config = require('./config');
const swaggerUi = require('swagger-ui-express');
const swaggerJSON = require('./openapi.json');
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session( {"secret": config.getSessionSecret(),
                    "resave": true,
                    "saveUninitialized": true}));

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((user, cb) => cb(null, user));

passport.use(new WebAppStrategy({
"tenantId": config.getAppIDTenantID(),
"clientId": config.getAppIDClientID(),
"secret": config.getAppIDSecret(),
"oAuthServerUrl": config.getAppIDOAuthServerUrl(),
"redirectUri": "https://sparkleuatcluster-0de26d204cce5ce3782ab0318a20cdb8-0000.us-south.containers.appdomain.cloud/appid/callback"
}));


app.use('/', router_webui);
app.use('/', router_ipad);
app.use('/', router_cutwise);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJSON));

app.use(passport.authenticate(WebAppStrategy.STRATEGY_NAME));
app.use(express.static(path.join(__dirname, 'public')));

var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});
