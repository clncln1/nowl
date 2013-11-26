/**
 * Created by D060785 on 30.09.13.
 */
var Horizon = function(target, values, getDataUrl, options){
    var that = this;
    var buffers = values.map(function(){
        var a = [0];
        a.added = 0;
        return a;
    });
    function createArray(value){
        return values.map(function(){ return value; })
    }

    var options = {
        extent: options.extent || [0, 1],
        format: options.format || ",.2p",
        colors: options.colors || ["#74c476","#74c476"],
        labels: options.labels || values,
        height: options.height || 80,
        length: options.length || 1040,
        step: options.step || 5000
    };

    options.extent = Array.isArray(options.extent) && Array.isArray(options.extent[0]) ? options.extent : createArray(options.extent);
    options.format = Array.isArray(options.format) ? options.format : createArray(options.format);
    options.colors = Array.isArray(options.colors) && Array.isArray(options.colors[0]) ? options.colors : createArray(options.colors);
    options.labels = Array.isArray(options.labels) ? options.labels : createArray(options.labels);

    var startBuffers = values.map(function(){ return []; })
    var context;
    var step = options.step; // Distance between data points in milliseconds
    var length = options.length;// Number of data points

    //get initial data
    $.get(getDataUrl+"/" + length*step/1000 +"?_="+(new Date().getTime()), function(data){
        var currentValues = [];
        var secs = step / 1000; //result timestamps are in secs

        data.forEach(function(value){
            var index = values.indexOf(value.name);

            if(index > -1){
                if(currentValues[index]){
                    //put in previous value again as there is no value for this step
                    var num = Math.floor(value.time / secs) - Math.ceil(currentValues[index].time / secs) +1;

                    for(var i = 0; i<num; i++){
                        startBuffers[index].push(currentValues[index].value);
                    }
                    num > 0 && (currentValues[index] = value);
                } else {
                    currentValues[index] = value;
                }
            }
        });
        init();
    });


    function metric(name, index) {
        var metric = context.metric(function(start, stop, step, callback) {
            var result = [];

            // convert start & stop to milliseconds
            start = +start;
            stop = +stop;

            var i = 0, buffer = buffers[index];
            if(startBuffers[index]){
                console.log((stop - start) / step, startBuffers[index].length);
                var zeros = new Array(Math.max(Math.floor((stop - start) / step) - startBuffers[index].length, 0));

                result = zeros.concat(startBuffers[index]);
                buffer[0] = startBuffers[index][startBuffers[index].length - 1];
                startBuffers[index] = false;
            } else {
                while(stop > start){
                    result.push(buffer[i])
                    //console.log(buffer[Math.min(i, buffer.added)], (stop - start) / step)

                    stop -= step;
                    i= Math.min(i++, buffer.added);
                }
            }
            buffer.length = 1;
            buffer.added = 0;

            callback(null, result);
        });
        return metric;
    }



    function init(){
        context = cubism.context()
            .clientDelay(0)
            .serverDelay(0)
            .step(step) // Distance between data points in milliseconds
            .size(length) // Number of data points


        var horizon = context.horizon()
            .extent(function(data, index){
                return options.extent[index];
            })
            .format(function(data, index){
                return options.format[index];
            })
            .colors(function(data, index){
                return options.colors[index];
            })
            .title(function(data, index){
                return " " + options.labels[index] + " ";
            })
            .height(options.height);

        d3.select(target).append("div") // Add a vertical rule to the graph
            .attr("class", "rule")
            .call(context.rule());

        var axis = context.axis().tickSubdivide(6).orient("top").tickSize(2,1);

        if(step < 10000){
            axis.ticks(d3.time.minutes, 10);
        } else if(step < 60*1000+1000){
            axis.ticks(d3.time.hours, 2);
        } else {
            axis.ticks(d3.time.days, 3);
        }

        d3.select(target)
            .append("div")
            .attr("class", "axis")
            .call(axis);

        d3.select(target)
            .selectAll(".horizon")
            .data(values.map(metric))
            .enter()
            .insert("div", ".bottom")        // Insert the graph in a div. Turn the div into
            .attr("class", "horizon")        // a horizon graph and format to 2 decimals places.
            .call(horizon);

        context.on("focus", function(i) {
            d3.selectAll(".value").style("right",   // Make the rule coincide with the mouse
                i == null ? null : context.size() - i + "px");
        });

        $('.rule > .line').css({
            background: "#999",
            top: 27
        });
    }
    this.push = function(data){
        //console.log(data)
        //console.log(buffers)
        data.forEach(function(value){
            var index = values.indexOf(value.name)
            if(index > -1){
                buffers[index].unshift(value.value);
                buffers[index].added++;
            }
        });
        //console.log(buffers)

    }
    this.clear = function(){
        d3.select(target)
            .selectAll(".horizon")
            .remove();
        d3.select(target)
            .selectAll(".rule")
            .remove();
        d3.select(target)
            .selectAll(".axis")
            .remove();
    }
}
