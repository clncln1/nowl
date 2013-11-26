/**
 * Created with JetBrains WebStorm.
 * User: D060785
 * Date: 25.09.13
 * Time: 17:25
 * To change this template use File | Settings | File Templates.
 */

    /* uses an sqlite3 database */

var sqlite = require('sqlite3').verbose();
var fs = require('fs');
var async = require('async');
var Promise = require('promise');

//allows denodifing of db functions like db.all which require that 'db' is the this argument
Promise.denodeify2 = function(fn, self){
    return function(){
        self = self || this;
        var args = Array.prototype.slice.call(arguments);
        return new Promise(function (resolve, reject) {
            args.push(function (err, res) {
                //console.log(err, res)
                if (err) reject(err);
                else resolve(res)
            });
            fn.apply(self, args);
        })
    }
};

var parallel = Promise.denodeify(async.parallel);


var Persistence = new function(){
    var that = this;
    var file = __dirname + "/database.db";
    var db;

    //promisify
    var get, run, exec, all, finalize;

    var status_map = [];  //maps status name to its id

    function simpleHandler(resolve, reject){
        return function(err, res){
            if(err) reject(err);
            else resolve(res);
        }
    }

    function createDatabase(){
        var script = fs.readFileSync(__dirname + '/sql/init.sql').toString();
        console.log("no db found. creating database..");

        return exec(script)
            .then(function(){
                return all("SELECT * FROM users", []);
            })
            .then(function(rows){

            }, function(err){
                console.log("err", err)
            });
    }

    this.init = function(){
        return new Promise(function(resolve, reject) {

            function handler(err){
                get = Promise.denodeify2(db.get, db);
                run = function(){
                    var args = Array.prototype.slice.call(arguments);
                    return new Promise(function (resolve, reject) {
                        args.push(function (err, res) {
                            res = res || {};
                            res.lastID = this.lastID;
                            res.changed = this.changed;
                            if (err) reject(err);
                            else resolve(res)
                        });
                        db.run.apply(db, args);
                    })
                };
                all = Promise.denodeify2(db.all, db);
                exec = Promise.denodeify2(db.exec, db);
                finalize = function(stmt){
                    return new Promise(function(resolve, reject){
                        stmt.finalize(function (err, res) {
                            if (err) reject(err);
                            else resolve(res)
                        });
                    });
                };

                if(err){
                    reject(err);
                    return;
                }

                if(!exists){
                    createDatabase().then(resolve, reject);  //create database
                } else {
                    resolve();
                }
            }

            var exists = fs.existsSync(file);

            if(!exists){
                fs.writeFileSync(file, "");
            }

            //db = new sqlite.Database(":memory:", sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE, handler);
            db = new sqlite.Database(file, sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE, handler);
        });
    };

    this.authenticate = function(user, password){
        return get("SELECT * FROM users WHERE name = $name and password = $password", {$name: user, $password: password});
    };

    this.createUser = function(user, password){
        return run("INSERT INTO users (name, password) VALUES ($name, $password)", {$name: user, $password: password});
    };

    this.saveUser = function(userId, user){
        return run("UPDATE users SET password = $password, email_address = $email_address, email_receiver = $email_receiver, email_threshold = $email_threshold, email_user = $email_user, email_password = $email_password, email_server = $email_server, email_port = $email_port WHERE ID_user = $userId", {
            $userId: userId,
            $password: user.password,
            $email_threshold: user.email_threshold,
            $email_user: user.email_user,
            $email_address: user.email_address,
            $email_receiver: user.email_receiver,
            $email_password: user.email_password,
            $email_server: user.email_server,
            $email_port: user.email_port
        })
        .then(get.curry("SELECT * FROM users WHERE ID_user = $userId", {$userId: userId}));
    };

    function getClientId(hostname){
        return get("SELECT ID_client FROM clients WHERE hostname = ?", hostname)
            .then(function(res){
                var id = res ? res.ID_client : 0;
                if(!id) throw "no ID";
                return id;
            })
    }
	
	this.getClient = function(id){
		return get("SELECT * FROM clients WHERE ID_client = ?", id);
	};

    this.addClient = function(data){

        return getClientId(data.hostname)
            .then(function(id){     //id already exists
                return run("REPLACE INTO clients (ID_client, hostname, os, cpu, cpu_amount, ips, node_v, disks) VALUES ($id, $hostname, $os, $cpu, $cpu_amount, $ips, $node_v, $disks)", {
                    $id: id,
                    $hostname: data.hostname,
                    $os: data.os,
                    $cpu: data.cpu,
                    $cpu_amount: data.cpuamount,
                    $ips: JSON.stringify(data.ips),
                    $node_v: data.node,
                    $disks: data.disks
                }).then(function(){
                    return id;
                })
            })
            .then(null, function(){    //no id exists
                return run("INSERT INTO clients(hostname, os, cpu, cpu_amount, ips, node_v, disks) VALUES ($hostname, $os, $cpu, $cpu_amount, $ips, $node_v, $disks)", {
                    $hostname: data.hostname,
                    $os: data.os,
                    $cpu: data.cpu,
                    $cpu_amount: data.cpuamount,
                    $ips: JSON.stringify(data.ips),
                    $node_v: data.node,
                    $disks: data.disks
                })  .then(function(){
                        return getClientId(data.hostname);
                    })
                    .then(function(id){
                        //add standard watchers
                        var stmt = db.prepare("INSERT INTO client_status VALUES ($clientId, $statusId)");
                        [1,2,3,4,5].forEach(function(status){
                            stmt.run({$clientId: id, $statusId: status});
                        });
                        stmt.finalize();
                        return id;
                    })/*
                    .then(function(id){
                        setTimeout(function(){
                            db.all("SELECT * FROM clients", [], function(err, rows){
                                console.log(err, rows, rows.length);
                            });
                            db.all("SELECT * FROM client_status", [], function(err, rows){
                                console.log(err, rows, rows.length);
                            });
                            db.all("SELECT * FROM event_client_type", [], function(err, rows){
                                console.log(err, rows, rows.length);
                            });
                        }, 100);
                        return id;
                });*/
            });

    };

    this.addEventType = function(clientId, data){
        var eventTypeId;
        return get("SELECT ID_event_type FROM event_types WHERE ID_client = $clientId AND name = $name", {
                $clientId: clientId,
                $name: data.name
            })
            .then(function(res){
                if(res){
                    eventTypeId = res.ID_event_type;
                    return run("DELETE FROM event_type_props WHERE ID_event_type = ?", eventTypeId);
                } else {
                    return run("INSERT INTO event_types (ID_client, name) VALUES ($clientId, $name)", {
                        $clientId: clientId,
                        $name: data.name
                    }).then(function(res){
                        eventTypeId = res.lastID;
                    });
                }
            })
            .then(function(result){
                var stmt = db.prepare("INSERT INTO event_type_props(ID_event_type, name, type, select_values, default_value) VALUES ($eventTypeId, $prop, $type, $values, $default_value)");

                data.props.forEach(function(prop){
                    stmt.run({
                        $eventTypeId: eventTypeId,
                        $prop: prop.name,
                        $type: prop.type,
                        $values: prop.values ? JSON.stringify(prop.values) : "",
                        $default_value: prop.default || ""
                    });
                });
                return finalize(stmt);
            })
            .then(function(){
                return eventTypeId;
            });
    };

    this.getEventType = function(eventId){
        return get("SELECT ect.ID_client AS ID_client, ect.impact_level AS impact_level, et.name AS name FROM event_client_type ect, event_types et WHERE ID_event = ? AND ect.ID_event_type = et.ID_event_type", eventId);
    };

    this.getAllClients = function(){
        return all("SELECT * FROM clients", []);
    };

    this.getAllEventTypes = function(){
        var getAllEventPropsStatementSimple = "SELECT event_type_props.* " +
            "FROM event_types, event_type_props " +
            "WHERE event_type_props.ID_event_type = event_types.ID_event_type";

        function getEvents(cb){
            db.all("SELECT * FROM event_types", [], cb)
        }
        function getEventProps(cb){
            db.all(getAllEventPropsStatementSimple, [], cb)
        }
        return parallel([getEvents, getEventProps])
            .then(function(res){
                var events = [];

                res[0].forEach(function(row){
                    events[row.ID_event_type] = {name: row.name, id: row.ID_event_type, clientId: row.ID_client, props:[]};
                });
                res[1].forEach(function(row){
                    row.select_values = row.select_values ? JSON.parse(row.select_values) : "";
                    events[row.ID_event_type].props.push(row);
                });

                return events.filter(function(el){return el}); //remove empty elements
            }, console.log);
    };
    this.getAllEvents = function(){
        var getAllEventPropsStatement = "SELECT event_prop_values.ID_event, event_type_props.name, event_prop_values.value " +
            "FROM event_client_type, event_types, event_type_props, event_prop_values " +
            "WHERE event_types.ID_event_type = event_client_type.ID_event_type AND event_type_props.ID_event_type = event_types.ID_event_type  AND event_type_props.ID_prop = event_prop_values.ID_prop AND event_prop_values.ID_event = event_client_type.ID_event";

        function getEvents(cb){
            db.all("SELECT * FROM event_client_type", [], cb)
        }
        function getEventProps(cb){
            db.all(getAllEventPropsStatement, [], cb)
        }
        return parallel([getEvents, getEventProps])
            .then(function(res){
                var events = [];

                res[0].forEach(function(row){
                    events[row.ID_event] = {id: row.ID_event, clientId: row.ID_client, eventTypeId: row.ID_event_type, impact_level: row.impact_level, props:[]};
                });
                res[1].forEach(function(row){
                    events[row.ID_event].props.push({name: row.name, value: row.value});
                });

                return events.filter(function(el){return el}); //remove empty elements
            }, console.log);
    };

    this.createEvent = function(clientId, event){
        var eventId;
        return run("INSERT INTO event_client_type(ID_client, ID_event_type, impact_level) VALUES ($clientId, $eventTypeId, $impact_level)", {
                $clientId: clientId,
                $impact_level: event.is_critical ? 1 : (event.is_warning ? 2 : 3),
                $eventTypeId: event.eventTypeId
            })
            .then(function(result){
                eventId = result.lastID;

                var stmt = db.prepare("INSERT INTO event_prop_values(ID_prop, ID_event, value) VALUES ($propId, $eventId, $value)");

                event.props.forEach(function(prop){
                    stmt.run({
                        $eventId: eventId,
                        $propId: prop.ID_prop,
                        $value: prop.value
                    });
                });
                return finalize(stmt);
            });
            /*.then(function(){
                Collector.broadcastClients()
            })*/
    };

    this.removeEvent = function(clientId, eventId){
        return run("DELETE FROM event_client_type WHERE ID_event = $eventId AND ID_client = $clientId", {
            $clientId: clientId,
            $eventId: eventId
        })
        .then(run.curry("DELETE FROM events WHERE ID_event = $eventId", {$eventId: eventId}))
        .then(run.curry("DELETE FROM event_prop_values WHERE ID_event = $eventId", {$eventId: eventId}))
    };

    //removes old statuses nobody needs and computes the avg/max for minutes and then hours
    var statusCache = [];
    function updateStatusCache(clientId, statusId, status_value){
        var time = Date.now();
        statusCache[clientId] = statusCache[clientId] || [];
        statusCache[clientId][statusId] = statusCache[clientId][statusId] || {
            last_min: [],
            last_min_start: time,
            last_h: [],
            last_h_start: time
        };

        var cache = statusCache[clientId][statusId];

        if(time - cache.last_min_start >= 60*1000){
            var value = cache.last_min.avg();
            db.run("INSERT INTO status(ID_client, ID_status, value, level) VALUES ($clientId, $statusId, $value, 1)", {
                $clientId: clientId,
                $statusId: statusId,
                $value: value
            });
            //all("SELECT * FROM status WHERE level = 1", []).then(console.log.curry("mins"));
            cache.last_min.length = 0;
            cache.last_min_start = time;

            if(time - cache.last_h_start >= 60*60*1000){
                var h_value = cache.last_h.avg();
                db.run("INSERT INTO status(ID_client, ID_status, value, level) VALUES ($clientId, $statusId, $value, 2)", {
                    $clientId: clientId,
                    $statusId: statusId,
                    $value: h_value
                });
                //all("SELECT * FROM status WHERE level = 2", []).then(console.log.curry("hours"));
                cache.last_h.length = 0;
                cache.last_h_start = time;

                //clean up   delete level 0 older than 5 hours, level 1 older than two days
                run("DELETE FROM status WHERE level = 0 AND timestamp < CURRENT_TIMESTAMP - 60*60*5", []).then(function(){
                    //db.all("SELECT COUNT(*) AS c FROM status WHERE level = 0", [], console.log)
                });
                db.run("DELETE FROM status WHERE level = 1 AND timestamp < CURRENT_TIMESTAMP - 60*60*24*2", []);
            }
            cache.last_h.push(value);
        }
        cache.last_min.push(status_value);
    }

    this.addStatus = function(clientId, data){
        return new Promise(function(resolve, reject) {
            if(!data || !data.length){
                reject();
                return;
            }
            var stmt = db.prepare("INSERT INTO status(ID_client, ID_status, value, level) VALUES ($clientId, $statusId, $value, 0)");

            data.forEach(function(status){
                var id = status_map[status.name];
                if(id !== undefined){
                    stmt.run({$clientId: clientId, $statusId: id, $value: status.value});
                }
                updateStatusCache(clientId, id, status.value);
            });

            stmt.finalize(simpleHandler(resolve, reject));
        }).then(function(){}, console.log);
    };

    this.addEvent = function(clientId, event){
        return run("INSERT INTO events(ID_client, ID_event, status, description) VALUES ($clientId, $eventId, $status, $description)", {
                $clientId: clientId,
                $eventId: event.id,
                $status: event.status ? 1: 0,
                $description: event.description || ""
            }).then(function(result){
                return get("SELECT * from events WHERE ROWID = ?", result.lastID);
            });
    };

    this.getEmailUsers = function(){
        return all("SELECT * from users WHERE email_threshold > 0");
    };

    this.getStatus = function(level, clientId, duration){
        if(duration){
            var start = Math.round(Date.now() / 1000) - duration;
            return all("SELECT status_types.name, status.timestamp AS time, status.value FROM status, status_types WHERE status.level = $level AND status.ID_client = $clientId AND status.ID_status = status_types.ID_status AND time > $start ORDER BY time ASC", {
                $level: level,
                $clientId: clientId,
                $start: start
            });
        } else {
            return all("SELECT ID_status, timestamp, value FROM status WHERE level = ? AND ID_client = ?", [level, clientId]);
        }
    };


    this.getAllClientStatus = function(status, duration){
        var start = Math.round(Date.now() / 1000) - duration;
        return all("SELECT ID_client AS name, timestamp AS time, value FROM status WHERE status.level = 0 AND ID_status = $status AND time > $start ORDER BY time ASC", {
            $status: status_map[status],
            $start: start
        });
    };

    this.getEvents = function(clientId){
        return all("SELECT ID_event, timestamp, value FROM events WHERE ID_client = ?", clientId);
    };

	//find the fastest query to return the latest status for each event
	//distinct does not work, slow is correct but slow, the group by seems to work fine 
    var allEventStatusQuerySlow = "SELECT t1.ID_event, t1.status FROM events t1 LEFT OUTER JOIN events t2 ON (t1.ID_event = t2.ID_event AND t1.timestamp < t2.timestamp) WHERE t2.ID_event IS NULL";
    var allEventStatusQuery = "SELECT ID_event, status, description FROM events GROUP BY ID_event ORDER BY timestamp DESC";
    this.getAllEventStatus = function(){
		return all(allEventStatusQuery);
        /*return all(allEventStatusQuerySlow).then(function(correctRes){
			return all(allEventStatusQuery).then(function(fastRes){
				console.log("correct:", JSON.stringify(correctRes));
				console.log("fast:", JSON.stringify(fastRes));
				return fastRes;
			});
		});*/
    };

    this.getEventLog = function(eventId){
        return all("SELECT * FROM events WHERE ID_event = $eventId ORDER BY timestamp DESC LIMIT 100", {$eventId: eventId});
    };

    var getEventsStatementSimple = "SELECT event_client_type.ID_event, event_types.name " +
        "FROM event_client_type, event_types " +
        "WHERE event_client_type.ID_client = ? AND event_types.ID_event_type = event_client_type.ID_event_type";

    var getEventPropsStatement = "SELECT event_prop_values.ID_event, event_type_props.name, event_prop_values.value " +
        "FROM event_client_type, event_types, event_type_props, event_prop_values " +
        "WHERE event_client_type.ID_client = ? AND event_types.ID_event_type = event_client_type.ID_event_type AND event_type_props.ID_event_type = event_types.ID_event_type  AND event_type_props.ID_prop = event_prop_values.ID_prop AND event_prop_values.ID_event = event_client_type.ID_event";

    this.getClientWatchers = function(clientId){
        console.log("getting client watchers for client", clientId)
        function getStatus(cb){
            db.all("SELECT status_types.ID_status, status_types.name FROM status_types, client_status WHERE status_types.ID_status = client_status.ID_status AND client_status.ID_client = ?", clientId, cb);
        }
        function getEvents(cb){
            db.all(getEventsStatementSimple, clientId, cb)
        }
        function getEventProps(cb){
            db.all(getEventPropsStatement, clientId, cb)
        }
        return parallel([getStatus, getEvents, getEventProps])
            .then(function(res){
                var events = [];
                var status = [];

                res[0].forEach(function(row){
                    status.push({name: row.name});
                    status_map[row.name] = row.ID_status;
                });
                res[1].forEach(function(row){
                    events[row.ID_event] = {name: row.name, id: row.ID_event, props: {}};
                });
                res[2].forEach(function(row){
                    events[row.ID_event].props[row.name] = row.value;
                });

                events = events.filter(function(n){return n}); //remove empty elements
                console.log("resultevents", events)
                return {status: status, events: events};
            }, function(err){console.log(err)});
    };
}();
Array.prototype.max = function(){
    if(!this.length) return 0;
    return this.reduce(function(item, prev){
        return item > prev ? item : prev;
    });
}
Array.prototype.avg = function(){
    if(!this.length) return 0;
    var sum = this.reduce(function(item, prev){
        return item + prev;
    });
    return sum / this.length;
}

module.exports = Persistence;