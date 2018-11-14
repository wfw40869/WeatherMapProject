$(document).ready(function() {
   //Load weather when user presses enter on landing page
   $('#zip').keypress(function(e){
       if(e.keyCode === 13){
           $('#getWeatherForecast').click();
       }
   });
});