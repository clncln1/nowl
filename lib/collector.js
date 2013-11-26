/**
 * Created with JetBrains WebStorm.
 * User: D060785
 * Date: 25.09.13
 * Time: 17:28
 * To change this template use File | Settings | File Templates.
 */

var Persistence = require('./persistence');
var Mailer = require('./mail');
var socketio = require('socket.io'), io;

var Collector = new function(){
    var that = this;
    var sockets = [];
    var browser_sockets = [];
    var server_sockets = [];

    this.initialize = function(server){
        io = socketio.listen(server, { log: false });
        var socket;

        //TODO: make a test suite out of this (already covers most aspects)
        function testDB(){
            var clientId;
            var data = { os: 'Darwin 12.5.0',
                cpu: 'Intel(R) Core(TM) i7-3740QM CPU @ 4.70GHz',
                cpuamount: 1468,
                hostname: 'WDFAWESOME',
                ips: [ '1.47.94.182' ],
                node: 'v0.10.18' } ;
            Persistence.addClient(data)
                .then(function(id){
                    clientId = id;
                    console.log("initialized client", clientId)
                    socket = {};
                    socket.clientId = clientId;
                    sendWatchedItems(socket);

                }, function(err){
                    console.log("could not initialize db", err);
                });

            setTimeout(function(){
                var data = {
                    name: "sampleProcess",
                    props: [
                        {name: "named", values:["a","b","c"], type:"enum", default: "a"},
                        {name: "adsf",type:"string", default: "hans"}
                    ]
                };
                Persistence.addEventType(clientId, data)
                    .then(function(id){
                        Persistence.getAllEventTypes()
                            .then(function(res){console.log(JSON.stringify(res))})

                    }, function(err){
                        console.log("could not add event", err);
                    });

                //status
                (function addStatus(){
                    var data = [{name: "cpu", value: Math.random()}, {name: "memory", value: Math.random()}];
                    Persistence.addStatus(clientId, data);

                    data.forEach(function(item){
                        item.timestamp = Date.now();
                    });
                    that.broadcastStatus(clientId, data);
                    setTimeout(addStatus, 5000);
                }());

                //events
                (function addEvent(){
                    var data = {id: 1, status: Math.random()>0.5, description: "some random error"};

                    Persistence.addEvent(clientId, data).then(function(event){
                        Mailer.handle(clientId, event)
                    });

                    data.timestamp = Date.now();
                    that.broadcastEvent(clientId, data);
                    setTimeout(addEvent, 2000 + Math.random() * 10000);
                }());
            }, 1500);

        }
        setTimeout(testDB, 200);

        io.sockets.on('connection', function (socket) {
            //socket.emit('connected', {number: 47});
            sockets.push(socket);

            //SERVER METHODS
            socket.on('register', function(data){
                server_sockets.push(socket);
                //console.log(data);
                Persistence.addClient(data)
                    .then(function(clientId){

                        socket.clientId = clientId;
                        that.broadcastClients();

                        socket.emit('acknowledge', {
                            server_version: "0.4"
                        });

                    }, function(err){
                        console.log("could not initialize db", err);
                    })
            });

            socket.on('registerModules', function(data){
                //console.log("registerModules", JSON.stringify(data), socket.clientId);
                if(!socket.clientId) return;

                var events = data.events;

                function add(){
                    var module = events.shift();
                    Persistence.addEventType(socket.clientId, module)
                        .then(function(){
                            if(events.length) add();
                            else {
                                console.log('done');
                                that.broadcastEventTypes();
                                sendWatchedItems(socket);
                            }
                        }, function(err){
                            console.log("could not add event", err);
                        })
                }
                add();
            });

            socket.on('status', function(data){
                Persistence.addStatus(socket.clientId, data);

                data.forEach(function(item){
                    item.timestamp = Date.now();
                });
                that.broadcastStatus(socket.clientId, data);
            });
            socket.on('event', function(event){
                Persistence.addEvent(socket.clientId, event).then(function(event){
                    Mailer.handle(socket.clientId, event)
                });

                event.timestamp = Date.now();
                that.broadcastEvent(socket.clientId, event);
            });


            //CLIENT METHODS
            socket.on('register_browser', function(){
                browser_sockets.push(socket);

                sendClients(socket);
                sendEventTypes(socket);
                sendEvents(socket);
            });
            socket.on('browser_message', function(message){
                //console.log(message);
            });



            socket.on('disconnect', function(){
                sockets.splice(sockets.indexOf(socket), 1);
                if(browser_sockets.indexOf(socket) > -1){
                    browser_sockets.splice(browser_sockets.indexOf(socket), 1);
                }
                if(server_sockets.indexOf(socket) > -1){
                    server_sockets.splice(server_sockets.indexOf(socket), 1);
                    that.broadcastClients();
                }

            });
        });
    };
    function sendClients(socket){
        Persistence.getAllClients()
            .then(function(result){
                socket.emit("browser_update", {
                    type: "servers",
                    message: result
                })
            });
    }
    function sendEventTypes(socket){
        Persistence.getAllEventTypes()
            .then(function(result){
                socket.emit("browser_update", {
                    type: "eventTypes",
                    message: result
                })
            });
    }
    function sendEvents(socket){
        Persistence.getAllEvents()
            .then(function(result){
                socket.emit("browser_update", {
                    type: "events",
                    message: result
                })
            });
    }
    function sendStatus(clientId, data, socket){
        socket.emit("browser_update", {
            type: "status",
            message: {
                clientId: clientId,
                data: data
            }
        });
    }
    function sendEvent(clientId, data, socket){
        socket.emit("browser_update", {
            type: "event",
            message: {
                clientId: clientId,
                data: data
            }
        });
    }

    this.broadcastClients = function(){
        browser_sockets.forEach(sendClients);
    };
    this.broadcastEvents = function(){
        browser_sockets.forEach(sendEvents);
    };
    this.broadcastEventTypes = function(){
        browser_sockets.forEach(sendEventTypes);
    };
    this.broadcastStatus = function(clientId, data){
        browser_sockets.forEach(sendStatus.curry(clientId, data));
    };
    this.broadcastEvent = function(clientId, data){
        browser_sockets.forEach(sendEvent.curry(clientId, data));
    };

    this.updateClient = function(clientId){
        server_sockets.forEach(function(socket){
            if(socket.clientId == clientId)
                sendWatchedItems(socket)
        });
    };
    function sendWatchedItems(socket){
        //socket.emit('watch', {status: [{ID_status: 0, name: "CPU"}, {ID_status: 1, name: "memory"}],
        //    events: [{ID_event: 0, type: "service_start", service_name: "node"},{ID_event: 1, type: "service_end", service_name: "node"}]});
        setTimeout(function(){
            Persistence.getClientWatchers(socket.clientId)
                .then(function(result){
                    socket.emit('watch', result);
            });
        }, 200);
    }
};

module.exports = Collector;