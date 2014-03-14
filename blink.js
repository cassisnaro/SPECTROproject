var nameCalib='calib';
var nameMeasures='measure';

var connectionId = -1;
var readBuffer = "";
var ready=false;
var available=true;
var tempStep=0;
var tempValue=0;

var calibrating=true;
var recording=false;

var currentPosition=0;
var desiredPosition=100;

var currentPositionDrawing;
var positionBlue=0;
var positionRed=0;
var blueActivated=false;
var redActivated=false;

var calib = new Float32Array(3200);
var calibMeasures = new Uint16Array(3200);
var measure = new Float32Array(3200);
var measureMeasures = new Uint16Array(3200);

var plotArrayCalib=[];
var plotArrayMeasure=[];

var rectangles=[];

var id;
var mode=0;
	//0:stand by
	//1:Rotate and calibrate
	//2:Moving to position
	//3:Moving to position and recording


function wavelengthToColor(wavelength) {
    var r,
        g,
        b,
        alpha,
        colorSpace,
        wl = wavelength,
        gamma = 1;


    if (wl >= 380 && wl < 440) {
        R = -1 * (wl - 440) / (440 - 380);
        G = 0;
        B = 1;
   } else if (wl >= 440 && wl < 490) {
       R = 0;
       G = (wl - 440) / (490 - 440);
       B = 1;  
    } else if (wl >= 490 && wl < 510) {
        R = 0;
        G = 1;
        B = -1 * (wl - 510) / (510 - 490);
    } else if (wl >= 510 && wl < 580) {
        R = (wl - 510) / (580 - 510);
        G = 1;
        B = 0;
    } else if (wl >= 580 && wl < 645) {
        R = 1;
        G = -1 * (wl - 645) / (645 - 580);
        B = 0.0;
    } else if (wl >= 645 && wl <= 780) {
        R = 1;
        G = 0;
        B = 0;
    } else {
        R = 0;
        G = 0;
        B = 0;
    }

    colorSpace = ["rgb(" + (R * 100) + "%," + (G * 100) + "%," + (B * 100) + "%)", R, G, B]

    // colorSpace is an array with 5 elements.
    // The first element is the complete code as a string.  
    // Use colorSpace[0] as is to display the desired color.  
    // use the last four elements alone or together to access each of the individual r, g, b and a channels.  
   
    return colorSpace;
   
}


function initialyzePlotsArray(){
	for(var i=0; i<3200; i+=1){
		plotArrayCalib.push([i, 0]);
	}
}

function recordReading(reading){
	var uint16View = new Uint16Array(reading);
	var value =  uint16View[0];
	if (value===undefined) {
		console.log('problem');
	}else{
		recordInt(value);
	}
}

function recordInt(readingInt){
	if(calibrating){
		if (calibMeasures[currentPosition]==0){
			calib[currentPosition]=readingInt;
			calibMeasures[currentPosition]=1;
		}else{
			calib[currentPosition]=calibMeasures[currentPosition]*calib[currentPosition]+readingInt;
			calibMeasures[currentPosition]+=1;
			calib[currentPosition]/=calibMeasures[currentPosition];
		}
		plotArrayCalib[currentPosition]=[currentPosition, calib[currentPosition]];
		$.plot("#calib", [ plotArrayCalib ]);
	}else{
		if(recording){
			if (measureMeasures[currentPosition]==0){
				measure[currentPosition]=readingInt;
				measureMeasures[currentPosition]=1;
			}else{
				measure[currentPosition]=measureMeasures[currentPosition]*measure[currentPosition]+readingInt;
				measureMeasures[currentPosition]+=1;
				measure[currentPosition]/=measureMeasures[currentPosition];
			}
			var offsetToBlue=Math.abs(currentPosition-positionBlue);
			if (offsetToBlue>=3200) offsetToBlue-=3200;
			
			var redToBlue=Math.abs(positionRed-positionBlue);
			if (redToBlue>=3200) redToBlue-=3200;
			plotArrayMeasure[offsetToBlue]=[400+(offsetToBlue)*300/(redToBlue), measure[currentPosition]];
			$.plot("#measure",[ plotArrayMeasure ] );	
			
			if (rectangles[currentPosition]==undefined){
				rectangles[currentPosition] = canvasAbsorbance.display.rectangle({
					x: canvasAbsorbance.width/(redToBlue)*(offsetToBlue)+0.5,
					//y: canvasAbsorbance.height-canvasAbsorbance.height*(measure[currentPosition]/calib[currentPosition]),
					y:0.5,
					width: canvasAbsorbance.width/(redToBlue),
					height: canvasAbsorbance.height*(measure[currentPosition]/calib[currentPosition]),
					fill: wavelengthToColor(400+300*(offsetToBlue)/(redToBlue))[0]
				});
				canvasAbsorbance.addChild(rectangles[currentPosition]);
				console.log('div: '+measure[currentPosition]/calib[currentPosition]+' height: '+rectangles[currentPosition].height);
			}else{
				rectangles[currentPosition].height=canvasAbsorbance.height*measure[currentPosition]/calib[currentPosition];
				console.log('div: '+measure[currentPosition]/calib[currentPosition]+'height: '+rectangles[currentPosition].height)
			}
		}
	}
	available=true;
}


function onReceive(receiveInfo) {
	if (receiveInfo.data.byteLength===2){
		recordReading(receiveInfo.data);
  } else {
  	var oneSlotBuffer=new Uint8Array(receiveInfo.data);
  	tempStep+=1;
  	if (tempStep==2){
  		recordInt(tempValue+oneSlotBuffer[0]*256);
  		tempStep=0;
  	} else {
  		tempValue=oneSlotBuffer[0];
  	}
  }
  
};
function onError(errorInfo) {
  console.warn("Receive error on serial connection: " + errorInfo.error);
};

function onOpen(openInfo) {
  connectionId = openInfo.connectionId;
  console.log("connectionId: " + connectionId);
  if (connectionId == -1) {
    setStatus('Could not open');
    return;
  }
  setStatus('Connected');

  setPosition(0);
  
};

function setStatus(status) {
  document.getElementById('status').innerText = status;
}

function buildPortPicker(ports) {
    var eligiblePorts = ports.filter(function(port) {
    	return !port.path.match(/[Bb]luetooth/) && port.path.match(/\/dev\/tty/);
  	});

  var portPicker = document.getElementById('port-picker');
  eligiblePorts.forEach(function(port) {
    var portOption = document.createElement('option');
    portOption.value = portOption.innerText = port.path;
    portPicker.appendChild(portOption);
  });

  portPicker.onchange = function() {
    if (connectionId != -1) {
      chrome.serial.close(connectionId, openSelectedPort);
      return;
    }
    openSelectedPort();
  };
}

function openSelectedPort() {
  var portPicker = document.getElementById('port-picker');
  var selectedPort = portPicker.options[portPicker.selectedIndex].value;
  chrome.serial.connect(selectedPort, {
      bufferSize: 2,
      bitrate: 9600
    }, function (openInfo) {
				connectionId = openInfo.connectionId;
				console.log("connectionId: " + connectionId);
				if (connectionId == -1) {
					setStatus('Could not open');
					return;
				}
				setStatus('Connected');
				ready=true;
				
    });
}

function sendCommand(command){
	if (ready) {
		var buffer = new ArrayBuffer(1);
		var Uint8View=new Uint8Array(buffer);
		Uint8View[0]=command.charCodeAt();

		chrome.serial.send(connectionId,buffer,function(sendInfo){});
		available=false;
	}
}

sendValue = function(){
	sendCommand('v');
}
sendLeft = function(){
	sendCommand('l');
	if(currentPosition<0) currentPosition+=3200;
	currentPosition-=1;
	if(currentPosition<0) currentPosition+=3200;
}
sendRight = function(){
	sendCommand('r');
	currentPosition+=1;
	if(currentPosition>=3200) currentPosition-=3200;
}

moveToPosition = function(){
	var distGoingRight=desiredPosition-currentPosition;
	if (distGoingRight < 0) distGoingRight+=3200;
	var distGoingLeft=currentPosition-desiredPosition;
	if (distGoingLeft < 0) distGoingLeft+=3200;
	
	if(distGoingRight<distGoingLeft){
		sendRight();
	}else{
		sendLeft();
	}
}

onload = function() {

  chrome.serial.getDevices(function(ports) {
		buildPortPicker(ports);
		openSelectedPort();
  });
  
  chrome.serial.onReceive.addListener(onReceive);
  
  $('#Calibrate').click(function(){
  	if (mode==0){
  		mode=1;
  		available=true;
  		$(this).removeClass('btn-success');
  		$(this).addClass('btn-danger');
  		calibrating=true;
  	} else {
  	  mode=0;
  		available=true;
  		$(this).removeClass('btn-danger');
  		$(this).addClass('btn-success');
  		calibrating=false;
  		
  		chrome.storage.sync.set({'calib':calib},function(){
				console.log('saved calib');
			});
  	}
  });
  $('#Move').click(function(){
  	if (mode==0){
  		mode=2;
  		desiredPosition=positionBlue;
  		available=true;
  		$(this).removeClass('btn-success');
  		$(this).addClass('btn-danger');
  		calibrating=false;
  		recording=false;
  	} else {
  		chrome.storage.sync.set({'test': test}, function() {
          // Notify that we saved.
          console.log('Settings saved');
        });
  	  mode=0;
  		available=true;
  		$(this).removeClass('btn-danger');
  		$(this).addClass('btn-success');
  	}
  });
  $('#Record').click(function(){
  	if (mode==0){
	  	plotArrayMeasure=[];
  		mode=3;
  		desiredPosition=positionRed;
  		available=true;
  		$(this).removeClass('btn-success');
  		$(this).addClass('btn-danger');
  		calibrating=false;
  		recording=true;
  		for(var i=0; i<(positionRed-positionBlue); i+=1){
				plotArrayMeasure.push([400+i*300/(positionRed-positionBlue), 0]);
			}
  	} else {
  	  mode=0;
  		available=true;
  		$(this).removeClass('btn-danger');
  		$(this).addClass('btn-success');
  	}
  });

  $('#Left').click(sendLeft);
  $('#Right').click(sendRight);
  $('#Value').click(sendValue);
  $('#Blue').click(function(){
		positionBlue=currentPosition;
		blueActivated=true;
  });
  $('#Red').click(function(){
		positionRed=currentPosition;
		redActivated=true;
  });
  
  initialyzePlotsArray();
  
  plotMeasure=$.plot("#measure",[ plotArrayMeasure ] );
  
  var canvas = oCanvas.create({ canvas: "#canvas", background: "#fff"});

	// Center planet
	var center = canvas.display.ellipse({
		x: canvas.width / 2,
		y: canvas.height / 2,
		radius: (canvas.height * 0.8)/2,
		stroke: "5px #000",
	}).add();
	
	currentPositionDrawing = canvas.display.ellipse({
		x: Math.cos(currentPosition/3200*Math.PI*2-Math.PI/2)*(canvas.height * 0.7)/2 + canvas.width / 2,
		y: Math.sin(currentPosition/3200*Math.PI*2-Math.PI/2)*(canvas.height * 0.7)/2 + canvas.height / 2,
		radius: (canvas.height * 0.05)/2,
		stroke: "5px #000",
	}).add();
	
	bluePositionDrawing = canvas.display.ellipse({
		x: Math.cos(0/3200*Math.PI*2-Math.PI/2)*(canvas.height * 0.6)/2 + canvas.width / 2,
		y: Math.sin(0/3200*Math.PI*2-Math.PI/2)*(canvas.height * 0.6)/2 + canvas.height / 2,
		radius: (canvas.height * 0.05)/2,
		stroke: "0px #00f",
	}).add();
	redPositionDrawing = canvas.display.ellipse({
		x: Math.cos(1600/3200*Math.PI*2-Math.PI/2)*(canvas.height * 0.6)/2 + canvas.width / 2,
		y: Math.sin(1600/3200*Math.PI*2-Math.PI/2)*(canvas.height * 0.6)/2 + canvas.height / 2,
		radius: (canvas.height * 0.05)/2,
		stroke: "0px #f00",
	}).add();
	
	canvas.setLoop(function(){
		currentPositionDrawing.x=Math.cos(currentPosition/3200*Math.PI*2-Math.PI/2)*(canvas.height * 0.7)/2 + canvas.width / 2;
		currentPositionDrawing.y=Math.sin(currentPosition/3200*Math.PI*2-Math.PI/2)*(canvas.height * 0.7)/2 + canvas.width / 2;
		if(blueActivated){
			bluePositionDrawing.stroke="5px #00f";
			bluePositionDrawing.x=Math.cos(positionBlue/3200*Math.PI*2-Math.PI/2)*(canvas.height * 0.6)/2 + canvas.width / 2;
			bluePositionDrawing.y=Math.sin(positionBlue/3200*Math.PI*2-Math.PI/2)*(canvas.height * 0.6)/2 + canvas.height / 2;
		}
		if(redActivated){
			redPositionDrawing.stroke="5px #f00";
			redPositionDrawing.x=Math.cos(positionRed/3200*Math.PI*2-Math.PI/2)*(canvas.height * 0.6)/2 + canvas.width / 2;
			redPositionDrawing.y=Math.sin(positionRed/3200*Math.PI*2-Math.PI/2)*(canvas.height * 0.6)/2 + canvas.height / 2;
		}
	});
	canvas.timeline.start();
	
	canvasAbsorbance = oCanvas.create({ canvas: "#absorbance", background: "#fff"});


	setInterval(function(){
		if (mode==1){
			if(ready && available){
				sendLeft();
			}
		}else if(mode==2){
			moveToPosition();
			if (desiredPosition==currentPosition){
				mode=0;
				$('#Move').removeClass('btn-danger');
  			$('#Move').addClass('btn-success');
  		}
		} else if(mode==3){
			var desiredMeasures=4;
			if (measureMeasures[currentPosition]<desiredMeasures){
				sendValue();
				console.log('redoing');
			}else{
				if (currentPosition!=desiredPosition) {
					moveToPosition();
				}else{
					mode=0;
					$('#Record').removeClass('btn-danger');
					$('#Record').addClass('btn-success');
					chrome.storage.sync.set({nameMeasures:calib},function(){
						console.log('saved calib');
					});
				}
			}
			
		}
	},10);
 
};
