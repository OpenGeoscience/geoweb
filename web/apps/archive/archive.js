// Disable console log
// console.log = function() {}

var archive = {};
archive.myMap = null;

archive.error = function(errorString, onClose) {
  $('#error-dialog > p').text(errorString);
  $('#error-dialog')
  .dialog({
    dialogClass: "error-dialog",
    modal: true,
    draggable: false,
    resizable: false,
    minHeight: 15,
    buttons: { "Close": function() {
                 $(this).dialog("close");
                 if (onClose)
                   onClose();
               }
    }
    });
};

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

archive.getMongoConfig = function() {
  "use strict";
    return {
      server:localStorage.getItem('archive:mongodb-server') || 'localhost',
      database:localStorage.getItem('archive:mongodb-database') || 'documents',
      collection:localStorage.getItem('archive:mongodb-collection') || 'files'
    }
};

archive.queriesInProgress = 0;

/**
 * Setup the basic query components and bindings.
 */
archive.initQueryInterface = function() {

  $('#document-table-body').tooltip();

  $('#from').datepicker();
  $('#to').datepicker();

  $(archive).on('query-started', function() {
    archive.queriesInProgress++;
    $('#query-input').addClass("query-in-progress");
  })

  $(archive).on('query-canceled query-finished query-error', function() {
    archive.queriesInProgress--;
    if (archive.queriesInProgress == 0)
      $('#query-input').removeClass("query-in-progress");
  })

  $('#query-input').bind("keyup", function() {
    var query = $('#query-input').val();
    if (query.length == 0) {
      $('#query-input').removeClass("query-in-progress");
      $('#document-table-body').empty();
      // Stop the processing of any pending queries
      archive.lastDatabaseQueryProcessed = archive.databaseQueryId++
      archive.lastEsgfQueryProcessed = archive.esgfQueryId++
    }
    else {
      archive.queryDatabase(query);
      archive.queryESGF(query);
    }
  })

  $('#glcanvas').droppable({
    drop: function(event, ui) {
      var target = $(ui.helper).data("dataset");
      if (target) {
        // The user now knows how to add layers to the map so remove tool tip
        $('#document-table-body').tooltip('disable')
        archive.addLayer(target);
      }
    }
  });
}

/**
 * Process the result coming from mongo.
 */
archive.processLocalResults = function(results, remove) {
  remove = typeof remove !== 'undefined' ? remove : false;

  var removeFilter = function(d) {return false};
  if (remove) {
    removeFilter = function(d) {return d['source'] == 'Local'};
  }

  archive.processResults(results, removeFilter);
};

archive.processESGFResults = function(results, remove) {
  remove = typeof remove !== 'undefined' ? remove : false;

  var removeFilter = function(d) {return false};
  if (remove) {
    removeFilter = function(d) {return d['source'] == 'ESGF'};
  }

  archive.processResults(results, removeFilter);
};

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

  function createResultListItem(dataset, variable, size, timeRange) {

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
      size,
      '</div></div>'
    ].join(''));
    $li.data('dataset', dataset);
    $li.data('variable', variable);
    return $li;
  }

  $.each(results, function(index, dataset) {
    var size = dataset['size'],
      timeRange = '',
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
      $('#results-list').append(createResultListItem(dataset, variable, size,
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

archive.databaseQueryId = 0;
archive.lastDatabaseQueryProcessed = -1;
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

  mongoQuery = {$and: [{$or: [{ $or: nameOr},{variables: {$elemMatch: { $or: variableOr}}}] },
               {variables: {$not: {$size: 0}}}, {'timeInfo.rawTimes': {$ne: null}},
               {private: false}]};

  $(archive).trigger('query-started');

  $.ajax({
    type: 'POST',
    url: '/mongo/' + mongo.server + '/' + mongo.database + '/' + mongo.collection,
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
}

archive.nextResult = function (queryId, streamId, remove) {
  remove = typeof remove !== 'undefined' ? remove : false;

  $.ajax({
    type: 'POST',
    url: '/esgf/stream',
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
}

archive.cancelStream = function (streamId) {

  $.ajax({
    type: 'POST',
    url: '/esgf/stream',
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

archive.esgfQueryId = 0;
archive.lastEsgfQueryProcessed = -1;
archive.queryESGF = function(query) {

  $(archive).trigger('query-started');

  $.ajax({
    type: 'POST',
    url: '/esgf/query',
    data: {
      queryId: archive.esgfQueryId++,
      expr: JSON.stringify(query)
    },
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


/**
 * Main program
 *
 */
archive.main = function() {
  init();

  $('#error-dialog').hide();
  archive.initQueryInterface();

  var mapOptions = {
    zoom : 6,
    center : ogs.geo.latlng(0.0, 0.0),
    source: '/data/land_shallow_topo_2048.png',
    country_boundaries: true
  };

  $(function() {
    archive.myMap = ogs.geo.map(document.getElementById("glcanvas"), mapOptions);
    var canvas = document.getElementById('glcanvas');

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
      return true;
    });

    //hook up extra info close click
    $('#close-extra-info').off('click').click(function() {
      $("#map-extra-info-box").fadeOut({duration: 200, queue: false});
    });

    // React to queryResultEvent
    $(archive.myMap).on(geoModule.command.queryResultEvent, function(event, queryResult) {
      var extraInfoContent = $("#map-extra-info-content");
      var layer = queryResult.layer;
      if (layer && layer.name())
        extraInfoContent.append("<div style='font-weight:bold;'>" + layer.name() + "</div>");
      var queryData = queryResult.data;
      if (queryData) {
        var newResult = document.createElement("div");
        newResult.style.paddingLeft = "12px";
        for (var idx in queryData) {
          $(newResult).append(idx + " : " + queryData[idx] + "<br/>");
        }
        extraInfoContent.append(newResult);
      }
      return true;
    });
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
};

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

archive.processCSVData = function(csvdata) {
  var table = [];
  var lines = csvdata.split(/\r\n|\n/);

  for ( var i = 0; i < lines.length; i++) {
    var row = lines[i].split(',');
    table.push(row);
  }
  return table;
};

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

archive.timeRange = function(name, onComplete) {

  var query = {name: name};

  $.ajax({
    type: 'POST',
    url: '/mongo/' + mongo.server + '/' + mongo.database + '/' + mongo.collection,
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
}

archive.monitorESGFDownload = function(target, taskId, onComplete) {
  var dataSetId = target.dataset_id;

  $.ajax({
    type: 'POST',
    url: '/esgf/download_status',
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
          // Try again?
          archive.downloadESGF(target, onComplete, response.result.message);
        }
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
        console.log(errorThrown)
    }
  });
}

archive.onDownloadComplete = function(dataSetId) {
  var layerRow = $('tr#' + dataSetId);

  // This sucks and is very fragile ... !
  var user = $('#user').val();
  var dataSet = layerRow.data("dataset");

  // The row has been removed so we are nolonger interesting in this download.
  if (!dataSet)
    return;

  $.ajax({
    type: 'POST',
    url: '/esgf/filepath',
    data: {
      userUrl: user,
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

archive.cancelESGFDownload = function(taskId, dataSetId) {

  // If download hasn't started
  if (taskId == null) {
    var row = $('tr#' + dataSetId);
    row.remove();
  }
  else {
    $.ajax({
      type: 'POST',
      url: '/esgf/cancel_download',
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
}

archive.downloadESGF = function(target, onComplete, message) {

  $('#esgf-login').modal({backdrop: 'static'});

  message = typeof message !== 'undefined' ? message : '';

  $('#esgf-login #message').html(message);

  $('#esgf-login #download').off();
  $('#esgf-login #download').one('click', function() {
    var user = $('#user').val();
    var password = $('#password').val();

    $.ajax({
      type: 'POST',
      url: '/esgf/download',
      data: {
        url: target.url, // we could reused base name.
        size: target.size,
        checksum: target.checksum,
        userUrl: user,
        password: password
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
  });

  $('#password').keypress(function(e) {
    if (e.charCode == 13) {
      $('#esgf-login #download').click();
    }
  });

  $('#esgf-login #cancel').off();
  $('#esgf-login #cancel').one('click', function() {
    archive.removeLayer(this, target.dataset_id);
  });

};

archive.addLayerToMap = function(id, name, filePath, parameter, timeval, algorithm) {

  var algorithmData = staticWorkflows[algorithm],
    workflow = ogs.wfl.workflow({
      data: jQuery.extend(true, {}, algorithmData)
    }),
    source = ogs.wfl.layerSource(filePath, archive.getMongoConfig(),
      [parameter], workflow,  function(errorString) {
        archive.error(errorString, function() {
          layerRow = $('#table-layers #' + id);
          if (layerRow)
            layerRow.remove();
        })
      }),
    layer = ogs.geo.featureLayer();

  workflow.setDefaultWorkflowInputs(name, filePath, timeval);

  layer.setName(name);
  layer.setDataSource(source);
  layer.setId(id);
  layer.update(ogs.geo.updateRequest(timeval));

  archive.myMap.addLayer(layer);
  archive.myMap.draw();
}


archive.workflowLayer = function(target, layerId) {
  var layer = archive.myMap.findLayerById(layerId),
    workflow,
    width = Math.floor(window.innerWidth * 0.95),
    height = Math.floor(window.innerHeight * 0.95) - 150,
    modalHeight;

  if(layer != null) {

    $('#workflow-dialog').width(width).height(height);
    modalHeight = height - 140; //magic number for modal body height

    workflow = layer.dataSource().workflow();
    archive.workflowEditor.setWorkflow(workflow);
    $('#workflow-dialog').modal({backdrop: 'static'});

    $('#workflow-dialog').css({
      "margin-left": -width/2,
      "margin-top": -height/2,
      "top": "50%",
      "left": "50%"
    });

    $('#workflow-dialog').find(".modal-body").each(function() {
      $(this).css("max-height", modalHeight);
    });

    $('#workflowEditor').css('height', modalHeight);

    //give browser time to set sizes
    setTimeout(function() {
      archive.workflowEditor.resize();
      archive.workflowEditor.show();
    }, 500);

    $('#workflow-dialog #delete-modules').off().one('click', function() {
      archive.workflowEditor.workflow().deleteSelectedModules();
      archive.workflowEditor.drawWorkflow();
    });

    $('#workflow-dialog #close-workflow').off().one('click', function() {
      archive.workflowEditor.workflow().hide();
    });

    $('#workflow-dialog #execute').off().one('click', function() {
      var workflow = archive.workflowEditor.workflow(),
        variableModule = workflow.getModuleByName('Variable'),
        time = variableModule.getFunctionValue('time');
      time = time == null ? -1 : parseInt(time);
      //@todo: make right call to update layer rendering
      //archive.myMap.animateTimestep(time, [layer]);
    });
  }
};


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
            geoModule.time.incrementTime(time, target.timeInfo.nativeUnits,
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
