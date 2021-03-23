const express = require('express');
const session = require('express-session');
const passport = require('passport');
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
passport.use( new WebAppStrategy({
    "tenantId": config.getAppIDTenantID(),
    "clientId": config.getAppIDClientID(),
    "secret": config.getAppIDSecret(),
    "oauthServerUrl": config.getAppIDOAuthServerUrl(),
    "redirectUri": config.getAppIDRedirectUrl()
}));

app.use('/middleware', router_cutwise);
app.use('/middleware/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJSON));

var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});
