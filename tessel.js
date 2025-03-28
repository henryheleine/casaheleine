var tessel = require("tessel");
var climate = require("climate-si7020").use(tessel.port["C"]);
var camera = require("camera-vc0706").use(tessel.port["A"]);
var cameraLEDNotifier = tessel.led[3];



/* tessel climate module methods */

climate.on("ready", function() {
  console.log("INFO: Connected to climate module si7020");
  // setInterval(takeReadings, 1000 * 60 * 2);
});

climate.on("error", function(climateError) {
  console.log("ERROR: Connecting to climate module failed: ", climateError);
});



/* tessel camera module methods */

camera.on("ready", function() {
  console.log("INFO: Connected to camera module vc0706");
  setTimeout(takePhoto, 1000 * 20 * 1);
});

camera.on("error", function(cameraError) {
  console.error("ERROR: Connecting to camera module failed: ", cameraError);
});



/* helper methods */

function takeReadings() {    
  climate.readTemperature(function(readTemperatureError, temperature) {
    climate.readHumidity(function(readHumidityError, humidity) {
      
      if (readTemperatureError) { console.log("ERROR: ReadTemperatureError: ", readTemperatureError); return; }
      if (readHumidityError) { console.log("ERROR: ReadHumidityError: ", readHumidityError); return; }
      
       
      var t = temperature.toFixed(2) + "C";
      var h = humidity.toFixed(2) + "%";
      console.log("INFO: Temperature reading successful:",t, " and humidity:",h);
      saveReadings(t, h);
    });
  });
}

function saveReadings(temperature, humidity) {
  console.log("INFO: Saving temperature and humidity: ", temperature, humidity);
   
  var date = new Date();
  var weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var day = weekdays[date.getDay()];
  var hour = (date.getHours() < 10 ? "0" : "") + date.getHours();
  var minute = (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
   
  require("http").get("http://casaheleine.herokuapp.com/saveReadings?d="+day + "&time="+hour+minute + "&temp="+temperature + "&h="+humidity, function(httpGetResult) {
    if ("200" === ""+httpGetResult.statusCode) {
      console.log("INFO: Successfully sent readings to casaheleine: ", httpGetResult.statusCode);
    }
    else {
      console.log("ERROR: Response error sending readings to casaheleine: ", httpGetResult.statusCode);
    }  
  }).on("error", function(httpError) {
    console.log("ERROR: Http error: ", httpError.message);
  });
}

function takePhoto() {
  cameraLEDNotifier.high();
  camera.takePicture(function(takePictureError, imageData) {
    
    if (takePictureError) {
      console.log("ERROR: taking picture failed: ", takePictureError);
    }
    else {
      console.log("INFO: Picture successfully taken.");
      cameraLEDNotifier.low();

      // have to split reading the buffer bytes into 4 as CPU can't handle it in one
      var quarter = imageData.length/4
      console.log("INFO: Encoding quarter 1 of image data.");
      var imageDataInBase641 = imageData.toString('base64', 0, quarter*1);
      console.log("INFO: Encoding quarter 2 of image data.");
      var imageDataInBase642 = imageData.toString('base64', quarter*1, quarter*2);
      console.log("INFO: Encoding quarter 3 of image data.");
      var imageDataInBase643 = imageData.toString('base64', quarter*2, quarter*3);
      console.log("INFO: Encoding quarter 4 of image data.");
      var imageDataInBase644 = imageData.toString('base64', quarter*3, quarter*4);
      console.log("INFO: Concatenating image data to save.");
      savePhoto(imageDataInBase641 + imageDataInBase642 + imageDataInBase643 + imageDataInBase644);
    }
  });
}

function savePhoto(imageDataInBase64) {
  console.log("INFO: Saving imageData...");
  
  var post_options = {
    host: 'casaheleine.herokuapp.com',
    port: 80,
    path: '/savePhoto',
    method: 'POST'
  };
  var post_req = require("http").request(post_options);
  
  post_req.write(imageDataInBase64);
  post_req.end();
  camera.disable();

  console.log("INFO: imageData sent in post request to casaheleine.");
}
