/**
 * Created with IntelliJ IDEA.
 * User: Johannes
 * Date: 18.11.13
 * Time: 19:50
 * To change this template use File | Settings | File Templates.
 */

Horizon3D.LineChart = function(){
    this.labelOffset = {
        x: 39,
        z: 4.7
    };
    this.titleLabelOffset = {
        x: 39,
        z: 3
    };

    return this;
};

Horizon3D.prototype.createLineChart = function(data, options){
    var eps = 0.000001;
    var that = this;

    var _options = {
        name: "chart",
        height: 10,
        updateInterval: 2,
        scaleX: 1,
        startScaleX: 1,
        material: false,
        animMaterial: false,
        maxScale: 2.2,
        minScale: 0.02
    };

    var lineChart = new Horizon3D.LineChart();

    lineChart.position = new THREE.Vector3(60, 0, -50+this.charts.length * 50);

    setOptions(_options, options);

    var old = [];

    var subCharts = [];
    var labels = [];

    var material = _options.material || new THREE.MeshLambertMaterial( {
        color: 0xffffff, side: THREE.DoubleSide, vertexColors: THREE.VertexColors
    } );

    var animMaterial = _options.animMaterial ||new THREE.MeshLambertMaterial( { color: 0x444411, morphTargets: true } );

    var geometry = new THREE.BufferGeometry(),
        mesh = new THREE.Mesh( geometry, material );

    Drawer.drawLineGeometry(geometry, _options.height, _options.startScaleX, data, old);

    mesh.rotation.x = Math.PI;
    this.scene.add(mesh);

    var chartChangeAnimation;

    var time = data[0].timestamps[data[0].timestamps.length - 1]; //assume that is the latest entry
    var lastUpdateTime = time;

    var labelHeight = 3.5;

        //init labels
    data.forEach(function(item, index){
        var element	= $('<div>').css({width: '400px', height: '100px'});
        $('<h2>').text(item.name).addClass("sub-chart-name-small").css("color", item.color.getStyle()).appendTo(element);

        var label = new THREE.CSS3DObject( element[0] );
        label.rotation.x = -1/2*Math.PI;
        label.scale.multiplyScalar(1/5.7);
        label.index = index;

        that.sceneCSS.add(label);
        labels.push(label);

        label.valueElement = $('<h2>').addClass('sub-chart-value').appendTo(element);
        label.valueChangeElement = $('<h2>').addClass('sub-chart-value').appendTo(element);
    });

    updateLabelPosition();
    function sortItemsByValues(a, b){
        if(a.value == b.value) return 0;
        return a.value > b.value ? 1 : -1;
    }

    function updateLabelPosition(){
        var lastStepData = [];
        data.forEach(function(item, index){
            lastStepData.push({
                index: index,
                value: item.values[item.values.length-1]
            });
        });

        lastStepData.sort(sortItemsByValues);

        var lastValue = - 10;
        lastStepData.forEach(function(item){
            var pos = Math.max(item.value * _options.height, lastValue + labelHeight); // move up if another one is close

            data[item.index].labelPosition = pos;
            lastValue = pos;

            var label = labels[item.index];
            label.valueElement.text(Math.round(item.value *100)/100);
            label.animation = new Animation(300, label.targetPosition || 0, pos);
            label.targetPosition = pos;
        });
    }

    lineChart.render = function(dif){
        time += dif / 1000;

        if(scaleAnimation && scaleAnimation.isRunning())
            _options.scaleX = scaleAnimation.get();


        mesh.position.x = lineChart.position.x - time * _options.scaleX * _options.startScaleX;
        mesh.position.y = lineChart.position.y;
        mesh.position.z = lineChart.position.z;

        mesh.scale.x = _options.scaleX;

        if(time - lastUpdateTime > _options.updateInterval){
            lastUpdateTime = time;
            update();
        }

        subCharts.forEach(function(chart){
            chart._options.scaleX = _options.scaleX * _options.startScaleX;
            chart.render(time);
        });

        var now = Date.now();
        if(chartChangeAnimation && chartChangeAnimation.isRunning()){
            var target = chartChangeAnimation.get(now);
            subCharts.forEach(function(chart, index){
                chart.switch(target);

                chart.position.z = -(index+1)*_options.height/2*target+_options.height * data.length /4 *target;
            })
        }

        if(mesh.visible){
            labels.forEach(function(label){
                label.position
                    .set(lineChart.labelOffset.x, 0, -label.animation.get() + lineChart.labelOffset.z)
                    .add(lineChart.position);
            });
        }

        graphTitleLabel.position
            .set(lineChart.titleLabelOffset.x, 0, lineChart.titleLabelOffset.z - _options.height)
            .add(lineChart.position)
    };

    var scaleAnimation;
    var scaleTarget = 1;
    var posUpdateBuffer = new Float32Array(Drawer.numLineTriangles * 3);

    lineChart.scaleX = function(delta){
        scaleTarget = THREE.Math.clamp(scaleTarget * Math.pow(1.1, delta),
            _options.minScale / _options.startScaleX, _options.maxScale / _options.startScaleX);

        var start = (scaleAnimation && scaleAnimation.isRunning()) ? scaleAnimation.get() : _options.scaleX;
        scaleAnimation && scaleAnimation.cancel();

        scaleAnimation = new Animation(1000, start, scaleTarget);

        scaleAnimation.onComplete(function(){
            //redraw graph using new base scale to improve visual quality of lines
            _options.startScaleX *= _options.scaleX;
            _options.scaleX = scaleTarget = 1;

            old = [];
            Drawer.drawLineVertices(posUpdateBuffer, false, false, _options.height, _options.startScaleX, data, old);
            step = data[0].timestamps.length;

            data.forEach(function(item, lineId){item.lastOneWasReal = false});
            geometry.attributes.position.update(0, posUpdateBuffer);

        });
    };

    var lineChartShown = true;
    lineChart.showDetailView = function(){
        if(lineChartShown){
            mesh.visible = false; //hide line chart

            //create sub graphs
            if(!subCharts.length){
                for(var i = 0; i<data.length; i++){
                    var chart = that.createChart(data[i], {
                        material: material,
                        animMaterial: animMaterial,
                        parentPosition: lineChart.position,
                        height: _options.height,
                        label: labels[i]
                    });

                    that.renderer.initWebGLObjects(that.scene);
                    subCharts.push(chart);
                }
            } else {
                subCharts.forEach(function(chart){
                    chart.setVisible(true);
                })
            }

            labels.forEach(function(label){
                label.valueChangeElement.show();
            });

            switchCharts(false);
        } else {
            labels.forEach(function(label){
                label.valueChangeElement.hide();
            });

            switchCharts(true);
        }
        return false;
    };


    function switchCharts(showLineChart){
        lineChartShown = showLineChart;
        var defaultStart = showLineChart ? 1-eps : 0+eps;
        var end = showLineChart ? 0+eps : 1-eps;

        var start = chartChangeAnimation ? chartChangeAnimation.get() : defaultStart;
        chartChangeAnimation = new Animation(1000, start, end);

        chartChangeAnimation.onComplete(function(){
            if(showLineChart){
                subCharts.forEach(function(chart){
                    chart.setVisible(false);
                });
                mesh.visible = true;
            }
        })
    }

    var numLines = data.length;
    var updateBuffer = new Float32Array(6*3*numLines);
    var b = 0.25;

    var step = data[0].timestamps.length;

    function update(){
        data.forEach(function(item, lineId){
            var point = old[lineId];

            var index = item.timestamps.length - 1;

            if(item.timestamps[index] > point.cur.x / _options.startScaleX + 0.1){
                //fix previous point (we didn't know the current at that time)
                point.next.set(item.timestamps[index] * _options.startScaleX, item.values[index] * _options.height);
                Drawer.setLinePosition(updateBuffer, lineId*6, point.prev, point.cur, point.next,  b, 0);

                point.prev.copy(point.cur);
                point.cur.copy(point.next);
                point.next.set(point.cur.x + 1, point.cur.y);

                Drawer.setLinePosition(updateBuffer, lineId*6+numLines*6, point.prev, point.cur, point.next,  b, 0);
                Drawer.setLinePosition(updateBuffer, lineId*6+numLines*12, point.prev, point.cur, point.next,  0, 0);

                item.lastOneWasReal = true;
            }
            else {
                if(item.lastOneWasReal){
                    Drawer.setLinePosition(updateBuffer, lineId*6, point.prev, point.cur, point.next, b, 0);
                } else {
                    Drawer.setPoint(updateBuffer, lineId*6, point.cur.x, 0, point.cur.y, 2);
                }

                Drawer.setPoint(updateBuffer, lineId*6+numLines*6, point.cur.x, 0, point.cur.y, 2);
                Drawer.setPoint(updateBuffer, lineId*6+numLines*12, point.cur.x, 0, point.cur.y, 2);
                item.lastOneWasReal = false;
            }

        });
        //labels
        updateLabelPosition();
        geometry.attributes.position.update(step * 6 * numLines, updateBuffer);
        step++;
    }

    //title label
    var element	= $('<div>').css({width: '400px', height: '100px'});
    $('<h2>').text(_options.name).addClass("chart-title").appendTo(element);
    $('<a>').text('expand').click(lineChart.showDetailView).appendTo(element);

    var graphTitleLabel = new THREE.CSS3DObject( element[0] );
    graphTitleLabel.rotation.x = -1/2*Math.PI;
    graphTitleLabel.scale.multiplyScalar(1/4.7);

    that.sceneCSS.add(graphTitleLabel);

    this.charts.push(lineChart);

    return lineChart;
};