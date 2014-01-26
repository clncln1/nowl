/**
 * Created with JetBrains WebStorm.
 * User: D060785
 * Date: 26.09.13
 * Time: 13:13
 * To change this template use File | Settings | File Templates.
 */


app.controller("dashboardCtrl", ["$scope", "$http", "global", function($scope, $http, global){
    $scope.abc = "abc";
    $scope.global = global;

    $scope.quickview = {
        statusType: "cpu",
        statusTypes: ["cpu", "memory", "socket"],
        formats: [",.2p", ",.2p", ",.2s"],
        extends: [[0,1],[0,1],[0,1000]]
    };

    var graph;
    var horizon, serverIds;
    var graphData = [];

    $scope.$on("handleBroadcast", function(event, data){
        if(data.type == "status" && data.message.data && data.message.data.length){
            data.message.data.forEach(function(item){
                if(serverIds[data.message.clientId] === undefined) return;
                if(!graphData[item.name]) return;

                var dataItem = graphData[item.name][serverIds[data.message.clientId]];
                dataItem.timestamps.push(item.timestamp/1000 - graphData[item.name].graphOffset);
                dataItem.values.push(item.value);
            });
        }
        if(data.type == "servers"){
            $scope.drawGraph();
        }

        $scope.$apply();
    });

    $scope.drawGraph = function(){
        if(!$scope.global.servers || !$scope.global.servers.length) return;

        graphData = [];
        serverIds = [];

        var watchedProperties = ['cpu', 'memory'];

        horizon = new Horizon3D({target: $('#horizon')[0]});

        watchedProperties.forEach(function(prop){
            graphData[prop] = [];
            var data = graphData[prop];

            global.servers.forEach(function(server){
                serverIds[server.ID_client] = data.length;
                server.color = server.color || new THREE.Color(Math.random() *0xffffff);

                data.push({
                    name: server.hostname,
                    timestamps: [0],
                    values: [0],
                    color: server.color
                });
            });


            $.get("allClientStatus/"+prop+"/" + 10000 +"?_="+Date.now(), function(newData){
                if(!newData.length) return;
                data.graphOffset = newData[0].time;

                newData.forEach(function(item){
                    if(serverIds[item.name] === undefined) return;
                    if(!data) return;

                    data[serverIds[item.name]].timestamps.push(item.time - data.graphOffset);
                    data[serverIds[item.name]].values.push(item.value);
                });

                horizon.createLineChart(data, {
                    height: 30,
                    startScaleX: 0.5,
                    name: prop
                });
            });
        });
    }
}]);