require('dotenv').config();

var express = require('express'),
    app     = express(),
    bodyParser  = require("body-parser"),
    serveStatic = require('serve-static'),
    moment      = require("moment"),
    mongoose = require('mongoose'),
    flash = require("connect-flash"),
    request = require('request');
    
//SCHEMA SETUP

var fiveDaySchema = mongoose.Schema([{
   city: {},
   coord: {},
   country: String,
   cod: Number,
   message: Number,
   cnt: Number,
   list: [{}]
}]);

var FiveDayForecast = mongoose.model("FiveDayForecast", fiveDaySchema);
    
var url = process.env.DATABASEURL || "mongodb://localhost:27017/WeatherMap_v1";
mongoose.connect(url, { useNewUrlParser: true });

app.use(flash());
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(serveStatic("public/"));

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Once again Penelope wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));

app.use(function(req, res, next){
    res.locals.moment = require("moment");
    res.locals.error = req.flash("error");
    next();
}); 



//INDEX ROUTE
app.get("/", function(req, res){
    clearDB();
    res.render("landing");
});

// CREATE - add new forecast to DB
app.post("/weather", function(req, res) {
    // get zip from user
    let zip = req.body.zip;
    let apiKey = process.env.WEATHER_API_KEY;
    let fiveDayURL = `http://api.openweathermap.org/data/2.5/forecast?zip=${zip}&units=imperial&appid=${apiKey}`;

    if (checkZip(zip)) {
        //make request to API for info
        request(fiveDayURL, function(err, response, body) {
            //store forecast info in DB
            var newFiveDayForecast = JSON.parse(body);
            if (err) {
                req.flash("error", "Please enter a valid zip code!");
                res.redirect("/");
            }
            else {
                FiveDayForecast.create(newFiveDayForecast, function(err, newlyCreated) {
                    if (err) {
                        req.flash("error", "Please enter a valid zip code!");
                        res.redirect("/");
                    } else if(newFiveDayForecast.message === "city not found") {
                        req.flash("error", "City was not found. Please try again.");
                        res.redirect("/");
                    }
                    else {
                        console.log("CREATED FORECAST!!!");
                        res.render("home", { fiveDay: newFiveDayForecast });
                    }
                })
            }
        });
    }
    else {
        req.flash("error", "Please enter a valid zip code!");
        res.redirect("/");
    }
});



function clearDB() {
    mongoose.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) {
            console.log(err);
        }
        else {
            db.collection('fivedayforecasts').deleteMany(function(err, result) {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log("DB Cleared!!!");
                }
            });
        }
    });
}

function checkZip(zip) {
    return(/^[0-9]{5}(?:-[0-9]{4})?$/.test(zip));
}

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("The Server Has Started!") ;
});