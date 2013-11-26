/**
 * Created with JetBrains WebStorm.
 * User: D060785
 * Date: 26.09.13
 * Time: 10:40
 * To change this template use File | Settings | File Templates.
 */


var app = angular.module('app',['ngAnimate']);

app.controller("loginCtrl", ["$scope", "$http", function($scope, $http){
    $scope.event = {};
    $scope.createAccount = false;
    $scope.wrongPassword = false;

    /*$scope.doCreateAccount = function(event){
        $scope.wrongPassword = false;
        var formElement = document.getElementById("createAccountForm");
        $http.post("/createAccount", new FormData(formElement)).success(function(){
            $scope.createAccount = false;
        });
    };*/

    $scope.doLogin = function(event){
        event.preventDefault();
        $scope.wrongPassword = false;

        var request = new XMLHttpRequest();
        request.open("POST", "/dologin");
        request.onloadend = function(result, b, c){
            if(request.responseText == "authenticated"){
                location.href = "/";
            } else {
                $scope.wrongPassword = true;
                $scope.$apply();
            }
        };
        request.send(new FormData($('#loginForm')[0]));
    };



}]);


app.controller("NavCtrl", ["$scope", "$http", function($scope, $http){
    $scope.currentTab = "dashboard";


}]);

