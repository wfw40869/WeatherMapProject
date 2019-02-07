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

var fiveDaySchema = mongoose.Schema({
   city: {},
   coord: {},
   country: String,
   cod: Number,
   message: Number,
   cnt: Number,
   list: [{}]
});

var FiveDayForecast = mongoose.model("FiveDayForecast", fiveDaySchema);
    
var url = process.env.DATABASEURL || "mongodb://" + process.env.USERNAME + ":" + process.env.PASSWORD + "@ds029821.mlab.com:29821/weather_app_project";
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
                    var minsAndMaxes;
                    if (err) {
                        req.flash("error", "Please enter a valid zip code!");
                        res.redirect("/");
                    } else if(newFiveDayForecast.message === "city not found") {
                        req.flash("error", "City was not found. Please try again.");
                        res.redirect("/");
                    }
                    else {
                        res.render("home", { fiveDay: newFiveDayForecast, minsAndMaxes: findMinMax(newFiveDayForecast) });
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
            });
        }
    });
}

function checkZip(zip) {
    return(/^[0-9]{5}(?:-[0-9]{4})?$/.test(zip));
}

//Find true min and max temperatures for each day
function findMinMax(fiveDayForecast){
    var minsAndMaxes = [];
    var min = 9999;
    var max = 0;
    var day = parseInt(fiveDayForecast.list[0].dt_txt.slice(8,10));
    var count = 0;
    //loop through fiveDayForecasts.list
    while(count < fiveDayForecast.list.length){
        //If its a different day and the min and max do not equal 0 and 9999 respectively since we are setting them absolutely
        if(day !== parseInt(fiveDayForecast.list[count].dt_txt.slice(8,10)) && max !== 0 && min !== 9999) {
            //Then add that new information to the end of the minsAndMaxes array
            minsAndMaxes.push({min_temp: min, max_temp: max});
            //update the new day, and reset min/max
            day = parseInt(fiveDayForecast.list[count].dt_txt.slice(8,10));
            min = 9999;
            max = 0;
        }
        else if(min > fiveDayForecast.list[count].main.temp_min){
            min = fiveDayForecast.list[count].main.temp_min;
        }
        else if(max < fiveDayForecast.list[count].main.temp_max){
            max = fiveDayForecast.list[count].main.temp_max;
        }
        count++;
    }
    return(minsAndMaxes);
}



app.listen(process.env.PORT, process.env.IP, function(){
    console.log("The Server Has Started!") ;
});