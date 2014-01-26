/**
 * Created with IntelliJ IDEA.
 * User: Johannes
 * Date: 18.11.13
 * Time: 19:50
 * To change this template use File | Settings | File Templates.
 */
Horizon3D.Chart = function(){
    this.labelOffset = {
        x: 54,
        z: 0
    };

    return this;
};

Horizon3D.prototype.createChart = function(data, options){
    var _options = {
        height: 10,
        updateInterval: 1,
        material: false,
        scaleX: 1,
        parentPosition: new THREE.Vector3(),
        animMaterial: false,
        maxScale: 2.2,
        minScale: 0.02
    };

    var chart = new Horizon3D.Chart();
    chart.position = new THREE.Vector3();

    setOptions(_options, options);

    var point = {}

    var geometry = new THREE.BufferGeometry();

    Drawer.drawGeometry(geometry, _options.height, data, point);

    var mesh = new THREE.Mesh( geometry, _options.material );
    mesh.scale.y = 0.1;

    var animMesh = Drawer.drawAnimGeometry(
        new THREE.CubeGeometry(3, _options.height/2,0.1), _options.animMaterial, _options.height/2);
    animMesh.rotation.x = -1/2*Math.PI;
    animMesh.scale.y = 0.99;

    var label = _options.label;
    label.offset = new THREE.Vector3();

    chart.rotateX = function(alpha){
        mesh.rotation.x = alpha;
        animMesh.rotation.x = alpha;
    };

    chart.scaleZ = function(z){
        mesh.scale.z = z;
    };

    chart.scaleY = function(y){
        mesh.scale.y = y;
    };

    chart.setVisible = function(visible){
        mesh.visible = visible;
        animMesh.visible = visible;
        label.visible = visible;
    };

    var updateBuffer = new Float32Array(12*3);
    var b = 0.25;
    var currentStep = data.timestamps.length;
    var overwriteThisStep = false;
    var tempPoint = {
        prev: new THREE.Vector2(),
        cur: new THREE.Vector2(point.cur.x, point.cur.y),
        next: new THREE.Vector2(point.cur.x, point.cur.y)
    };

    function update(){
        var index = data.timestamps.length - 1;

        if(data.timestamps[index] > point.cur.x+0.1){

            //fix previous point (we didn't know the current at that time)
            point.next.set(data.timestamps[index], data.values[index] * _options.height);
            Drawer.setPosition(updateBuffer, 0, point.prev, point.cur, point.next,  b);

            point.prev.copy(point.cur);
            point.cur.copy(point.next);
            point.next.set(point.cur.x + 1, point.cur.y);

            Drawer.setPosition(updateBuffer, 12, point.prev, point.cur, point.next,  b);
            Drawer.setPoint(updateBuffer, 24, point.cur.x, point.cur.y/2, point.cur.y,  4);

            animMesh.morphTargetInfluencesTarget[ 0 ] = 1-point.cur.y/_options.height;
            animMesh.morphTargetInfluencesTarget[ 1 ] = point.cur.y/_options.height;

            var change = (point.cur.y - point.prev.y) / point.prev.y;
            var value = point.cur.y / _options.height;

            label.valueElement.text(Math.round(value * 100) / 100);
            label.valueChangeElement
                .text(Math.round(change * 100) + "%")
                .addClass(change >= 0 ? "green" : "red")
                .removeClass(change < 0 ? "green" : "red");

            overwriteThisStep = false;
            tempPoint.prev.copy(point.prev);
            tempPoint.cur.copy(point.cur);
            tempPoint.next.copy(point.next);
        }
        else {
            Drawer.setPosition(updateBuffer, 0, tempPoint.prev, tempPoint.cur, tempPoint.next,  b);
            tempPoint.prev.copy(tempPoint.cur);
            tempPoint.cur.copy(tempPoint.next);
            tempPoint.next.set(tempPoint.cur.x + 1, tempPoint.cur.y);
            Drawer.setPosition(updateBuffer, 12, tempPoint.cur, tempPoint.cur, tempPoint.next,  b);
            Drawer.setPoint(updateBuffer, 24, tempPoint.cur.x, tempPoint.cur.y/2, tempPoint.cur.y,  4);

            overwriteThisStep = true;
        }
    }

    function completeUpdateAnim(){
        geometry.attributes.position.update(currentStep * 12, updateBuffer);
        if(!overwriteThisStep) currentStep++;
    }

    var completedAnimation = true;
    var lastUpdateTime = 0;

    var lineChart = new Horizon3D.LineChart();
    chart.switch = function(state){   // 0 = linechart, 1 = completely normal (bar) chart
        chart.rotateX(-1/2 * Math.PI * (2-state));
        chart.scaleY(state);
        chart.scaleZ(1-state);

        label.offset.x = state * chart.labelOffset.x + (1-state) * lineChart.labelOffset.x;
        label.offset.z = state * chart.labelOffset.z + (1-state) * (-label.targetPosition + lineChart.labelOffset.z);
        label.scale.x = label.scale.y = label.scale.z = (state * 1/4.3 + (1-state) * 1/5.7);
    };

    chart.render = function(time){
        animMesh.morphTargetInfluences[1] = animMesh.morphTargetInfluences[1] +(animMesh.morphTargetInfluencesTarget[1] - animMesh.morphTargetInfluences[1]) / 4;
        animMesh.morphTargetInfluences[0] = animMesh.morphTargetInfluences[0] +(animMesh.morphTargetInfluencesTarget[0] - animMesh.morphTargetInfluences[0]) / 4;

        mesh.position.set(-time * _options.scaleX, 1, 0)
            .add(_options.parentPosition)
            .add(chart.position);

        mesh.scale.x = _options.scaleX;

        animMesh.position.set(2, 1, 0)
            .add(_options.parentPosition)
            .add(chart.position);

        label.position.copy(label.offset)
            .add(_options.parentPosition)
            .add(chart.position);

        if(time - lastUpdateTime > _options.updateInterval){
            lastUpdateTime = time;
            completedAnimation = false;
            update();
        }

        if(!completedAnimation && time - lastUpdateTime > 0.3){
            completeUpdateAnim();
            completedAnimation = true;
        }

    };
    chart._options = _options;

    this.scene.add(mesh);
    this.scene.add(animMesh);
    this.sceneCSS.add(label);

    return chart;
};