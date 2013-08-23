// Disable console log test
// console.log = function() {}

var archive = {};
archive.myMap = null;

archive.error = function(errorString) {
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
               }
    }
    });
};

archive.promptAlgorithm = function(event, callback) {

  function okClicked($dialog) {
    $dialog.dialog("close");
    callback.call(this);
  }

  $('#algorithm-dialog').append($('#algorithm-select'));
  $('#algorithm-dialog')
    .dialog({
      title: "Select an algorithm:",
      dialogClass: "algorithm-prompt",
      modal: true,
      draggable: false,
      resizable: false,
      minHeight: 15,
      buttons: {
        "Ok": function() { okClicked($(this)); }
      }
    }).dialog('option', {
      position: [
        event.pageX - $(document).scrollLeft(),
        event.pageY - $(document).scrollTop()
      ]
    });

    $('#algorithm-select').off('keypress').keypress(function(event) {
      if ( event.which == 13 ) {
        event.preventDefault();
        okClicked($('#algorithm-dialog'));
      }
    });
};

archive.getMongoConfig = function() {
  "use strict";
    return {
      server:localStorage.getItem('archive:mongodb-server') || 'localhost',
      database:localStorage.getItem('archive:mongodb-database') || 'documents',
      collection:localStorage.getItem('archive:mongodb-collection') || 'files'
    }
};

/**
 * Setup the basic query components and bindings.
 */
archive.initQueryInterface = function() {

  $('#document-table-body').tooltip();

  $('#from').datepicker();
  $('#to').datepicker();

  $('#query-input').bind("keyup", function() {
    query = $('#query-input').val();
    if (query.length == 0) {
      $('#query-input').removeClass("query-in-progress");
      $('#document-table-body').empty();
    }
    else {
      $('#query-input').addClass("query-in-progress");
      archive.queryDatabase(query);
      archive.queryESGF(query);
    }
  })

  $('#glcanvas').droppable({
    drop: function(event, ui) {
      var target = $(ui.helper).data("dataset");
      archive.promptAlgorithm(event, function() {
        archive.addLayer(target);

        // The user now knows how to add layers to the map so remove tool tip
        $('#document-table-body').tooltip('disable')
      });
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
}

archive.processESGFResults = function(results, remove) {
  remove = typeof remove !== 'undefined' ? remove : false;

  removeFilter = function(d) {return false};
  if (remove) {
    removeFilter = function(d) {return d['source'] == 'ESGF'};
  }

  archive.processResults(results, removeFilter);
}

/**
 * Use D3 to update document table with results.
 */
archive.processResults = function(results, removeFilter) {

  var tr = d3.select('#document-table-body').selectAll("tr")
    .data(results, function(d) {
      return d['id'];
    });

  var rows = tr.enter().append('tr');

  $.each(tr.exit()[0], function(index, row) {
    if (row) {
      selection = d3.select(row);
      if (removeFilter(selection.data()[0]))
        selection.remove();
    }
  });

  var td = rows.selectAll('td')
    .data(function(row) {
      // Display the tags, we should probably truncate the list ...
      var tags = []
      $.each(row['variables'], function(index, variable) {
        tags = tags.concat(variable['tags']);
      });

      var size = row['size'];

      if (size && size != 'N/A') {
        size = Math.round(row['size']/1024/1024) + "M"
      }

      return [ {column: 'name', data: row['name']},
               {column: 'source', data: row['source']},
               {column: 'size', data: size},
               {column: 'tags', data: tags.join()}] ;
    });

    td = td.enter().append('td');
    td.text(function(d) { return d['data']; });
    td.each(function(d, i) { $(this).addClass(d['column']);});

  // Populate the timesteps parameter list
  var selectTimestep = rows.append('td');
  selectTimestep.classed('timesteps', true);
  selectTimestep = selectTimestep.append('select')
  selectTimestep.classed('timestep-select', true);

  selectTimestep = selectTimestep.selectAll('select').data(function(row) {

    var timestep  = ['N/A'];

    if (row && 'timeInfo' in row && row['timeInfo'].rawTimes)
      timestep = row['timeInfo'].rawTimes;

    return timestep;
  });

  selectTimestep.enter().append('option').text(function(timestep) {
    return timestep;
  })
  selectTimestep.exit().remove();

  // Populate the parameter list
  var select = rows.append('td');
  select.classed('parameter', true);
  select = select.append('select');
  select.classed("parameter-select", true);

  select = select.selectAll('select').data(function(row) {
    var variables = [];
    $.each(row['variables'], function(index, variable) {
      variables = variables.concat(variable['name']);
    });

    return variables;
  });

  select.enter().append('option').text(function(variable) {
    return variable;
  });
  select.exit().remove();

  $('#document-table  tr').draggable( {
    cursor: 'move',
    containment: 'window',
    appendTo: 'body',
    helper: function(event) {

    var parameter = $('.parameter-select', this).val();
    var timestep = $('.timestep-select', this).val();

    var timesteps = [];
    $('.timestep-select option', this).each(function() {
      timesteps.push(parseInt($(this).val()));
    });

    if (timestep == 'N/A')
      timestep = null;

    var data = d3.select(this).data();

    drag = $('<div id="parameter" class="whatadrag">' + parameter + '</div>');

    drag.data("dataset", {
      name: data[0].name,
      dataset_id: data[0].id,
      source: data[0].source,
      parameter: parameter,
      timestep: timestep,
      timesteps: timesteps,
      url: data[0].url,
      size: data[0].size,
      checksum: data[0].checksum,
      basename: data[0].basename
    });

    return drag;
    }
  })

  $('#query-input').removeClass("query-in-progress");
}

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
               {variables: {$not: {$size: 0}}}]}

  $.ajax({
    type: 'POST',
    url: '/mongo/' + mongo.server + '/' + mongo.database + '/' + mongo.collection,
    data: {
      query: JSON.stringify(mongoQuery),
      limit:100,
      fields: JSON.stringify(['name', 'basename', 'timeInfo', 'variables'])
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "no results returned from server");
      } else {

        // Convert _id.$oid into id field, this transformation is do so the
        // data is in the same for as other sources. Also add the source.
        $.each(response.result.data, function(index, row) {
          row['id'] = row['_id'].$oid;
          row['source'] = "Local";
          row['size'] = 'N/A';
        });

        archive.processLocalResults(response.result.data, true);
        archive.performingLocalQuery = false;
      }
    }
  });
}

archive.nextResult = function (streamId, remove) {
  remove = typeof remove !== 'undefined' ? remove : false;

  $.ajax({
    type: 'POST',
    url: '/esgf/stream',
    data: {
      streamId: streamId
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "no results returned from server");
      } else {

        // Set the source

        if (response.result.data) {
          $.each(response.result.data, function(index, row) {
            row['source'] = "ESGF";
            // As this will be used as an attribute we need to repalce the .s
            row['id'] = row['id'].replace(/\./g, "-")
          });
          archive.processESGFResults(response.result.data, remove);
        }

        if (response.result.hasNext) {
          setTimeout(function() {archive.nextResult(streamId)}, 0);
        }
        else {
          archive.performingESGFQuery = false;
          //if (archive.isQueryComplete())
          //  $('#query-input').removeClass("query-in-progress");
        }
      }
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
      }
      archive.performingESGFQuery = false;
    }
  });
};

archive.queryESGF = function(query) {
  archive.performingESGFQuery = true;

  $.ajax({
    type: 'POST',
    url: '/esgf/query',
    data: {
      expr: JSON.stringify(query)
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "no results returned from server");
      } else {

        if (response.result.hasNext) {
          archive.streamId = response.result.streamId;
          archive.nextResult(response.result.streamId, true);
        }
      }
    }
  });
};


/**
 * Main program
 *
 */
archive.main = function() {
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

      archive.myMap.redraw();
      archive.myMap.resize(width, height);
      archive.myMap.update();
      archive.myMap.redraw();
    }

    // Create a placeholder for the layers
    var layersTable = ogs.ui.gis.createLayerList(archive.myMap,
        'layers', 'Layers', archive.toggleLayer, archive.removeLayer);

    // Ask for mouseMove events
    $(canvas).on("mousemove", function(event) {
      var mousePos = canvas.relMouseCoords(event);
      var infoBox = $("#map-info-box")[0];
      infoBox.style.left = (event.pageX+24)+"px";
      infoBox.style.top = (event.pageY+24)+"px";
      var mapCoord = archive.myMap.displayToMap(mousePos.x, mousePos.y);
      infoBox.innerHTML = mapCoord.x.toFixed(2)+" , "+mapCoord.y.toFixed(2);
      return true;
    });

    // Ask for click events
    $(canvas).on("click", function(event) {
      var mousePos = canvas.relMouseCoords(event);
      var infoBox = $("#map-info-box")[0];
      infoBox.innerHTML = "";
      infoBox.style.left = (event.pageX+24)+"px";
      infoBox.style.top = (event.pageY+24)+"px";
      var mapCoord = archive.myMap.displayToMap(mousePos.x, mousePos.y);
      archive.myMap.queryLocation(mapCoord);
      return true;
    });

    // React to queryResultEvent
    $(archive.myMap).on(geoModule.command.queryResultEvent, function(event, queryResult) {
      var infoBox = $("#map-info-box")[0];
      var locInfos = queryResult;
      for (var idx in locInfos) {
        infoBox.innerHTML += idx + " : " + locInfos[idx] + "<br/>";
      }
      return true;
    });
  });

  init();
  //archive.initWebSockets();
  initWorkflowCanvas();

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
    archive.myMap.redraw();
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
    archive.myMap.redraw();
    return true;
  }

  return false;
};

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
            setTimeout(function() {archive.monitorESGFDownload(target, taskId, onComplete)}, 1000);
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

        archive.addLayerToMap(dataSet.dataset_id, dataSet.name, response.result.filepath,
            dataSet.parameter, null)
      }
    }
  });
}

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

              archive.monitorESGFDownload(target, response.result['taskId'], onComplete);
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

archive.addLayerToMap = function(target, parameter, timeval, algorithm) {
  var algorithmData = staticWorkflows[algorithm],
    workflow = ogs.wfl.workflow({
      data: jQuery.extend(true, {}, algorithmData)
    }),
    source = ogs.wfl.workflowLayerSource(
      JSON.stringify(target.basename),
      JSON.stringify(parameter),
      workflow,
      archive.error
    ),
    layer = ogs.geo.featureLayer();
  workflow.setDefaultWorkflowInputs(target);
  layer.setName(target.name);
  layer.setDataSource(source);
  layer.setId(target.dataset_id);
  layer.update(ogs.geo.updateRequest(timeval));
  archive.myMap.addLayer(layer);
  archive.myMap.redraw();
};

archive.workflowLayer = function(target, layerId) {
  var layer = archive.myMap.findLayerById(layerId);
  if(layer != null) {
    $('#workflow-dialog')
      .dialog({
        modal: true,
        draggable: true,
        resizable: true,
        minHeight: 300,
        width: Math.floor(window.screen.width * 0.95),
        height: Math.floor(window.screen.height * 0.95),
        buttons: {
          Close: function() {
            $(this).dialog("close");
            layer.dataSource().workflow().hide();
          },
          Execute: function() {
            var workflow = layer.dataSource().workflow(),
              variableModule = workflow.getModuleByName('Variable'),
              time = variableModule.getFunctionValue('time');
            time = time == null ? -1 : parseInt(time);
            archive.myMap.animateTimestep(time, [layer]);
          }
        }
      });
    layer.dataSource().workflow().show();
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
    ogs.ui.gis.addLayer(archive, 'table-layers', target, archive.selectLayer,
      archive.toggleLayer, archive.removeLayer, function() {
        ogs.ui.gis.layerAdded(target);
        archive.addLayerToMap(target, varval, timeval, algorithm);
    }, archive.workflowLayer);
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
