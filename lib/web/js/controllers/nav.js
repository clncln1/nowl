/**
 * Created by D060785 on 30.09.13.
 */


app.controller("NavCtrl", ["$scope", "$http", "global", function($scope, $http, global){
    $scope.currentTab = "dashboard";
    $scope.global = global;

    $scope.tab = function(name){
        $scope.currentTab = name;
    };

    $scope.$on("handleBroadcast", function(event, data){
        $scope.$apply();
    });

    $scope.showServer = function(server){
        $scope.currentTab = "server_detail";
        $scope.global.currentServer = server;
    };

}]);
