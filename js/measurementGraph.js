/**
 * Created by sthiyag on 11/12/2016.
 */
var measurementTypes = {};
var siteMeasurementsObj = {};
var measurementsUnitsObj = {};
var rainGaugesSites = ["AVADI", "TIRUVALLUR", "SRIPERUMBUDUR", "RAMAPURAM", "ADAYAR"];
var rainGauges = ["RG01","RG02","RG02","RG01","RG02"];
var inFlowMeters = ["T03-005","T03-005","T03-005","T03-005"];
var sites = ["RG01","RG02","RG02","T03-005"];

var sitesData= [];
var Trimble = {};
Trimble.baseUrl = "https://goldenberyl.trimbleunity.com/unity";
Trimble.token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE0Nzg5MzEwNjUsImV4cCI6MTUxMDQ2NzA3NywiYXVkIjoiIiwic3ViIjoiIiwidXNlck5hbWUiOiJsb2tlc2giLCJ0ZW5hbnQiOiJkZXYxNjIifQ.7yblAQPT8vBP2oARNR_gDbjutBC1hJrewTHUvRSHtwY";

var lineWidth = "";
var graphWidth = "";
var historianUrl = "https://telogdhs.com/Telog/Map/qvwxdpFJTecz7XtSBKZNZL3oyhZUdVeuaswqtpdk070=/rest/services/Telog/FeatureServer/0/query?where=siteNameFilter(<sitenames>)&f=json";
var graphHeight = "";
var showToolTip = "";

$(document).ready(function () {
    loadMeasurementTypes();
    loadSiteDataFromTelog();
    renderRainGaugeCharts();
    renderInflowCharts();
    drawStorageChart();
});

function loadSiteDataFromTelog(){
    var defaultStartDate = new Date("2016-07-29T04:00:00");
    var endDate = new Date("2016-07-29T06:00:00.00");
    for(var i=0;i<sites.length;i++){
       var data = getSitesDataFromTelog(sites[i], lineWidth, graphWidth,historianUrl, defaultStartDate, endDate, graphHeight, showToolTip);
        addSitesData(sites[i],data);
    }
}

function getSitesDataFromTelog(siteName, linewidth, graphWidth, historianUrl, startDateTime, endDateTime, graphHeight, showToolTip) {
    historianUrl = historianUrl.replace("<sitenames>", siteName);
    var chartData = "";
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
            chartData = buildMeasurementGraph(new Date(startDateTime), new Date(endDateTime), measurementids, linewidth, graphWidth, graphHeight, showToolTip);
        }
    };
    // Make request to get Site measurements
    xmlhttp.open("GET", Trimble.baseUrl + '/proxy?url=' + historianUrl + '&token=' + Trimble.token, false);
    xmlhttp.send();
    return chartData;
}

function buildMeasurementGraph(startDate, endDate, selectedMeasurementIds, linewidth, graphWidth, graphHeight, showTooltip) {
    var chartData = "";
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
                chartData = JSON.parse(xmlhttp.responseText);
            }
        };

        xmlhttp.open("POST", url + "?token=" + Trimble.token, false);
        xmlhttp.setRequestHeader("Content-Type", "application/json");
        xmlhttp.send(restRequestJson);
    }
    return chartData;
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

function addSitesData(id, data){
    var site = {};
    site.id = id;
    if(data != undefined) {
        site.data =  data;
    }
    sitesData.push(site);
}

function getSitesData(id){
    for(var i=0; i<sitesData.length;i++){
        if(sitesData[i].id == id){
            return sitesData[i].data;
        }
    }
    return null;
}

function getRainFallDataAndDate(){
    var rainFallData = {};
    var dates = [];
    var seriesRainFallData = [];
    for(var i=0; i < rainGauges.length; i++){
        var data = getSitesData(rainGauges[i])[0].Values;
        var seriesData = {};
        seriesData.data = [];
        seriesData.name = rainGauges[i];
        for(var j=0; j< data.length; j++){
            if(i == 0){
                var time = new Date(data[j].Time);
                dates.push(time.getHours() + ":" + time.getMinutes());
            }
            seriesData.data.push(data[j].Value);
        }
        seriesRainFallData.push(seriesData)
    }
    rainFallData.dates = dates;
    rainFallData.data = seriesRainFallData;
    return rainFallData;
}

function renderRainGaugeCharts(){
    var rainFallData = getRainFallDataAndDate();
    for(var i = 0;i < rainGauges.length;i++){
        var currentRainFallData = [];
        currentRainFallData.push(rainFallData.data[i]);
        drawRainFallChart(i,currentRainFallData, rainFallData.dates);
    }
}

function drawRainFallChart(containerIndex, data, dates){

    var container = "rainGauge"+containerIndex;

    clearContainer(container);

    Highcharts.chart(container, {
        title: {
            text: rainGaugesSites[containerIndex],
            x: -20 //center
        },
        /*subtitle: {
            text: 'Date: 17-Nov-2016',
            x: -20
        },*/
        xAxis: {
            categories: dates
        },
        yAxis: {
            title: {
                text: 'Rainfall (ft)'
            },
            plotLines: [{
                value: 0,
                width: 1,
                color: '#808080'
            }]
        },
        tooltip: {
            valueSuffix: '°C'
        },
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0
        },
        series: data
    });
}

function clearContainer(container){
    document.getElementById(container).innerHTML = "";
}

function renderInflowCharts(){
    for(var i=0;i<inFlowMeters.length;i++){
        drawInflowChart(i,null);
    }
}

function drawInflowChart(containerIndex, data){

    var gaugeOptions = {

        chart: {
            type: 'solidgauge'
        },

        title: null,

        pane: {
            center: ['50%', '85%'],
            size: '140%',
            startAngle: -90,
            endAngle: 90,
            background: {
                backgroundColor: (Highcharts.theme && Highcharts.theme.background2) || '#EEE',
                innerRadius: '60%',
                outerRadius: '100%',
                shape: 'arc'
            }
        },

        tooltip: {
            enabled: false
        },

        // the value axis
        yAxis: {
            stops: [
                [0.1, '#55BF3B'], // green
                [0.5, '#DDDF0D'], // yellow
                [0.9, '#DF5353'] // red
            ],
            lineWidth: 0,
            minorTickInterval: null,
            tickAmount: 2,
            title: {
                y: -70
            },
            labels: {
                y: 16
            }
        },

        plotOptions: {
            solidgauge: {
                dataLabels: {
                    y: 5,
                    borderWidth: 0,
                    useHTML: true
                }
            }
        }
    };

    // The speed gauge
    var chartSpeed = Highcharts.chart('container-speed'+containerIndex, Highcharts.merge(gaugeOptions, {
        yAxis: {
            min: 0,
            max: 100,
            title: {
                text: 'Flowmeter '+ (containerIndex+1)
            }
        },

        credits: {
            enabled: false
        },

        series: [{
            name: 'Flowmeter1',
            data: [80],
            dataLabels: {
                format: '<div style="text-align:center"><span style="font-size:25px;color:' +
                ((Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black') + '">{y}</span><br/>' +
                '<span style="font-size:12px;color:silver">cubic feet/sec</span></div>'
            },
            tooltip: {
                valueSuffix: ' cfs'
            }
        }]

    }));



    // Bring life to the dials
    setInterval(function () {
        // Speed
        var point,
            newVal,
            inc;

        if (chartSpeed) {
            point = chartSpeed.series[0].points[0];
            inc = Math.round((Math.random() - 0.5) * 100);
            newVal = point.y + inc;

            if (newVal < 0 || newVal > 100) {
                newVal = point.y - inc;
            }

            point.update(newVal);
        }

        // RPM
       /* if (chartRpm) {
            point = chartRpm.series[0].points[0];
            inc = Math.random() - 0.5;
            newVal = point.y + inc;

            if (newVal < 0 || newVal > 5) {
                newVal = point.y - inc;
            }

            point.update(newVal);
        }*/
    }, 2000);
}

function drawStorageChart(){

    Highcharts.chart('storageContainer', {

            chart: {
                type: 'gauge',
                plotBackgroundColor: null,
                plotBackgroundImage: null,
                plotBorderWidth: 0,
                plotShadow: false
            },

            title: {
                text: 'RESERVOIR CAPACITY'
            },

            pane: {
                startAngle: -150,
                endAngle: 150,
                background: [{
                    backgroundColor: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        stops: [
                            [0, '#FFF'],
                            [1, '#333']
                        ]
                    },
                    borderWidth: 0,
                    outerRadius: '109%'
                }, {
                    backgroundColor: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        stops: [
                            [0, '#333'],
                            [1, '#FFF']
                        ]
                    },
                    borderWidth: 1,
                    outerRadius: '107%'
                }, {
                    // default background
                }, {
                    backgroundColor: '#DDD',
                    borderWidth: 0,
                    outerRadius: '105%',
                    innerRadius: '103%'
                }]
            },

            // the value axis
            yAxis: {
                min: 0,
                max: 100,

                minorTickInterval: 'auto',
                minorTickWidth: 1,
                minorTickLength: 10,
                minorTickPosition: 'inside',
                minorTickColor: '#666',

                tickPixelInterval: 30,
                tickWidth: 2,
                tickPosition: 'inside',
                tickLength: 10,
                tickColor: '#666',
                labels: {
                    step: 2,
                    rotation: 'auto'
                },
                title: {
                    text: 'Feet'
                },
                plotBands: [{
                    from: 0,
                    to: 60,
                    color: '#55BF3B' // green
                }, {
                    from: 60,
                    to: 90,
                    color: '#DDDF0D' // yellow
                }, {
                    from: 90,
                    to: 100,
                    color: '#DF5353' // red
                }]
            },

            series: [{
                name: 'ReservoirCapacity',
                data: [80],
                tooltip: {
                    valueSuffix: ' Feet'
                }
            }]

        },
        // Add some life
        function (chart) {
            if (!chart.renderer.forExport) {
                setInterval(function () {
                    var point = chart.series[0].points[0],
                        newVal,
                        inc = Math.round((Math.random() - 0.5) * 20);

                    newVal = point.y + inc;
                    if (newVal < 0 || newVal > 100) {
                        newVal = point.y - inc;
                    }

                    point.update(newVal);

                }, 3000);
            }
        });
}

/*function getRainFallDataAndDate2(){
 var rainFallData = [];
 var seriesData = {};
 for(var i=0; i < rainGauges.length; i++){
 seriesData.id = rainGauges[i];
 seriesData.data = [];
 var data = getSitesData(rainGauges[i])[0].Values;
 for(var j=0; j< data.length; j++){
 var rainFall = [];
 var time = new Date(data[j].Time);
 rainFall.push(time.getHours() + ":" + time.getMinutes());
 rainFall.push(data[j].Value);
 seriesData.data.push(rainFall);
 }
 rainFallData.push(seriesData);
 }
 return rainFallData;
 }*/