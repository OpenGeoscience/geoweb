var linePlot = function(nodeId) {
  // Test dataset
  this.dataset = [
    {"date": "1-May-12",	"close": 582.13},

    {"date": "30-Apr-12",	"close": 583.98},
    {"date": "27-Apr-12",	"close": 603.00},
    {"date": "26-Apr-12",	"close": 607.70},
    {"date": "25-Apr-12",	"close": 610.00},
    {"date": "24-Apr-12",	"close": 560.28},
    {"date": "23-Apr-12",	"close": 571.70},
    {"date": "20-Apr-12",	"close": 572.98},
    {"date": "19-Apr-12",	"close": 587.44},
    {"date": "18-Apr-12",	"close": 608.34},
    {"date": "17-Apr-12",	"close": 609.70}];

  var margin = {top: 20, right: 20, bottom: 30, left: 50},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var parseDate = d3.time.format("%d-%b-%y").parse;

  var x = d3.time.scale()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var line = d3.svg.line()
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.close); });

  var svg = d3.select(nodeId).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  this.read = function(data) {
    data.forEach(function(d) {
      d.date = parseDate(d.date);
      d.close = +d.close;
    });

    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain(d3.extent(data, function(d) { return d.close; }));

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Price ($)");

    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);
  };
};