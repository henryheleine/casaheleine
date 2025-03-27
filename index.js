var express = require("express");
var app = express();
var MongoClient = require("mongodb").MongoClient;
var connection = process.env.connection;
var _ = require("underscore");
var http = require("http");
var fs = require("fs");
var mustache = require("mustache");


/* express methods */
app.get("/", function(req, res) {
  console.log("Request for / received");

  res.send('get ready world');
});


app.get("/readings", function(req, res) {
  console.log("Request for /readings received");

  fs.readFile("views/readings.html", function (readError, data) {
    if (readError) throw readError;
    
    res.send(mustache.render(data.toString(), { name: "casa heleine" } ));
  });
});


app.get("/photo", function(req, res) {
  console.log("Request for /photo received");
  
  fs.readFile("views/photo.html", function (readError, data) {
    if (readError) throw readError;
    
    MongoClient.connect(connection, function(dbConnectError, db) {
      if(dbConnectError) throw dbConnectError;

      var collection = db.collection("photo");
      collection.find().toArray(function(findError, document) {
        if (findError) throw findError;
        
        res.send(mustache.render(data.toString(), { base64: new Buffer(document[0].base64, 'binary').toString() }));
        db.close();
      });
    });  
  });
});


app.get("/saveReadings", function (req, res)
{
  console.log("Request for /saveReadings received");

  MongoClient.connect(connection, function(dbConnectError, db) {
    if(dbConnectError) throw dbConnectError;

    var collection = db.collection("readings");
    var d = req.query.d;
    var time = req.query.time;
    var temp = req.query.temp;
    var h = req.query.h;
    if (d && time && temp && h) {
      collection.insert({"day":req.query.d, "time":req.query.time, "temperature":req.query.temp, "humidity":req.query.h}, {w:1}, function(insertError, result) {
        if (insertError) throw insertError;

        res.send("Successfully inserted readings = day:"+d + " time:"+time + " temp:"+temp + " humidity:"+h);
        db.close();
      });
    }
  });  
})


app.post("/savePhoto", function(req, res) {
  console.log("Request for /savePhoto received");
  
  var base64 = '';
  req.on("data", function(chunk) {
    base64 += chunk;
  });
  req.on("end", function() {
    MongoClient.connect(connection, function(dbConnectError, db) {
      if(dbConnectError) throw dbConnectError;
      
      var collection = db.collection("photo");
      collection.remove({}, function(deleteError, deleteResult) {
        if (deleteError) throw deleteError;
        console.log("Removed existing photo: " + deleteResult);
        
        collection.insert({"base64":base64.toString()}, {w:1}, function(insertError, insertResult) {
          if (insertError) throw insertError;
          res.send("Successfully inserted base64 photo string into db");
          db.close();
        });
      });  
    });
  });
});


app.get("/removeReadings", function(req, res) {
  console.log("Request for /removeReadings received");

  MongoClient.connect(connection, function(dbConnectError, db) {
    if(dbConnectError) throw dbConnectError;

    var weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    var day = new Date().getDay();
    var weekdaysMinusToday = _.filter(weekdays, function(d) { return d !== weekdays[day]; });
    var collection = db.collection("readings");

    _.each(weekdaysMinusToday, function(value, key, list) {
      collection.remove({ "day" : value },  function(deleteError, result) {
        if (deleteError) throw deleteError;

        console.log("Removed " + result + " documents for day: "+value);
        if (key === (weekdaysMinusToday.length-1)) {
          res.send("Remove readings for every day other than: " + weekdays[day]);
        }
      });
    });
  });
});


app.listen(process.env.PORT || 5000);
