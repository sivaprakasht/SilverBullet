/**
 * Created by sthiyag on 11/12/2016.
 */
var measurementTypes = {};
var siteMeasurementsObj = {};
var measurementsUnitsObj = {};

var Trimble = {};
Trimble.baseUrl = "https://goldenberyl.trimbleunity.com/unity";
Trimble.token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE0Nzg5MzEwNjUsImV4cCI6MTUxMDQ2NzA3NywiYXVkIjoiIiwic3ViIjoiIiwidXNlck5hbWUiOiJsb2tlc2giLCJ0ZW5hbnQiOiJkZXYxNjIifQ.7yblAQPT8vBP2oARNR_gDbjutBC1hJrewTHUvRSHtwY";


var siteName = "RG01";//"T03-005";
var lineWidth = "";
var graphWidth = "";
var historianUrl = "https://telogdhs.com/Telog/Map/qvwxdpFJTecz7XtSBKZNZL3oyhZUdVeuaswqtpdk070=/rest/services/Telog/FeatureServer/0/query?where=siteNameFilter(<sitenames>)&f=json";
var graphHeight = "";
var showToolTip = "";


$(document).ready(function () {
    loadMeasurementTypes();
    var today = new Date();
    //add a day to the date
    today.setDate(today.getDate() - 1);

    var defaultStartDate = new Date("2016-07-28T06:00:11.980759")
    var endDate = new Date("2016-07-29T06:58:11.980759")
    viewMeasurementGraph(siteName, lineWidth, graphWidth,historianUrl, defaultStartDate, endDate, graphHeight, showToolTip);
});



function viewMeasurementGraph(siteName, linewidth, graphWidth, historianUrl, startDateTime, endDateTime, graphHeight, showToolTip) {

    historianUrl = historianUrl.replace("<sitenames>", siteName);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {


            var measurementtypes = {};
            for (var measurementTypeIndex in measurementTypes) {
                var measurementType = measurementTypes[measurementTypeIndex];
                measurementtypes[measurementType.description] = measurementType.id;

            }
            var siteData = JSON.parse(xmlhttp.responseText);
            var siteMeasurements = siteData.features[0].attributes["Mobile Site Measurements"];
            if (!siteMeasurements) {
                siteMeasurements = siteData.features[0].attributes["Site Measurements"];
            }

            var siteid = siteData.features[0].attributes["site_id"];

            var measurementids = [];
            if (siteMeasurements) {
                var arrSiteMeasurements = siteMeasurements.split('|');
                for (var i = 0; i < arrSiteMeasurements.length; i++) {
                    var measurementDetails = arrSiteMeasurements[i].split(",");
                    var measurementId = measurementDetails[0];
                    var measurementName = measurementDetails[1];
                    var measurementUnits = measurementDetails[2];

                    if (Object.keys(measurementtypes).length > 0 && measurementtypes.hasOwnProperty(measurementName)) {
                        measurementids.push(measurementId);
                    } else if (Object.keys(measurementtypes).length == 0) {
                        measurementids.push(measurementId);
                    }


                    if (!siteMeasurementsObj[measurementId]) {
                        measurement = {
                            siteid: siteid,
                            sitename: siteName,
                            name: measurementName,
                            units: measurementUnits
                        };
                        siteMeasurementsObj[measurementId] = measurement;

                    }
                    if (!measurementsUnitsObj[measurementName]) {
                        measurementsUnitsObj[measurementName] = measurementUnits;
                    }

                }

            }
            // TODO Remove the hardcoded start date and end date
            buildMeasurementGraph(new Date(startDateTime), new Date(endDateTime), measurementids, linewidth, graphWidth, graphHeight, showToolTip);

        }
    };

    // Make request to get Site measurements
    xmlhttp.open("GET", Trimble.baseUrl + '/proxy?url=' + historianUrl + '&token=' + Trimble.token, true);
    xmlhttp.send();
}

function buildMeasurementGraph(startDate, endDate, selectedMeasurementIds, linewidth, graphWidth, graphHeight, showTooltip) {

    var startDateTimeTimeStamp = Date.parse(startDate);
    var endDateTimeTimeStamp = Date.parse(endDate);
    var measurementParamValue = '';
    for (var i = 0; i < selectedMeasurementIds.length; i++) {
        if (i == selectedMeasurementIds.length - 1) {
            measurementParamValue += selectedMeasurementIds[i] + '%3A-1%3A1';
        } else {
            measurementParamValue += selectedMeasurementIds[i] + '%3A-1%3A1%7C';
        }
    }

    if (measurementParamValue !== '') {
        var restRequest = {};
        restRequest.relativeURL = "/GetChartData.aspx";
        restRequest.params = {};
        restRequest.params['Tabular'] = 1;
        restRequest.params['DST'] = 1;

        restRequest.params['RI'] = 1;
        restRequest.params['RS'] = 0;
        restRequest.params['Start'] = startDateTimeTimeStamp;
        restRequest.params['End'] = endDateTimeTimeStamp;
        restRequest.params['measurements'] = escape(measurementParamValue);

        var restRequestJson = JSON.stringify(restRequest);
        var xmlhttp = new XMLHttpRequest();
        var url = Trimble.baseUrl + '/proxy/restservice/1';
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                var chartData = JSON.parse(xmlhttp.responseText);

            }

        };

        xmlhttp.open("POST", url + "?token=" + Trimble.token, true);
        xmlhttp.setRequestHeader("Content-Type", "application/json");
        xmlhttp.send(restRequestJson);

    }
}

function loadMeasurementTypes() {
    var xmlhttpRequest = new XMLHttpRequest();
    xmlhttpRequest.onreadystatechange = function () {
        if (xmlhttpRequest.readyState == 4 && xmlhttpRequest.status == 200) {
            measurementTypes = JSON.parse(xmlhttpRequest.responseText);
        }
    };
    // Make request to get measurement types
    xmlhttpRequest.open("GET", Trimble.baseUrl + '/measurementtypes?token=' + Trimble.token, true);
    xmlhttpRequest.send();
}