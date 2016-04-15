// Variables declarations
var lapdDivisions = './res/lapd-divisions.geojson';
var lapdCrimes = './res/lapd-crime.json'

var geoDivisions = [];
var dataset = new Array();
var totalCrimes;
var map;
var markers = [];
var dots = false;
var single = false;
var range = true;

var strokeColorDefault = '#555555';
var strokeColorHighlight = '#ffff4d';
var strokeWidthDefault = 2;
var strokeWidthHighlight = 4;

// MapBox setup
$(document).ready(function() {
    var datePicker = $('#datepicker-container .input-group.date').datepicker({
        startDate: "01/01/2015",
        endDate: "12/31/2015",
        todayHighlight: true,
        defaultViewDate: {
            year: 1977,
            month: 04,
            day: 25
        }
    });

    $("#cbox_dots").prop('checked', dots);
    $("#cbox_dots").change(() => {
        dots = this.checked;
        toggleDots();
    });

    datePicker.on('changeDate', function(e) {
        computeData(moment($('#datepicker').val())._d);
    })
    $('#picker-main').click((e) => {
        if (!single) {
            $('#datepicker').removeAttr('disabled');
            single = true;
            range = false;
            $('#slider').dateRangeSlider('disable');
        }
    });
    if (!single) {
        $('#datepicker').attr('disabled', '');
    }

    initSlider('#slider');
    $('#slider').dateRangeSlider((range) ? 'enable' : 'disable');
    $('#slider').click(function(event) {
        console.log('clicked');
        if (!range) {
            $('#slider').dateRangeSlider('enable');
            $('#datepicker').attr('disabled', '');
            single = false;
            range = true;
        }
    });

    getData(lapdCrimes, lapdDivisions);
});


var loadMap = () => {
    L.mapbox.accessToken = 'pk.eyJ1IjoiZ2FuaXR6c2giLCJhIjoiY2lrZXB0dGVsMDA3MHV2bHoyZzhmbGNkeCJ9.dI1RBzjM2GYqyUN60HnpoQ';
    map = L.mapbox
        .map('map', 'mapbox.streets')
        .setView([34.025, -118.415], 11)
        .on('ready', function() {
            var featureLayer = L.mapbox.featureLayer().addTo(map).on('ready', (d) => {
                console.log('Done drawing areas on map');
                var gs = $('#map g');
                for (var i = 0; i < gs.length; i++) {
                    gs[i].setAttribute('class', 'area-gs');
                    gs[i].setAttribute('area-name', geoDivisions[i + 1].name);
                }
                $('#loader-container').css('display', 'none');
                $('#content').css('visibility', 'visible');
                computeData(new Date(2015, 0, 1, 0, 0, 0), new Date(2015, 11, 31, 23, 59, 59));
            });
            featureLayer.loadURL(lapdDivisions);
        });
}

// Tooltip initialization

var tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip-hover")
    .style("position", "absolute")
    .style("background-color", "DodgerBlue")
    .style("color", "white")
    .style("z-index", "10")
    .style("visibility", "hidden");

// Functions declaratons

var parseLatLng = (str) => {
    str = str.substring(1, str.length - 1);
    var tmp = str.split(',');
    return L.latLng(Number(tmp[0]), Number(tmp[1]));
}

var getData = (crimes, divisions) => {
    console.log('Processing data from: ' + crimes + ' and ' + divisions);
    d3.json(divisions, (d) => {
        var id = 0;
        d.features.forEach((division, index) => {
            id = Number(division.properties.external_id);
            geoDivisions[id] = division.properties;
        });
        console.log('LAPD Divisions processed:');
        console.log(geoDivisions);
        $('#total-number-ar').text(geoDivisions.length - 1);
        d3.json(crimes, (crimes) => {
            dataset = crimes;
            for (var i = 0; i < dataset.length; i++) {
                dataset[i].location = parseLatLng(dataset[i].location)
            }
            $('#total-number-bu').text(crimes.length);
            console.log('Processed ' + crimes.length + ' crimes');
            loadMap();
        });
    });
}

var format = (date) => {
    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();
    return monthIndex + "/" + day + "/" + year;
}

var removeDots = () => {
    if (markers != undefined) {
        for (var i = 1; i < markers.length; i++) {
            markers[i].clearLayers();
        }
    }
}

var toggleDots = () => {
    for (var i = 1; i < markers.length; i++) {
        if (map.hasLayer(markers[i])) {
            map.removeLayer(markers[i]);
        } else {
            map.addLayer(markers[i]);
        }
    }
}

var drawDots = () => {
    for (var i = 1; i < markers.length; i++) {
        console.log(markers[i]);
        markers[i].addTo(map);
    }
}

var drawDotsForArea = (id) => {
    markers[id].addTo(map);
}

var computeData = function(from, to) {
    var rawArray = new Array();
    var subset = [];
    var curZone = 1;

    removeDots();
    dataset.forEach((crime, index) => {
        if (subset[crime.area_id] == undefined) {
            subset[crime.area_id] = new Array();
        }
        var check = moment(crime.date)
        if (range) {
            if (check._d > from && check._d < to) {
                subset[crime.area_id].push(crime);
            } else if (check.isSame(from) || check.isSame(to)) {
                subset[crime.area_id].push(crime);
            }
        } else if (single) {
            if (check.isSame(from)) {
                subset[crime.area_id].push(crime);
            }
        }
    });
    subset.forEach((area, id) => {
        rawArray.push(area)
    })
    subset["total"] = 0;
    subset["min"] = 0;
    subset["max"] = 0;
    // Compute total, min and max
    subset.forEach((crimes, index) => {
        var l = crimes.length
        if (subset["min"] === 0) {
            subset["min"] = l;
        }
        if (l < subset["min"]) {
            subset["min"] = l;
        }
        if (l > subset["max"]) {
            subset["max"] = l;
        }
        for (var i = 0; i < crimes.length; i++) {
            var coord = crimes[i].location
            if (markers[index] == undefined) {
                markers[index] = L.layerGroup(); // Create layer group for dots
            }
            var marker = L.circleMarker(crimes[i].location, {
                radius: 2
            });
            marker.addTo(markers[index]);
        }
        subset["total"] += l;
    });
    $('#total-number-bu').text(subset["total"]);
    var colorScale = d3.scale.linear().domain([
        subset["min"], subset["max"]
    ]).range(["lightgreen", "red"])
    d3.select('#map').selectAll('.area-gs').attr("id", function(area) {
        var g = this;
        var color = colorScale(subset[curZone].length);
        g.children[0].setAttribute("fill", color);
        this.setAttribute("area-total", subset[curZone].length);
        if (dots) {
            drawDotsForArea(curZone);
        }
        curZone++;
        return curZone - 1;
    }).on("mouseover", function() {
        dispTooltip(
            this.getAttribute('id'),
            this.getAttribute('area-name'),
            this.getAttribute('area-total'),
            subset['total']
        );
    }).on("mousemove", function() {
        tooltip
            .style("top", (event.pageY - 10) + "px")
            .style("left", (event.pageX + 10) + "px")
            .style('right', '')
            .style('bottom', '');
    }).on("mouseout", function() {
        tooltip.style("visibility", "hidden");
    });
    removePie();
    generatePieChart(rawArray, subset['total']);
}

var dispTooltip = (aId, aName, aTotal, total) => {
    return tooltip
        .style("visibility", "visible")
        .text("Area ID: " + aId +
            "\nArea name: " + aName +
            "\nCrimes: " + aTotal +
            "\n% of total: " + (aTotal / total * 100).toFixed(2));
}

var initSlider = (sliderId) => {
    var months = [
        "J",
        "F",
        "M",
        "A",
        "M",
        "J",
        "J",
        "A",
        "S",
        "O",
        "N",
        "D"
    ];

    $(sliderId).dateRangeSlider({
        bounds: {
            // min: new Date(2014, 11, 31, 23, 59, 59),
            min: new Date(2015, 0, 1, 0, 0, 0),
            max: new Date(2015, 11, 31, 23, 59, 59)
        },
        defaultValues: {
            // min: new Date(2014, 11, 31, 23, 59, 59),
            min: new Date(2015, 0, 1),
            max: new Date(2015, 11, 31, 23, 59, 59)
        },
        scales: [{
            first: (value) => {
                return value;
            },
            end: (value) => {
                return value;
            },
            next: (value) => {
                var next = new Date(value);
                return new Date(next.setMonth(value.getMonth() + 1));
            },
            label: (value) => {
                return months[value.getMonth()];
                // return "";
            },
            format: (tickContainer, tickStart, tickEnd) => {
                tickContainer.addClass("myCustomClass");
            }
        }]
    });

    $(sliderId).bind("valuesChanged", (e, data) => {
        var dateFrom = data.values.min;
        var dateTo = data.values.max;
        dateFrom.setHours(0, 0, 0, 0);
        dateTo.setHours(0, 0, 0, 0);
        computeData(dateFrom, dateTo);
    })
}

$.getJSON(lapdCrimes, (json) => {
    console.log(json.length); // this will show the info it in firebug console
});

var removePie = () => {
    console.log('Removing old pie chart');
    console.log(d3.select("#pie").select('svg'));
    d3.select("#pie").select('svg').remove();
}
var generatePieChart = (dataset, total) => {
    var tmp = new Array();
    var panelWidth = document.getElementById("left-panel").offsetWidth;

    var width = panelWidth * 0.8,
        height = 250,
        radius = Math.min(width, height) / 2;

    var color = d3.scale.category20();

    var arc = d3.svg.arc()
        .outerRadius(radius - 25)
        .innerRadius(radius);

    var labelArc = d3.svg.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 40);

    var pie = d3.layout.pie()
        .sort(null)
        .value((d, i) => {
            return d.length;
        })
        .padAngle(.02);

    var svg = d3.select("#pie").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");


    for (var i = 1; i < dataset.length; i++) {
        var g = svg.selectAll(".arc")
            .data(pie(dataset))
            .enter().append("g")
            .attr("class", "arc");

        g.append("path")
            .attr("d", arc)
            .attr('area-id', function(d, j) {
                return j + 1;
            })
            .attr('area-name', function(d, j) {
                return geoDivisions[j + 1].name
            })
            .attr('area-total', function(d, j) {
                return d.data.length;
            })
            .style("fill", (d, j) => {
                return color(j);
            }).on('mouseover', function() {
                var id = this.getAttribute('area-id');

                tooltip
                    .style("bottom", "2%")
                    .style("left", "24%")
                    .style('right', '')
                    .style('top', '');
                dispTooltip(
                    this.getAttribute('area-id'),
                    this.getAttribute('area-name'),
                    this.getAttribute('area-total'),
                    total
                );

                $('#' + id + ' path')
                    .attr('stroke', strokeColorHighlight)
                    .attr('stroke-width', strokeWidthHighlight)
                    .css('z-index', 4);

            }).on('mouseout', function() {
                var id = this.getAttribute('area-id');

                $('#' + id + ' path')
                    .attr('stroke', strokeColorDefault)
                    .attr('stroke-width', strokeWidthDefault)
                    .css('z-index', 1000);
                tooltip.style("visibility", "hidden");
            });

        g.append("text")
            .attr("transform", (d) => {
                return "translate(" + labelArc.centroid(d) + ")";
            })
            .attr("dy", ".20em")
            .style({
                "font-size": "0.6em",
                "fill": "#333333"
            })
            .text((d, j) => {
                return j + 1;
            });
    }
}
