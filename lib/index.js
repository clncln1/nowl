#!/usr/bin/env node

var Persistence = require('./persistence'),
    fs = require('fs'),
    Front = require('./front.js'),
    helper=require('./helper'),
    spawn=require('child_process').spawn;

global.settings = {};

//detect if we have been included as module or called directly
console.log(process.env.DEBUG);
if(require.main===module){
    (function(){
        var args={};
        var curopt=null;
        var argv=process.argv.splice(2);
        var isDaemon=false;
        if(argv.indexOf('-daemon')!==-1){
            argv.splice(argv.indexOf('-daemon'),1);
            isDaemon=true;
        }
        argv.forEach(function(val){
            if(!curopt){
                if(val.indexOf('-')===0){
                    curopt=val.substring(1);
                }
            }else{
                if(args.hasOwnProperty(curopt)){
                    args[curopt]=[args[curopt],val];
                }else{
                    args[curopt]=val;
                }
                curopt=null;
            }
        });
        if(isDaemon){
            console.log('starting up a nowl daemon...');
            var stdoutFd,stderrFd;
            if(args.hasOwnProperty('logfile')){
                try{
                    stdoutFd=fs.openSync(args.logfile,'a');
                }catch(err){
                    console.error(helper.log.error,'could not open file',args.logfile);
                }
            }else{
                console.log(helper.log.warn,'-logfile file parameter not specified');
            }
            if(args.hasOwnProperty('errfile')){
                try{
                    stderrFd=fs.openSync(args.errfile,'a');
                }catch(err){
                    console.error(helper.log.error,'could not open file',args.errfile);
                }
            }else{
                console.log(helper.log.warn,'-errfile file parameter not specified');
            }
            var daemon=spawn(process.execPath,[require.main.filename].concat(argv),{
                detached:true,
                stdio:['ignore',stdoutFd?stdoutFd:'ignore',stderrFd?stderrFd:'ignore']
            });
            console.log('started daemon with PID',daemon.pid);
            if(args.hasOwnProperty('pidfile')){
                try{
                    fs.writeFileSync(args.pidfile,daemon.pid);
                }catch(err){
                    console.error(helper.log.error,'could not write PID file:',err);
                }
            }
            daemon.unref();
            process.exit();
        }
        global.settings=applyDefaultOptions(args);
        start();
    })();
}else{
    module.exports=function(args){
        global.settings=applyDefaultOptions(args);
        start();
    };
}


function start(){
    Persistence.init()
        .then(function(){
            console.log("initialized")
            Front.initialize();
        }, function(err){
            console.log("initializing failed")
            console.error(err);
            setTimeout(start, 5000);
        });
}


function applyDefaultOptions(o){
    return {

    };
}

Function.prototype.curry = function() {
    var fn = this, args = Array.prototype.slice.call(arguments);
    return function() {
        return fn.apply(this, args.concat(Array.prototype.slice.call(arguments)));
    };
};