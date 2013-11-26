var util=require('util');

module.exports.collectProperties=function(){
	var newObj={};
	for(var i=0;i<arguments.length;i++){
		for(var key in arguments[i]){
			if(arguments[i].hasOwnProperty(key)){
				newObj[key]=arguments[i][key];
			}
		}
	}
	return newObj;
};

module.exports.curry=function(fn){
	var args=Array.prototype.slice.call(arguments,1);
	return function(){
		return fn.apply(this,args.concat(Array.prototype.slice.call(arguments)));
	};
};

module.exports.log={
	warn: '\x1B[33mWARN\x1B[39m',
	error: '\x1B[31mERROR\x1B[39m'
};