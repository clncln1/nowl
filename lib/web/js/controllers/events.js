/**
 * Created with JetBrains WebStorm.
 * User: D060785
 * Date: 26.09.13
 * Time: 13:13
 * To change this template use File | Settings | File Templates.
 */



app.controller("eventsCtrl", ["$scope", "$http", "global", function($scope, $http, global){
    $scope.global = global;
    $scope.eventDetail = {
        log: []
    };


    function setEventStatus(newStatus){
        if(!global.events || !newStatus) return;
        newStatus.forEach(function(item){
            global.events.forEach(function(event){
                if(event.id == item.id || event.id == item.ID_event){
                    event.currentStatus = item.status;
                }
            });
        });
    }

    function setEventTypes(){
        if(!global.events || !global.eventTypes) return;
        global.events.forEach(function(item){
            item.eventType = global.eventTypes.reduce(function(type, prev){
                return type.id == item.eventTypeId ? type : prev
            });
            item.server = global.servers.reduce(function(server, prev){
                return server.ID_client == item.clientId ? server : prev;
            });
        });
    }

    $http.get("allEventStatus").success(function(res){
        setEventStatus(res);
        global.allEventStatus = res;
    });

    $scope.$on("handleBroadcast", function(event, data){
        if(data.type == "eventTypes"){
            global.eventTypes = data.message;
            global.eventTypes.forEach(function(item){
                item.props.forEach(function(prop){
                    prop.value = prop.default_value;
                });
            });
            setEventTypes();
        }
        else if(data.type == "events"){
            global.events = data.message;
            setEventTypes();
            setEventStatus(global.allEventStatus);
            window.global = global;
        }
        else if(data.type == "event" && data.message.data){
            setEventStatus([data.message.data]);
            if($scope.eventDetail.event && $scope.eventDetail.event.id == data.message.data.id){
                $scope.eventDetail.log.unshift(data.message.data);
            }
        }

        $scope.$apply();
    });

    $scope.getServer = function(clientId){
        if(!global.servers || !global.servers.length) return {};
        return global.servers.reduce(function(item, prev){
            return item.ID_client == clientId ? item : prev;
        });
    };

    $scope.createEvent = function(eventType){
        var event = {
            eventTypeId: eventType.id,
            is_warning: eventType.is_warning,
            is_critical: eventType.is_critical,
            props: eventType.props
        };
        $http.put("events/"+eventType.clientId, event).success(function(res){
            console.log(res)
        });
    };
    $scope.removeEvent = function(event){
        $http['delete']("events/"+event.clientId+"/"+event.id);
    };
    $scope.showEventLog = function(event){
        $scope.eventDetail.event = event;
        $http.get("eventLog/"+event.id).success(function(res){
            $scope.eventDetail.log = res;
        });
    };
}]);