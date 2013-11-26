/**
 * Created with JetBrains WebStorm.
 * User: D060785
 * Date: 26.09.13
 * Time: 13:13
 * To change this template use File | Settings | File Templates.
 */

app.controller("serverDetailCtrl", ["$scope", "$http", "global", function($scope, $http, global){
    $scope.global = global;
    $scope.currentStatus = [];

    var graph;
    $scope.level = {
        currentLevel: 0,
        levels: [
            {index: 0, name: "past hour", step: 5000},
            {index: 1, name: "past day", step: 60*1000},
            {index: 2, name: "past month", step: 60*60*1000}
        ]
    }

    $scope.$on("handleBroadcast", function(event, data){
        $scope.$apply();
        //console.log("got", data, data.message.data.length, global.currentServer)
        if(data.type == "status" && data.message.data && data.message.data.length && global.currentServer && data.message.clientId == global.currentServer.ID_client){
            updateArray($scope.currentStatus, data.message.data);
            console.log($scope.currentStatus);
            graph.push(data.message.data);
            $scope.$apply();
        }
    });

    $scope.drawGraph = function(){
        if(!global.currentServer) return;
        graph && graph.clear();
        graph = new Horizon('#demo',['cpu', 'memory', 'socket'],"status/"+$scope.level.currentLevel+"/"+global.currentServer.ID_client,{
            extent: [[0,1], [0,1], null],
            step: $scope.level.levels[$scope.level.currentLevel].step,
            format: [",.2p",",.2p",",.2s"],
            colors: [["#74c476","#31a354"],["#74c476","#74c476"],["#74c476","#bae4b3"]],
            labels: ['CPU: ', 'memory: ', 'sockets: ']
        });
    }
    $scope.$watch("global.currentServer", $scope.drawGraph);

}]);