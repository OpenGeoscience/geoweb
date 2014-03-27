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
archive.floodLayer = null

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

  $('#draw-bbox').off('click').click(function() {
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
      var rise, coords, latFrom, latTo, longFrom, longTo, bbox;

      if ($('#draw-bbox').hasClass('active')) {

        rise = $('#depth-slider-input').slider('getValue');
        coords = archive.myMap.getInteractorStyle().getDrawRegion();
        latFrom = coords[0] < coords[2] ? coords[0] : coords[2];
        latTo = coords[0] > coords[2] ? coords[0] : coords[2];
        longFrom = coords[1] < coords[3] ? coords[1] : coords[3]
        longTo = coords[1] > coords[3] ? coords[1] : coords[3];
        bbox = [[longFrom, latFrom], [longFrom, latTo], [longTo, latTo], [longTo, latFrom], [longFrom, latFrom]]

        archive.addLayerToMap(rise, bbox);
        archive.myMap.viewer().interactorStyle().drawRegionMode(false);
        $('#draw-bbox').toggleClass('active')
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

  $('#depth-slider-input').slider({
    tooltip: 'always',
    reversed: true,
    formater: function(value) { return value + " m" }
  });

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
archive.addLayerToMap = function(rise, bbox) {

  var layer = ogs.geo.floodLayer(),
      floodSource = ogs.geo.floodLayerSource(rise, bbox);

  layer.setUsePointSprites(true);
  //layer.setPointSpritesImage(image);
  layer.setDataSource(floodSource);

  archive.myMap.addLayer(layer);
  layer.update(ogs.geo.updateRequest(1));
  archive.myMap.draw();
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
