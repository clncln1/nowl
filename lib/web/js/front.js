/**
 * Created with JetBrains WebStorm.
 * User: D060785
 * Date: 26.09.13
 * Time: 09:47
 * To change this template use File | Settings | File Templates.
 */

var app = angular.module('app',['ngAnimate']);

//communication between different controllers
app.run(['$rootScope', function($rootScope) {
    /*
     Receive emitted message and broadcast it.
     Event names must be distinct or browser will blow up!
     */
    $rootScope.$on('handleEmit', function(event, args) {
        $rootScope.$broadcast('handleBroadcast', args);
    });
}]);


app.factory('global', ['$rootScope', function($rootScope) {
    return new function(){
        var that = this;
        this.servers = [];
        var socket;

        var numTabs = 5, i = 0;
        $rootScope.$on("$includeContentLoaded", function(event,b){
            if(++i == numTabs){
                socket = io.connect(location.host);
                socket.on('connect', function(){
                    console.log("connected");
                    socket.emit("register_browser", {});
                })
                socket.on('browser_update', function (data) {
                    console.log(data);

                    switch(data.type){
                        case "servers":
                            that.servers.length = 0;
                            data.message.forEach(function(item){
                                if(item.ips) item.ips = JSON.parse(item.ips);
                                that.servers.push(item);
                            });
                            break;

                    }
                    $rootScope.$broadcast('handleBroadcast', data);
                });
            }
        });
        this.send = function(message){
            socket.emit("browser_message", message);
        }
    }();
}]);

function addZero(n){
    return parseInt(n)<10? '0'+parseInt(n):''+n;
}
app.filter('beautifiedTime', function() {
    return function(time) {
        var hours = Math.floor(time / 3600);
        var minutes = Math.floor(time % 3600 / 60);
        var seconds = Math.floor(time % 60);

        if(hours > 0) minutes = addZero(minutes)
        if(hours > 0) hours = hours + ":";
        return (hours + minutes + ":"+ addZero(seconds));
    };
});
app.filter('beautifiedDate', function() {
    return function(input) {
        if(input < 1500000000) input *= 1000;  //input is in seconds, not milliseconds
        var date = new Date(input);
        var result = addZero(date.getDate())+"."+ addZero(date.getMonth()+1)+"."+ date.getFullYear()+" "+addZero(date.getHours())+":"+addZero(date.getMinutes())+":"+addZero(date.getSeconds());
        return result;
    };
});
app.filter('percent', function() {
    return function(input) {
        return (input && typeof(input) == "number" && input <= 1) ? Math.round(input * 1000) / 10 + "%" : input;
    };
});

function updateArray(array, data){
    array.length = 0;
    data.forEach(function(item){
        array.push(item)
    });
    return array;
}