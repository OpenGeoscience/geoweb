// Disable console log
// console.log = function() {}

var archive = {};
archive.myMap = null;
archive.queriesInProgress = 0;
archive.databaseQueryId = 0;
archive.lastDatabaseQueryProcessed = -1;
archive.esgfQueryId = 0;
archive.lastEsgfQueryProcessed = -1;
archive.queryCachedLat = null;
archive.queryCachedLon = null;
archive.queryCachedVarname = null;
archive.timeseriesPlot = null;

archive.milliseconds_per_year = 1000 * 60 * 60 * 24 * 365.25;

//////////////////////////////////////////////////////////////////////////////
/**
 * Display error message
 *
 * @param errorString
 * @param onClose
 */
//////////////////////////////////////////////////////////////////////////////
archive.error = function(errorString, onClose) {

  $('#error-modal-text').html(errorString);
  $('#error-modal').modal();
  if (onClose)
    $('#error-modal').off('hidden.bs.modal').one('hidden.bs.modal', onClose)
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Invalid query cache
 *
 * @param callback
 */
//////////////////////////////////////////////////////////////////////////////
archive.resetQueryCache = function() {
  archive.queryCachedLat = null;
  archive.queryCachedLon = null;
  archive.queryCachedVarname = null;
  archive.timeseriesPlot = null;
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Display algorithm options
 *
 * @param callback
 */
//////////////////////////////////////////////////////////////////////////////
archive.promptAlgorithm = function(callback) {
  $('#algorithm-dialog').modal({backdrop: 'static'});
  $('#algorithm-dialog #algorithm-ok').off().one('click', function(){
    callback.call(archive);
  })

    $('#algorithm-select').off('keypress').keypress(function(event) {
      if ( event.which == 13 ) {
        event.preventDefault();
        $('#algorithm-dialog #algorithm-ok').click();
      }
    });

    $('#algorithm-select').show();
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Get mongo default configuration
 *
 * @returns {{server: (*|string), database: (*|string), collection: (*|string)}}
 */
//////////////////////////////////////////////////////////////////////////////
archive.getMongoConfig = function() {
  "use strict";
  return {
    server:localStorage.getItem('archive:mongodb-server') || 'localhost',
    database:localStorage.getItem('archive:mongodb-database') || 'documents',
    collection:localStorage.getItem('archive:mongodb-collection') || 'files'
  }
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Setup the basic query components and bindings.
 */
//////////////////////////////////////////////////////////////////////////////
archive.initQueryInterface = function() {

  $('#results-list').tooltip();

  $('#dateFrom').datepicker();
  $('#dateTo').datepicker();

  $(archive).on('query-started', function() {
    archive.queriesInProgress++;
    $('#query-input').addClass("query-in-progress");
  });

  $(archive).on('query-canceled query-finished query-error', function() {
    archive.queriesInProgress--;
    if (archive.queriesInProgress == 0)
      $('#query-input').removeClass("query-in-progress");
  });

  $('#query-input').bind("keyup", function() {
    var query = $('#query-input').val();
    if (query.length == 0) {
      $('#query-input').removeClass("query-in-progress");
      $('#results-list').empty();
      // Stop the processing of any pending queries
      archive.lastDatabaseQueryProcessed = archive.databaseQueryId++
      archive.lastEsgfQueryProcessed = archive.esgfQueryId++
    }
    else {
      archive.queryDatabase(query);
      archive.queryESGF(query);

      if(archive.tutorialMask.isOff('dragAndDrop')) {
        $('#document-table-body').tooltip('show');
        archive.tutorialMask.turnOn('dragAndDrop');
      }
    }
  });

  $('#glcanvas').droppable({
    drop: function(event, ui) {
      var target = $(ui.helper).data("dataset");
      if (target) {
        // The user now knows how to add layers to the map so remove tool tip
        $('#results-list').tooltip('disable');
        archive.addLayer(target);
      }
    }
  });

  $('#drawRegion').off('click').click(function() {
    console.log("click");
    var active = $(this).toggleClass('active').hasClass('active');
    archive.myMap.viewer().interactorStyle().drawRegionMode(active);
    if(active &&
      $.trim($('#longitudeFrom').val()).length > 0 &&
      $.trim($('#longitudeTo').val()).length > 0 &&
      $.trim($('#latitudeFrom').val()).length > 0 &&
      $.trim($('#latitudeTo').val()).length > 0
    ) {
      archive.myMap.getInteractorStyle().setDrawRegion(
        parseFloat($('#latitudeFrom').val()),
        parseFloat($('#longitudeFrom').val()),
        parseFloat($('#latitudeTo').val()),
        parseFloat($('#longitudeTo').val())
      );
    }
  });
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Process the result coming from mongo.
 */
//////////////////////////////////////////////////////////////////////////////
archive.processLocalResults = function(results, remove) {
  remove = typeof remove !== 'undefined' ? remove : false;

  var removeFilter = function(d) {return false};
  if (remove) {
    removeFilter = function(d) {return d['source'] == 'Local'};
  }

  archive.processResults(results, removeFilter);
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Process ESGF results
 *
 * @param results
 * @param remove
 */
//////////////////////////////////////////////////////////////////////////////
archive.processESGFResults = function(results, remove) {
  remove = typeof remove !== 'undefined' ? remove : false;

  removeFilter = function(d) {return false};
  if (remove) {
    removeFilter = function(d) {return d['source'] == 'ESGF'};
  }

  archive.processResults(results, removeFilter);
}

//////////////////////////////////////////////////////////////////////////////
/**
 * Use D3 to update document table with results.
 */
//////////////////////////////////////////////////////////////////////////////
archive.processResults = function(results, removeFilter) {

  var toRemove = [];
  $('#results-list div').each(function(index){
    var dset = $(this).data('dataset');
    if(dset && removeFilter(dset)) {
      toRemove.push($(this));
    }
  });

  $.each(toRemove, function(index, value) {
    value.remove();
  });

  function createResultListItem(dataset, variable, size, source, timeRange) {

    function getVariableTagsOrName() {
      if('tags' in variable && variable['tags'].length > 0) {
        return variable['tags'].slice(0,3).join(',');
      } else if('long_name' in variable) {
        return variable['long_name'];
      } else {
        var long_name_map = {
          'clt': 'Total Cloudiness',
          'tas': 'Surface Air Temperature'
        };
        if(variable['name'] in long_name_map) {
          return long_name_map[variable['name']];
        }
      }
      return variable['name'];
    }

    var $li = $([
      '<div class="variable-item"><div style="pointer-events: none;">',
      '<i class="icon-th pull-left"></i> ',
      '<div class="variable-name">',
      getVariableTagsOrName(),
      '</div>',
      timeRange,
      source,
      size,
      '</div></div>'
    ].join(''));
    $li.data('dataset', dataset);
    $li.data('variable', variable);
    return $li;
  }

  $.each(results, function(index, dataset) {
    var size = dataset['size'],
      source = ['<span class="badge badge-success pull-right">', dataset['source'], '</span>'].join(''),
      timeRange = '&nbsp;',//some text is needed, else the layout may get messed up
      start,
      end;

    if (size && size != 'N/A') {
      size = [
        '<span class="badge pull-right">',
        Math.round(dataset['size']/1024/1024),
        'M</span>'
      ].join('');
    } else {
      size = '';
    }

    if(dataset && 'timeInfo' in dataset && 'dateRange' in dataset['timeInfo']) {
      start = dataset['timeInfo'].dateRange[0];
      end =  dataset['timeInfo'].dateRange[1];
      start = new Date(start[0], start[1], start[2], 0, 0, 0, 0);
      end = new Date(end[0], end[1], end[2], 0, 0, 0, 0);
      timeRange = [
        [
          start.getMonth()+1,
          start.getDate(),
          start.getYear()
        ].join('/'),
        [
          end.getMonth()+1,
          end.getDate(),
          end.getYear()
        ].join('/')
      ].join(' - ')
    }

    $.each(dataset['variables'], function(_index, variable) {
      $('#results-list').append(createResultListItem(dataset, variable, size, source,
        timeRange));
    });
  });

//  var tr = d3.select('#results-list').selectAll("li")
//    .data(results, function(d) {
//      return d['id'];
//    });
//
//  var rows = tr.enter().append('li');
//
//  $.each(tr.exit()[0], function(index, row) {
//    if (row) {
//      selection = d3.select(row);
//      if (removeFilter(selection.data()[0]))
//        selection.remove();
//    }
//  });
//
//  var content = rows.selectAll('div')
//    .data(function(row) {
//      // Display the tags, we should probably truncate the list ...
//      var tags = [];
//      $.each(row['variables'], function(index, variable) {
//        tags = tags.concat(variable['tags']);
//      });
//
//      var size = row['size'];
//
//      if (size && size != 'N/A') {
//        size = Math.round(row['size']/1024/1024) + "M"
//      }
//
//      return [ {column: 'name', data: row['name']},
//               {column: 'source', data: row['source']},
//               {column: 'size', data: size},
//               {column: 'tags', data: tags.join()}] ;
//    });
//
//  content = content.enter().append('div');
//  content.text(function(d) { return d['data']; });
//  content.each(function(d, i) { $(this).addClass(d['column']);});
//
//  // Populate the timesteps parameter list
//  var selectTimestep = rows.append('td');
//  selectTimestep.classed('timesteps', true);
//  selectTimestep = selectTimestep.append('select');
//  selectTimestep.classed('timestep-select', true);
//
//  selectTimestep = selectTimestep.selectAll('select').data(function(row) {
//
//    var timestep  = ['N/A'];
//
//    if (row && 'timeInfo' in row && row['timeInfo'].rawTimes)
//      timestep = row['timeInfo'].rawTimes;
//
//    return timestep;
//  });
//
//  selectTimestep.enter().append('option').text(function(timestep) {
//    return timestep;
//  });
//  selectTimestep.exit().remove();
//
//  // Populate the parameter list
//  var select = rows.append('td');
//  select.classed('parameter', true);
//  select = select.append('select');
//  select.classed("parameter-select", true);
//
//  select = select.selectAll('select').data(function(row) {
//    var variables = [];
//    $.each(row['variables'], function(index, variable) {
//      variables = variables.concat(variable['name']);
//    });
//
//    return variables;
//  });
//
//  select.enter().append('option').text(function(variable) {
//    return variable;
//  });
//  select.exit().remove();

  $('#results-list div').draggable( {
    cursor: 'move',
    containment: 'window',
    appendTo: 'body',
    helper: function(event) {
      var $this = $(this),
        dataset = $this.data('dataset'),
        variable = $this.data('variable'),
        timestep = null,
        drag;

    if (dataset && 'timeInfo' in dataset && 'rawTimes' in dataset['timeInfo']) {
      timestep = dataset['timeInfo'].rawTimes[0];
    }

    drag = $('<div id="parameter" class="whatadrag">' + variable['name'] + '</div>');

    drag.data("dataset", {
      name: dataset.name,
      dataset_id: dataset.id,
      source: dataset.source,
      parameter: variable['name'],
      timestep: timestep,
      timeInfo: dataset.timeInfo,
      url: dataset.url,
      size: dataset.size,
      checksum: dataset.checksum,
      basename: dataset.basename
    });

    return drag;
    }
  })
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Initialize a database query
 *
 * @param query
 */
//////////////////////////////////////////////////////////////////////////////
archive.queryDatabase = function(query) {

  mongo = archive.getMongoConfig();

  // Currently use hand craft query, in future we can problem use text search
  // indexes.
  queryTerms = query.split(" ")
  variableOr = []
  $.each(queryTerms, function(index, value) {
    if (value.length != 0)
      variableOr[index] = {tags: {$regex: '.*' + value +'.*', $options: 'i'}};
  });
  nameOr = []
  $.each(queryTerms, function(index, value) {
    if (value.length != 0)
      nameOr[index] = {name: {$regex: '.*' + value +'.*', $options: 'i'}};
  });

  mongoQuery = {
    $and: [{
      $or: [{
        $or: nameOr
      }, {
        variables: {
          $elemMatch: {
            $or: variableOr
          }
        }
      }]
    }, {
      variables: {
        $not: {
          $size: 0
        }
      }
    }, {
      'timeInfo.rawTimes': {
        $ne: null
      }
    }, {
      private: false
    }]
  };

  //build time and lat/lon query restraints

  /**
   * Converts a date string to a year decimal
   * e.g. 'July 1, 2000' ~> 2000.5
   *
   * @param str {string}
   * @returns {number}
   */
  function decimalYear(str) {
    return (new Date(str)).getTime()/archive.milliseconds_per_year + 1970;
  }

  /**
   * Creates a mongo statement and adds it to the mongoQuery.$and list
   *
   * @param mongoField {string}
   * @param mongoOperator {string}
   * @param selector {string}
   * @param scrubber {function}
   */
  function addQueryRestraint(mongoField, mongoOperator, selector, scrubber) {
    var value = $(selector).val().trim(' '),
      statement = {};

    if(value !== '') {
      value = scrubber.call({}, value);
      statement[mongoField] = {};
      statement[mongoField][mongoOperator] = value;
      mongoQuery.$and.push(statement);
    }
  }

  addQueryRestraint('timeInfo.dateRange.0.0', '$lte', '#dateTo', decimalYear);
  addQueryRestraint('timeInfo.dateRange.1.0', '$gte', '#dateFrom', decimalYear);
  addQueryRestraint('spatialInfo.0', '$lte', '#longitudeTo', parseFloat);
  addQueryRestraint('spatialInfo.1', '$gte', '#longitudeFrom', parseFloat);
  addQueryRestraint('spatialInfo.2', '$lte', '#latitudeTo', parseFloat);
  addQueryRestraint('spatialInfo.3', '$gte', '#latitudeFrom', parseFloat);

  $(archive).trigger('query-started');

  $.ajax({
    type: 'POST',
    url: '/services/mongo/' + mongo.server + '/' + mongo.database + '/' + mongo.collection,
    data: {
      queryId: archive.databaseQueryId++,
      query: JSON.stringify(mongoQuery),
      limit:100,
      fields: JSON.stringify(['name', 'basename', 'timeInfo', 'variables'])
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
        console.log("[error] " + response.error ? response.error : "no results returned from server");
        $(archive).trigger('query-error');
      } else {

        // Convert _id.$oid into id field, this transformation is do so the
        // data is in the same for as other sources. Also add the source.
        $.each(response.result.data, function(index, row) {
          row['id'] = row['_id'].$oid;
          row['source'] = "Local";
          row['size'] = 'N/A';
        });

        // Only process the result if its still relevant
        if (response.result.queryId > archive.lastDatabaseQueryProcessed) {
          archive.processLocalResults(response.result.data, true);
          archive.lastDatabaseQueryProcessed = response.result.queryId;
        }
        $(archive).trigger('query-finished');
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      $(archive).trigger('query-error');
    }
  });
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Get next result set
 *
 * @param queryId
 * @param streamId
 * @param remove
 */
//////////////////////////////////////////////////////////////////////////////
archive.nextResult = function (queryId, streamId, remove) {
  remove = typeof remove !== 'undefined' ? remove : false;

  $.ajax({
    type: 'POST',
    url: '/services/esgf/stream',
    data: {
      queryId: queryId,
      streamId: streamId
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
        console.log("[error] " + response.error ? response.error : "no results returned from server");
        $(archive).trigger('query-error');
      } else {

        if (response.result.queryId >= archive.lastEsgfQueryProcessed) {
          if (response.result.data) {
            $.each(response.result.data, function(index, row) {
              row['source'] = "ESGF";
              // As this will be used as an attribute we need to repalce the .s
              row['id'] = row['id'].replace(/\./g, "-")
            });
            archive.processESGFResults(response.result.data, remove);
          }

          if (response.result.hasNext) {
            setTimeout(function() {archive.nextResult(queryId, streamId)}, 0);
          }
          else {
            $(archive).trigger('query-finished');
          }
        }
        else {
          archive.cancelStream(response.result.streamId);
        }
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      $(archive).trigger('query-error');
    }
  });
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Cancel data stream
 *
 * @param streamId
 */
//////////////////////////////////////////////////////////////////////////////
archive.cancelStream = function (streamId) {

  $.ajax({
    type: 'POST',
    url: '/services/esgf/stream',
    data: {
      streamId: streamId,
      cancel: true
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
        console.log("[error] " + response.error ? response.error : "no results returned from server");
        $(archive).trigger('query-error');
      }
      else {
        $(archive).trigger('query-canceled');
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      $(archive).trigger('query-error');
    }
  });
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Initialize a ESGF query
 *
 * @param query
 */
//////////////////////////////////////////////////////////////////////////////
archive.queryESGF = function(query) {

  $(archive).trigger('query-started');

  var start, end, bbox;

  if ($('#dateFrom').val()) {
    // We add the time zone postfix so we get Date object in the correct time
    // zone.
    start = new Date($('#dateFrom').val() + ' 00:00:00 GMT').toISOString()
  }


  if ($('#dateTo').val()) {
    // We add the time zone postfix so we get Date object in the correct time
    // zone.
    end = new Date($('#dateTo').val() + ' 00:00:00 GMT').toISOString()
  }


  // If one of lat/long fields have been filled in we know a bounding box has
  // been selected so include it in our query. The bounding box needs to be of
  // the following form: [west, south, east, north]
  if ($('#longitudeFrom').val()) {
    bbox = [$('#longitudeFrom').val(), $('#latitudeFrom').val(),
            $('#longitudeTo').val(), $('#latitudeTo').val()]
  }

  data =  { queryId: archive.esgfQueryId++,
            expr: JSON.stringify(query),
            'start': start,
            'end': end,
            bbox: JSON.stringify(bbox)
          }

  $.ajax({
    type: 'POST',
    url: '/services/esgf/query',
    data: data,
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "no results returned from server");
          $(archive).trigger('query-error');
      } else {

        if (response.result.queryId > archive.lastEsgfQueryProcessed) {
          archive.lastEsgfQueryProcessed = response.result.queryId;
          if (response.result.hasNext) {
            archive.streamId = response.result.streamId;
            archive.nextResult(response.result.queryId,
                response.result.streamId, true);
          }
        }
        else {
          // Cancel the stream so it gets cleaned up
          archive.cancelStream(response.result.streamId);
        }
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      $(archive).trigger('query-error');
    }
  });
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Main program
 *
 */
//////////////////////////////////////////////////////////////////////////////
archive.main = function() {
  init();

  $('#error-dialog').hide();
  archive.initQueryInterface();

  var mapOptions = {
    zoom : 6,
    center : ogs.geo.latlng(0.0, 0.0),
    source: '/services/data/land_shallow_topo_2048.png',
    country_boundaries: true
  };

  $(function() {
    archive.myMap = ogs.geo.map(document.getElementById("glcanvas"), mapOptions);
    var canvas = document.getElementById('glcanvas');

    $(archive.myMap.viewer()).on(vgl.command.mouseReleaseEvent, function(event) {

      if ($('#drawRegion').hasClass('active')) {
        var latFrom = parseFloat($('#latitudeFrom').val());
        var latTo = parseFloat($('#latitudeTo').val());
        var longFrom = parseFloat($('#longitudeFrom').val());
        var longTo = parseFloat($('#longitudeTo').val());

        var bbox = [[longFrom, latFrom], [longFrom, latTo], [longTo, latTo], [longTo, latFrom], [longFrom, latFrom]]

        console.log("bbox: " + bbox);

        archive.addLayerToMap(bbox);

        archive.myMap.viewer().interactorStyle().drawRegionMode(false);
        $('#drawRegion').toggleClass('active')

        //$('#drawRegion').toggleClass('active')
        console.log("mouse released");
      }
    });

    // Resize the canvas to fill browser window dynamically
    window.addEventListener('resize', resizeCanvas, false);

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      updateAndDraw(canvas.width, canvas.height);
    }
    resizeCanvas();

    function updateAndDraw(width, height) {

      archive.myMap.draw();
      archive.myMap.resize(width, height);
      archive.myMap.update();
      archive.myMap.draw();
    }

    // Create a placeholder for the layers
    var layersTable = ogs.ui.gis.createLayerList(archive.myMap,
        'layers', 'Layers', archive.toggleLayer, archive.removeLayer,
        archive.timeRange);

    // Ask for mouseMove events
    $(canvas).on("mousemove", function(event) {
      var mousePos = canvas.relMouseCoords(event);
      var infoBox = $("#map-info-box");
      var mapCoord = archive.myMap.displayToMap(mousePos.x, mousePos.y);
      infoBox.html(mapCoord.x.toFixed(2)+" , "+mapCoord.y.toFixed(2)+"<br/>");

/*
      // This version shows the info box near the mouse
      var x = event.pageX+24;
      var y = event.pageY+24;
      var w = infoBox.outerWidth();
      var h = infoBox.outerHeight();
      var cw = $(canvas).width();
      var ch = $(canvas).height();
      // don't overflow the canvas
      if (x + w > cw)
        x = event.pageX - 24 - w;
      if (y + h > ch)
        y = event.pageY - 24 - h;
*/
      // this version shows the info box in the lower left corner
      var h = infoBox.outerHeight();
      var cw = $(canvas).width();
      var ch = $(canvas).height();
      var x = 32;
      var y = ch - h - 32
      infoBox.offset({left: x, top: y});
      return true;
    });

    // hide when moving out of the map
    $(canvas).on("mouseleave", function(event) {
      var mousePos = canvas.relMouseCoords(event);
      var infoBox = $("#map-info-box");
      infoBox.fadeOut();
      return true;
    });

    // show when moving into the map
    $(canvas).on("mouseenter", function(event) {
      var mousePos = canvas.relMouseCoords(event);
      var infoBox = $("#map-info-box");
      infoBox.fadeIn();
      return true;
    });

    // Ask for click events
    $(canvas).on("dblclick", function(event) {
      var mousePos = canvas.relMouseCoords(event),
        extraInfoBox = $("#map-extra-info-box"),
        extraInfoContent = $("#map-extra-info-content"),
        mapCoord = archive.myMap.displayToMap(mousePos.x, mousePos.y);

      extraInfoContent.empty();

      extraInfoBox.animate({
        top: mousePos.y,
        left: mousePos.x
      }, {
        duration: 200,
        queue: false
      }).fadeIn({duration: 200, queue: false});

      mapCoord.event = event;
      archive.myMap.queryLocation(mapCoord);

      // Keep querying on this position at every animateEvent
      $(archive.myMap).off(geo.command.animateEvent + ".extraInfoBox");
      $(archive.myMap).on(geo.command.animateEvent + ".extraInfoBox",
                          function() {
                            extraInfoContent.empty();
                            archive.myMap.queryLocation(mapCoord);
                          }
                         );

      return true;
    });

    //hook up extra info close click
    $('#close-extra-info').off('click').click(function() {
      $("#map-extra-info-box").fadeOut({duration: 200, queue: false});
      $(archive.myMap).off(ogs.geo.command.animateEvent + ".extraInfoBox"); // stop re-querying during animations
    });

    // React to queryResultEvent
    $(archive.myMap).on(geo.command.queryResultEvent, function(event, queryResult) {
      var extraInfoContent = $("#map-extra-info-content");
      var layer = queryResult.layer;
      var layerSource = layer.dataSource();
      var path = null;

      if (layer && layer.name()) {
        extraInfoContent.append("<div style='font-weight:bold;'>" + layer.name() + "</div>");
      }

      var queryData = queryResult. data;
      if (queryData) {
        var newResult = document.createElement("div");
        newResult.style.paddingLeft = "12px";
        for (var idx in queryData) {
          $(newResult).append(idx + " : " + queryData[idx] + "<br/>");
        }
        extraInfoContent.append(newResult);

//        console.log(layerSource);
//        console.log(event.location);


        // Layer source is a must for query
        if (typeof layerSource === 'undefined') {
          return true;
        }

        if (typeof layerSource !== 'undefined' && layerSource !== null) {
          path = layerSource.path();

          if (!archive.timeseriesPlot) {
            // Initialize the time-series plot here
            $("#map-timeseries").empty();
            archive.resetQueryCache();
            archive.timeseriesPlot = new timeseriesPlot("#map-timeseries", 500, 200);
          }

          // TOOD: Currently we don't have the API to get the active variable from a layer.
          if (archive.queryCachedLat === event.location.y &&
              archive.queryCachedLon === event.location.x &&
              archive.queryCachedVarname === layerSource.variableNames()[0] &&
              archive.timeseriesPlot) {
              // Just update the current time pointer
          } else {
            $.ajax({
              url: '/services/cdms/get_time_series?varname='+layerSource.variableNames()[0]+'&filepath='+path+'&lat='
                   +event.location.y+'&lon='+event.location.x,
              success: function(data) {
                var response = JSON.parse(data),
                    result = response['result'];

                console.log('archive.queryCachedLat ' + archive.queryCachedLat);
                console.log('archive.queryCachedLon ' + archive.queryCachedLon);
                console.log('archive.queryCachedVarname ' + archive.queryCachedVarname);
                console.log('event.location.y ' + event.location.y);
                console.log('event.location.x ' + event.location.x);

                archive.queryCachedLat = event.location.y;
                archive.queryCachedLon = event.location.x;
                archive.queryCachedVarname = layerSource.variableNames()[0];
                archive.timeseriesPlot.read(response);
              },
              error: function() {
                console.log("Failed to get time series plot");
              }
            });
          }
        }
      }
      return true;
    });

    // Setup tutorial bitmask
    archive.tutorialMask = new NamedBitMask();
    archive.tutorialMask.add('query');
    archive.tutorialMask.add('dragAndDrop');
    archive.tutorialMask.add('layerOptions');

    // setup tooltips
    $('#query-input').tooltip();
    $('#document-table-body').tooltip();
    $('#layers').tooltip();

    //@todo: check save/load tutorial mask to determine whether or not to show
    if(archive.tutorialMask.isOff('query')) {
      $('#query-input').tooltip('show');
      archive.tutorialMask.turnOn('query');
    }

    //setup map draw region listener
    $(archive.myMap.getInteractorStyle()).on(
      ogs.geo.command.updateDrawRegionEvent,
      function() {
        var coords = archive.myMap.getInteractorStyle().getDrawRegion();

        $('#latitudeFrom').val(coords[0] < coords[2] ? coords[0] : coords[2]);
        $('#longitudeFrom').val(coords[1] < coords[3] ? coords[1] : coords[3]);
        $('#latitudeTo').val(coords[0] > coords[2] ? coords[0] : coords[2] );
        $('#longitudeTo').val(coords[1] > coords[3] ? coords[1] : coords[3]);
      }
    );

    //init tooltips on time and space inputs
    $('#collapse-documents').find('.input-small').tooltip();
  });

  /* set up workflow editor */
  archive.workflowEditor = ogs.wfl.editor({div: "workflowEditor"});

  $('#workflow-dialog').resizable().draggable({ handle: ".modal-header" });

  $('#workflow-dialog').on("resize", function(event, ui) {
    var footerHeight = $('#workflow-dialog .modal-footer').outerHeight(),
      headerHeight = $('#workflow-dialog .modal-header').outerHeight(),
      $body = $('#workflow-dialog .modal-body'),
      paddingTop = parseInt($body.css('padding-top'), 10),
      paddingBottom = parseInt($body.css('padding-bottom'), 10),
      height = ui.size.height - headerHeight - footerHeight - paddingTop - paddingBottom;

    $(ui.element).find(".modal-body").each(function() {
      $(this).css("max-height", height);
    });

    $('#workflowEditor').css('height', height);

    archive.workflowEditor.resize();
  });

  $('#workflow-dialog .modal-body').css('margin-bottom', 0);
  $('.ui-resizeable-s').css('bottom', 0);
  $('.ui-resizeable-e').css('right', 0);

  // Populate the algorithm list
  for(var name in staticWorkflows) {
    if(staticWorkflows.hasOwnProperty(name)) {
      $('#algorithm-select').append($('<option>'+name+'</option>'));
    }
  }

  archive.userName(function(openIdUri) {
    var parts = openIdUri.split('/');
    $('#user-name').html(parts[parts.length-1]);
  });

  $('#logout').click(function(event) {
    archive.logOut();
  });

  //archive.addLayerToMap();
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Initialize web sockets
 */
//////////////////////////////////////////////////////////////////////////////
archive.initWebSockets = function() {
  var ws = srvModule.webSocket({nodes: ['streammaster','streamworker']}),
    streaming = false;

  ws.bind('streammaster', function(message) {
    if(message == 'done') {
      streaming = false;
      //$('#button').html(startText);
    } else {
      var img = new Image();
      img.onload = function() {
        ctx.drawImage(img, parseInt(message.x), parseInt(message.y)-img.height);
      };
      img.src = "data:image/png;base64," + message.img;
      recieveCount += 1;
    }
  });
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Process CSV datasets
 *
 * @param csvdata
 * @returns {Array}
 */
//////////////////////////////////////////////////////////////////////////////
archive.processCSVData = function(csvdata) {
  var table = [];
  var lines = csvdata.split(/\r\n|\n/);

  for ( var i = 0; i < lines.length; i++) {
    var row = lines[i].split(',');
    table.push(row);
  }
  return table;
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Select a layer
 *
 * @param target
 * @param layerId
 * @returns {boolean}
 */
//////////////////////////////////////////////////////////////////////////////
archive.selectLayer = function(target, layerId) {
  var layer = archive. myMap.findLayerById(layerId);

  // See bootstrap issue: https://github.com/twitter/bootstrap/issues/2380
  // don't toggle if data-toggle="button"
  if ($(target).attr('data-toggle') !== 'button') {
      $(target).toggleClass('active');
    }

  if (layer != null) {
    if ($(target).hasClass('active')) {
      if (archive.myMap.selectLayer(layer)) {
        ogs.ui.gis.selectLayer(target, layerId);
        return true;
      }

      return false;
    }
    else {
      archive.myMap.selectLayer(null);
      ogs.ui.gis.selectLayer(null, null);
      return true;
    }
  }

  return false;
}

//////////////////////////////////////////////////////////////////////////////
/**
 * Toggle layer
 *
 * @param target
 * @param layerId
 * @returns {boolean}
 */
//////////////////////////////////////////////////////////////////////////////
archive.toggleLayer = function(target, layerId) {
  var layer = archive.myMap.findLayerById(layerId);
  if (layer != null) {
    archive.myMap.toggleLayer(layer);
    archive.myMap.draw();
    // @todo call ui toggle layer nows
    return true;
  }

  return false;
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Remove a layer from the map
 *
 * @param target
 * @param layerId
 * @returns {boolean}
 */
//////////////////////////////////////////////////////////////////////////////
archive.removeLayer = function(target, layerId) {
  ogs.ui.gis.removeLayer(target, layerId);
  var layer = archive.myMap.findLayerById(layerId);
  if (layer != null) {
    archive.myMap.removeLayer(layer);
    archive.myMap.draw();
    return true;
  }

  return false;
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Compute temporal range for a dataset
 *
 * @param name
 * @param onComplete
 */
//////////////////////////////////////////////////////////////////////////////
archive.timeRange = function(name, onComplete) {
  var query = {name: name};

  $.ajax({
    type: 'POST',
    url: '/services/mongo/' + mongo.server + '/' + mongo.database + '/' + mongo.collection,
    data: {
      query: JSON.stringify(query),
      limit:100,
      fields: JSON.stringify(['timeInfo'])
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "no results returned from server");
      } else {
        onComplete(response.result.data[0].timeInfo);
      }
    }
  });
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Perform ESGF registration for an individual group
 *
 * @param target
 * @param registrationUrl
 * @param group
 * @param role
 */
//////////////////////////////////////////////////////////////////////////////
archive.registerWithGroup = function(target, registrationUrl, group, role) {
  $.ajax({
    type: 'POST',
    url: '/services/esgf/register',
    data: {
      url: registrationUrl,
      group: group,
      role: role
    },
    dataType: 'json',
    success: function(response) {
      console.log(response);
      if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "no results returned from server");
      } else {

        if (response.result.success) {
          // Try again ...
          archive.downloadESGF(target, archive.onDownloadComplete)
        }
        // Redirect user to ESGF
        else {
          $('#esgf-register-redirect').modal();
          $('tr#' + target.dataset_id).remove();
          $('#esgf-register-redirect-button').off('click').on('click', function() {
            window.open(target.url);
            $('#esgf-register-redirect').modal('hide');
          });
        }
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
        console.log(errorThrown)
    }
  });
}

//////////////////////////////////////////////////////////////////////////////
/**
 *  Register with ESGF
 *
 * @param target
 * @param taskId
 */
//////////////////////////////////////////////////////////////////////////////
archive.register = function(target, taskId) {
  $.ajax({
    type: 'POST',
    url: '/services/esgf/registerGroups',
    data: {
      taskId: taskId
    },
    dataType: 'json',
    success: function(response) {
      console.log(response);
      if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "no results returned from server");
      } else {
        $('#esgf-register-table-body').empty();
        $.each(response.result.groups, function(i, details) {
          entry = $('<tr>');
          select = $('<input>');
          select.attr('type', 'checkbox');
          select.attr('role', details.role);
          select.attr('group', details.group);
          select.attr('url', details.url);
          select.addClass('group-selection');
          group = $('<td>');
          group.html(details.group);
          role = $('<td>');
          role.html(details.role);
          site = $('<td>');
          var parser = document.createElement('a');
          parser.href = details.url
          site.html(parser.host);

          entry.append($('<td>').append(select), group, role, site);
          $('#esgf-register-table-body').append(entry);
        });

        $('#esgf-register-dialog').modal();

        $('#esgf-register').attr('clicked', false);
        $('#esgf-register').off('click').on('click', function(event) {
          $('#esgf-register').attr('clicked', true );
          $.each($('.group-selection'), function(i, selection) {

            archive.registerWithGroup(target, $(selection).attr('url'),
                $(selection).attr('group'), $(selection).attr('role'));
          });
        });

        $('#esgf-register-dialog').off('hidden').on('hidden', function() {
          if ($('#esgf-register').attr('clicked') == 'false') {
            $('tr#' + target.dataset_id).remove();
          }
        })

      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
        console.log(errorThrown)
    }
  });
}

//////////////////////////////////////////////////////////////////////////////
/**
 * Moniror ESGF download
 *
 * @param target
 * @param taskId
 * @param onComplete
 */
//////////////////////////////////////////////////////////////////////////////
archive.monitorESGFDownload = function(target, taskId, onComplete) {
  var dataSetId = target.dataset_id;

  $.ajax({
    type: 'POST',
    url: '/services/esgf/download_status',
    data: {
      taskId: taskId
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "no results returned from server");
      } else {

        if (response.result.state == 'CANCELED')
        {
          // We are done just return
          return;
        }
        // Does the user need to register?
        else if (response.result.state == 'FORBIDDEN') {
          archive.register(target, taskId);
          return;
        }
        else if (response.result.state != 'FAILURE') {
          var bar = $('tr#' + dataSetId + ' td:nth-child(4) div.bar');
          bar.width(response.result.percentage+'%');

          // If we are done then we can load the file
          if (response.result.percentage == 100) {
            onComplete(dataSetId);
          }
          else {
            setTimeout(function() {
              archive.monitorESGFDownload(target, taskId, onComplete)
            }, 1000);
          }
        }
        else {
          archive.error(response.result.message, function() {
            $('tr#' + dataSetId).remove();
          });
        }
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
        console.log(errorThrown)
    }
  });
}

//////////////////////////////////////////////////////////////////////////////
/**
 * Handle download complete
 *
 * @param dataSetId
 */
//////////////////////////////////////////////////////////////////////////////

archive.onDownloadComplete = function(dataSetId) {
  var layerRow = $('tr#' + dataSetId);

  var dataSet = layerRow.data("dataset");

  // The row has been removed so we are nolonger interesting in this download.
  if (!dataSet)
    return;

  $.ajax({
    type: 'POST',
    url: '/services/esgf/filepath',
    data: {
      url: dataSet.url
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "Unable to get filepath");
      } else {

        // Remove the progress bar
        $('tr#' + dataSetId + ' #progress').remove();

        archive.promptAlgorithm(function() {
          var algorithm = $('#algorithm-select').val();
          archive.addLayerToMap(dataSet.dataset_id, dataSet.name,
            response.result.filepath, dataSet.parameter, null, algorithm);
        });
      }
    }
  });
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Cancel ESGF download
 *
 * @param taskId
 * @param dataSetId
 */
//////////////////////////////////////////////////////////////////////////////
archive.cancelESGFDownload = function(taskId, dataSetId) {
  // If download hasn't started
  if (taskId == null) {
    var row = $('tr#' + dataSetId);
    row.remove();
  }
  else {
    $.ajax({
      type: 'POST',
      url: '/services/esgf/cancel_download',
      data: {
        taskId: taskId
      },
      dataType: 'json',
      success: function(response) {
        if (response.error !== null) {
            console.log("[error] " + response.error ? response.error : "Unable to cancel task: " + taskId);
        } else {
            $('tr#' + dataSetId).remove();
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
          console.log(errorThrown)
      }
    });
  }
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Download ESGF dataset
 *
 * @param target
 * @param onComplete
 * @param message
 */
//////////////////////////////////////////////////////////////////////////////
archive.downloadESGF = function(target, onComplete, message) {
  $.ajax({
    type: 'POST',
    url: '/services/esgf/download',
    data: {
      url: target.url, // we could reused base name.
      size: target.size,
      checksum: target.checksum,
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "no results returned from server");
      } else {
        if (response.result && 'taskId' in response.result) {
          var taskId = response.result['taskId']
          var dataSetId = target.dataset_id

          if ($('tr#' + dataSetId).length ) {
            $('tr#' + dataSetId + ' td:nth-child(4) #progress');

            // Add listener to cancel the download task if requested
            $('tr#' + dataSetId).on('cancel-download-task', function() {
              archive.cancelESGFDownload(taskId, dataSetId);
            });

            archive.monitorESGFDownload(target, response.result['taskId'],
              onComplete);
          }
          // The row has been removed so cancel the download
          else {
            archive.cancelESGFDownload(taskId, dataSetId);
          }
        } else {
          archive.error("No id return to monitor download");
        }
      }
    }
  });
};

image = new Image();
image.src = '/common/radial_gradient.png';

//////////////////////////////////////////////////////////////////////////////
/**
 * Add a new layer to the map
 *
 * @param id
 * @param name
 * @param filePath
 * @param parameter
 * @param timeval
 * @param algorithm
 */
//////////////////////////////////////////////////////////////////////////////
archive.addLayerToMap = function(bbox) {

  var layer = ogs.geo.featureLayer(),
      floodSource = ogs.geo.floodLayerSource(bbox);

  layer.setUsePointSprites(true);
  layer.setPointSpritesImage(image);
  layer.setDataSource(floodSource);
  layer.update(ogs.geo.updateRequest(1));

  archive.myMap.addLayer(layer);
  archive.myMap.draw();
};


//////////////////////////////////////////////////////////////////////////////
/**
 * Add new layer
 *
 * @param target
 */
//////////////////////////////////////////////////////////////////////////////
archive.addLayer = function(target) {
  var timeval = target.timestep;
  var varval = target.parameter;
  var algorithm = $('#algorithm-select').val();

  // If we already have this layer added just return
  if (ogs.ui.gis.hasLayer($('#table-layers'), target.dataset_id))
    return;

  if (target.source == 'Local') {
    archive.promptAlgorithm(function() {
      ogs.ui.gis.addLayer(archive, 'table-layers', target, archive.selectLayer,
          archive.toggleLayer, archive.removeLayer, function() {
            ogs.ui.gis.layerAdded(target);
            // Calculate the timestep in UTC
            var start = target.timeInfo.dateRange[0];
            var time = new Date(Date.UTC(start[0], start[1], start[2]));
            geo.time.incrementTime(time, target.timeInfo.nativeUnits,
              target.timeInfo.nativeDelta*timeval);
            archive.addLayerToMap(target.dataset_id, target.name, target.basename,
              varval, time.getTime(), algorithm);
          }, archive.workflowLayer);
    });
  }
  else {
    ogs.ui.gis.addLayer(archive, 'table-layers', target, archive.selectLayer,
      archive.toggleLayer, archive.removeLayer, function() {
        archive.downloadESGF(target, archive.onDownloadComplete)
      }, archive.workflowLayer, true);

    $('tr#' + target.dataset_id).on('cancel-download-task', function() {
      archive.cancelESGFDownload(null, target.dataset_id);
    });
  }
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Get username
 *
 * @param onUserName
 */
//////////////////////////////////////////////////////////////////////////////

archive.userName = function(onUserName) {
  $.ajax({
    type: 'GET',
    url: '/services/session',
    data: {
      parameter: 'username'
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
        console.log("[error] " + response.error ? response.error : "no results returned from server");
        $(archive).trigger('query-error');
      } else {
        onUserName(response.result.value);
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      archive.error(errorThrown);
    }
  });
};

//////////////////////////////////////////////////////////////////////////////
/**
 * End the session
 */
//////////////////////////////////////////////////////////////////////////////
archive.logOut = function() {
  $.ajax({
    type: 'DELETE',
    url: '/services/session',
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
        console.log("[error] " + response.error ? response.error : "no results returned from server");
        $(archive).trigger('query-error');
      } else {
        location.reload();
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      archive.error(errorThrown);
    }
  });
};
