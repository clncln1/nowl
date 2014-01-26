/**
 * Created with JetBrains WebStorm.
 * User: D060785
 * Date: 26.09.13
 * Time: 09:48
 * To change this template use File | Settings | File Templates.
 */


var Persistence = require('./persistence');
var Collector = require('./collector');
var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');
var Promise = require('promise');
var Mailer = require('./mail');

var Front = new function(){
    var app;

    function setHeaders(res){
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('X-UA-Compatible', 'IE=edge'); //prevent compatibiliy mode
    }

    function authUser(req, res, next) {
        if(!req.session.user){
            req.session.loginforward = req.url;
            res.writeHead(302, {
                Location: '/login'
            });
            res.end();
        } else {
            next();
        }
    }

    this.initialize = function(){
        app = express();

        //app.use(express.favicon(__dirname + '/favicon.ico'));  TODO: add a favicon
        app.use(express.logger());
        app.use(express.cookieParser());
        app.use(express.bodyParser({
            uploadDir: __dirname + '/temp'
        }));
        app.use(express.session({secret: "baaaaacooon"}));

        app.use(express.compress());


        var staticOptions = {maxAge: 0};//{ maxAge:604800000 };
        app.use('/fonts', express.static(__dirname + '/web/fonts',staticOptions));
        app.use('/images', express.static(__dirname + '/web/images',staticOptions));
        app.use('/charts', express.static(__dirname + '/web/charts',staticOptions));
        app.use('/js', express.static(__dirname + '/web/js',staticOptions));
        app.use('/css', express.static(__dirname + '/web/css',staticOptions));
        app.use('/template', express.static(__dirname + '/web/template',staticOptions));

        app.use(express.errorHandler({
            dumpExceptions: true,
            showStack: false
        }));


        //	Routes
        app.get('/', authUser, function (req, res) {
            setHeaders(res);
            fs.readFile(__dirname + '/web/index.html', function (err, data) {
                if(err)
                    res.send(err);
                else {
                    res.send(data);
                }
            });
        });

        app.get('/login', function (req, res) {
            if(req.session.user){
                res.writeHead(302, {
                    Location: '/'
                });
                res.end();
                return;
            }

            setHeaders(res);
            fs.readFile(__dirname + '/web/login.html', function (err, data) {
                if(err)
                    res.send(err);
                else {
                    res.send(data);
                }
            });
        });

        app.get('/logout', function (req, res) {
            delete req.session.user;

            res.writeHead(302, {
                Location: '/'
            });
            res.end();
            return;
        });

        app.post('/dologin', function (req, res) {
            if(req.session.user){
                res.writeHead(302, {
                    Location: '/'
                });
                res.end();
                return;
            }
            Persistence.authenticate(req.body.username, req.body.password)
                .then(function(user){
                    console.log("USER: "+user)
                    req.session.user = user;
                    res.send("authenticated");
                }, function(){
                    res.send("false");
                });
        });

        app.post('/createAccount', authUser, function (req, res) {
            Persistence.createUser(req.body.username, req.body.password)
                .then(function(user){
                    res.send('true');
                }, function(){
                    res.send('false');
                });
        });

        app.put('/events/:clientId', authUser, function (req, res) {
            Persistence.createEvent(req.params.clientId, req.body)
                .then(function(user){
                    Collector.broadcastEvents();
                    Collector.updateClient(req.params.clientId);
                    res.send('true');
                }, function(err){
                    console.log("could not get client", err);
                    res.send('false');
                });
        });

        app.delete('/events/:clientId/:eventId', authUser, function (req, res) {
            Persistence.removeEvent(req.params.clientId, req.params.eventId)
                .then(function(user){
                    Collector.broadcastEvents();
                    Collector.updateClient(req.params.clientId);
                    res.send('true');
                }, function(){
                    console.log("could not remove Event");
                    res.send('false');
                });
        });

        app.get('/eventLog/:eventId', authUser, function(req, res){
            Persistence.getEventLog(req.params.eventId)
                .then(function(log){
                    res.send(log);
                }, function(err){
                    res.send(err);
                });
        });

        app.get('/clients', authUser, function(req, res){
            Persistence.getAllClients()
                .then(function(clients){
                    res.send(clients);
                }, function(err){
                    res.send(err);
                });
        });

        app.get('/getAllEventTypes/:clientId', authUser, function(req, res){
            Persistence.getAllEventTypes(req.params.clientId)
                .then(function(events){
                    res.send(events);
                }, function(err){
                    res.send(err);
                });
        });

        app.get('/status/:level/:clientId/:interval', authUser, function(req, res){
            var a = Date.now();
            Persistence.getStatus(req.params.level, req.params.clientId, req.params.interval)
                .then(function(status){
                    res.send(status);
                    console.log("status for client "+clientId+" fetched in ", Date.now() - a);
                }, function(err){
                    res.send(err);
                });
        });

        //get i.e. cpu or memory for all clients in a given interval
        app.get('/allClientStatus/:status/:interval', authUser, function(req, res){
            var a = Date.now();
            Persistence.getAllClientStatus(req.params.status, req.params.interval)
                .then(function(status){
                    res.send(status);
                    console.log("status for all clients fetched in",Date.now() - a);
                }, function(err){
                    res.send(err);
                });
        });

        app.get('/allEventStatus', authUser, function(req, res){
            var a = Date.now();
            Persistence.getAllEventStatus()
                .then(function(eventstatus){
                    res.send(eventstatus);
                    console.log("all event status fetched in", Date.now() - a);
                }, function(err){
                    res.send(err);
                });
        });

        app.get('/user', authUser, function(req, res){
            res.send(req.session.user);
        });

        app.post('/user', authUser, function(req, res){
            Persistence.saveUser(req.session.user.ID_user, req.body)
                .then(function(user){
                    req.session.user = user;
                    res.send("true");
                }, function(err){
                    res.send(err);
                });
        });


        app.post('/sendTestMail', authUser, function(req, res){
            Mailer.send({
                subject: "nowl email alerts",
                text: "Cheers!\n\nYou are now set up to receive nowl alerts via email.\n\n",
                receiver: req.body.receiver
            }, req.session.user, true)
                .done(function(response){
                    res.send(response);
                }, function(err){
                    err.error = true;
                    res.send(err);
                });
        });


        var server = http.createServer(app);
        server.listen(process.env.PORT || 4747);

        Collector.initialize(server);
    }
}

module.exports = Front;