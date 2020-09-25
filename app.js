require('dotenv').config();

let express = require('express'),
    app = express(),
    bodyParser = require("body-parser"),
    serveStatic = require('serve-static'),
    moment = require('moment'),
    flash = require("connect-flash"),
    request = require('request');

app.use(flash());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(serveStatic("public/"));

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Once again Penelope wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));

app.use(function (req, res, next) {
    res.locals.moment = require("moment");
    res.locals.error = req.flash("error");
    next();
});



//INDEX ROUTE
app.get("/", function (req, res) {
    // Get rid of the DB part of this app...
    //clearDB();
    res.render("landing");
});

// CREATE - add new forecast to DB
app.post("/weather", function (req, res) {
    // get zip from user
    let zip = req.body.zip;
    let apiKey = process.env.WEATHER_API_KEY;
    let fiveDayURL = `http://api.openweathermap.org/data/2.5/forecast?zip=${zip}&units=imperial&appid=${apiKey}`;

    if (checkZip(zip)) {
        //make request to API for info
        request(fiveDayURL, function (err, response, body) {
            let newFiveDayForecast = JSON.parse(body);
            if (err) {
                req.flash("error", "There was an issue fetching forecasts");
                res.redirect("/");
            }
            else {
                if (newFiveDayForecast.message === "city not found") {
                    req.flash("error", "City was not found. Please try again.");
                    res.redirect("/");
                }
                else {
                    res.render("home", { fiveDay: newFiveDayForecast, minsAndMaxes: findMinMax(newFiveDayForecast) });
                }
            }
        });
    }
    else {
        req.flash("error", "Please enter a valid zip code!");
        res.redirect("/");
    }
});

function checkZip(zip) {
    return (/^[0-9]{5}(?:-[0-9]{4})?$/.test(zip));
}

//Find true min and max temperatures for each day
function findMinMax(fiveDayForecast) {
    let minsAndMaxes = [];
    let min = 9999;
    let max = 0;
    let day = parseInt(fiveDayForecast.list[0].dt_txt.slice(8, 10));
    let count = 0;
    //loop through fiveDayForecasts.list
    while (count < fiveDayForecast.list.length) {
        //Check if hour reaches last entry which is 21 OR it's a new day AND max temp is not equal to 0
        if ((parseInt(fiveDayForecast.list[count].dt_txt.slice(11, 13)) === 21 || day !== parseInt(fiveDayForecast.list[count].dt_txt.slice(8, 10))) && max !== 0) {
            //check the true min and max on last time
            if (min > fiveDayForecast.list[count].main.temp_min) {
                min = fiveDayForecast.list[count].main.temp_min;
            }
            else if (max < fiveDayForecast.list[count].main.temp_max) {
                max = fiveDayForecast.list[count].main.temp_max;
            }
            //Then add that new information to the end of the minsAndMaxes array
            minsAndMaxes.push({ date: fiveDayForecast.list[count].dt_txt, min_temp: min, max_temp: max });
            //update the new day, and reset min/max
            day = parseInt(fiveDayForecast.list[count].dt_txt.slice(8, 10));
            min = 9999;
            max = 0;
        }
        else if (min > fiveDayForecast.list[count].main.temp_min) {
            min = fiveDayForecast.list[count].main.temp_min;
        }
        else if (max < fiveDayForecast.list[count].main.temp_max) {
            max = fiveDayForecast.list[count].main.temp_max;
        }
        count++;
    }
    return (minsAndMaxes);
}



app.listen(process.env.PORT, process.env.IP, function () {
    console.log("The Server Has Started!");
});
