/**
 * Created with JetBrains WebStorm.
 * User: D060785
 * Date: 25.09.13
 * Time: 17:28
 * To change this template use File | Settings | File Templates.
 */

var nodemailer = require("nodemailer");
var Promise = require("promise");
var Persistence = require("./persistence");

var Mailer = new function(){
    var that = this;
    var connections = [];
    var events = [];
    var users = {};
	var maxCacheAge = 1000 * 30; //30 seconds

    function initConnection(user, forceNewConnection){
        if(connections[user.ID_user]){
            if(forceNewConnection)
                connections[user.ID_user].close();
            else
                return;
        }

        var smtp_options = {
            host: user.email_server,
                //secureConnection: true, // use SSL
            port: user.email_port // port for secure SMTP
        };
        if(user.email_user){
            smtp.auth = {
                 user: user.email_user,
                 pass: user.email_password
             }
        }
        connections[user.ID_user] = nodemailer.createTransport("SMTP", smtp_options);
    }

    this.send = function(mail, user, forceNewConnection){
        return new Promise(function(resolve, reject){
            initConnection(user, forceNewConnection);

            // setup e-mail data with unicode symbols
            var mailOptions = {
                from: user.email_address,
                to: user.email_receiver, // list of receivers
                subject: mail.subject || "nowl alert", // Subject line
                text: mail.text || "please visit the nowl page", // plaintext body
                html: mail.html || mail.text || "please visit the nowl page"// html body
            };

            connections[user.ID_user].sendMail(mailOptions, function(error, response){
                if(error){
                    console.log(error, "ERROR", mailOptions);
                    reject(error)
                } else{
                    console.log("Message sent: " + response.message);
                    resolve(response);
                }
            });
        });
    };



    //does not work yet
    this.handle = function(client, ev){
        if(!events[ev.ID_event] || !events[ev.ID_event].lastFetch  || events[ev.ID_event].lastFetch < Date.now() - maxCacheAge)
            Persistence.getEventType(ev.ID_event).then(function(result){
                go_on(result);
                events[ev.ID_event].lastFetch = Date.now();
            }, console.log);
        else
            go_on();

        function go_on(event_type){
            if(event_type)
                events[ev.ID_event] = event_type;

            var event = events[ev.ID_event];

            event.last = ev;
            if(!users.lastFetch || users.lastFetch < Date.now() - maxCacheAge){
                Persistence.getEmailUsers().then(function(result){
                    users.current = result;
                    users.lastFetch = Date.now();
                    sendMail(event);
                });
            } else
                sendMail(event);
        }
    };

    function sendMail(event){
        users.current.forEach(function(user){
            if(event.last.status == false && event.impact_level <= user.email_threshold){
				Persistence.getClient(event.last.ID_client).then(function(client){
					var status = ['debug', 'critical', 'warning', 'info'][event.impact_level];
					that.send({
						subject: status+": "+event.name+" on "+client.hostname+" - nowl",
						html: "Watch out, "+user.name+"!<br><br>There was an event on <b>"+client.hostname+":</b><br>"+
							"Status: "+(event.last.status ? "running" : "stopped") +"<br>"+
							"Name: "+event.name+"<br>"+
							"Description: "+event.last.description+"<br>"+
							"<br>This alert was set up in the nowl server monitoring tool. If you do not want to receive such alerts, please contact your system administrator.\n"
					}, user);
				});
            }
        });
    }
};

module.exports = Mailer;