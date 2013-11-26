/**
 * Created with JetBrains WebStorm.
 * User: D060785
 * Date: 26.09.13
 * Time: 13:14
 * To change this template use File | Settings | File Templates.
 */


app.controller("adminCtrl", ["$scope", "$http", "global", function($scope, $http, global){
    $scope.global = global;

    $scope.emails = {levels: [
        {index: 0, name: "none"},
        {index: 1, name: "critical events"},
        {index: 2, name: "warnings"},
        {index: 3, name: "all events"}
    ]};

    $http.get("user").success(function(res){
        global.user = res;
    });

    $scope.submitForm = function(event){
        event.preventDefault();
        var btn = $('#userSubmitBtn');
        btn.button('loading');

        var request = new XMLHttpRequest();
        request.open("POST", "/user");
        request.onloadend = function(result, b, c){
            btn.button('success');
            btn.addClass("btn-success");
            btn.removeClass("btn-danger");

            $http.post("sendTestMail").success(function(res){
                global.user.email_working = !res.error;
                global.user.email_not_working = !!res.error;
            });
            setTimeout(function(){
                btn.button('reset');
                btn.removeClass("btn-success");

            }, 2000);
        };
        request.onerror = function(){
            btn.removeClass("btn-success");
            btn.addClass("btn-danger");
        };
        request.send(new FormData($('#userForm')[0]));
    };



}]);