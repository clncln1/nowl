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


    $scope.$on("handleBroadcast", function(event, data){
        if(data.type == "status" && data.message.data && data.message.data.length){
            //updateArray($scope.currentStatus, data.message.data);
            //console.log($scope.currentStatus);
            var gData = [];
            data.message.data.forEach(function(item){
                if(item.name == $scope.quickview.statusType)
                    gData.push({
                        name: data.message.clientId,
                        timestamp: item.timestamp,
                        value: item.value
                    });
            });
            graph && graph.push(gData);
        }
        if(data.type == "servers"){
            $scope.drawGraph();
        }

        $scope.$apply();
    });



    $scope.drawGraph = function(){
        if(!$scope.global.servers || !$scope.global.servers.length) return;
        var names = global.servers.map(function(server){return server.ID_client; });
        var labels = global.servers.map(function(server){return server.hostname; });
        console.log(names, labels, $scope.quickview.statusType)

        var current = $scope.quickview.statusTypes.indexOf($scope.quickview.statusType);
        graph && graph.clear();
        graph = new Horizon('#stat_overview',names,"allClientStatus/"+$scope.quickview.statusType,{
            extent: $scope.quickview.extends[current],
            format: $scope.quickview.formats[current],
            labels: labels,
            height: 30,
            length: 900
        });
    }
}]);