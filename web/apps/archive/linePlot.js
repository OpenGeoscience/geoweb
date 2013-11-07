var linePlot = function(nodeId, width, height) {
  var margin = {top: 20, right: 20, bottom: 30, left: 50},
      width = width || $(nodeId).width(),
      height = height || $(nodeId).height();

  width = width - margin.left - margin.right;
  height = height - margin.top - margin.bottom;

  var parseDate = d3.time.format("%d-%b-%y").parse;

  var x = d3.scale.linear()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  this.read = function(data) {
    $(nodeId).empty();

    data.values.forEach(function(d) {
      d.Time = parseFloat(d.Time);
      d.variable = parseFloat(d.variable);
    });

    x.domain(d3.extent(data.values, function(d) { return d.Time; }));
    y.domain(d3.extent(data.values, function(d) { return d.variable; }));

    var line = d3.svg.line()
      .x(function(d) { return x(d.Time); })
      .y(function(d) { return y(d.variable); });

    var svg = d3.select(nodeId).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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
        .text("value");

    svg.append("path")
        .datum(data.values)
        .attr("class", "line")
        .attr("d", line);
  };
};