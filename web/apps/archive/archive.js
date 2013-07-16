// Disable console log
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
}

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
archive.initQueryInteface = function() {

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
      archive.query(query);
    }
  })

  $('#glcanvas').droppable({
    drop: function(event, ui) {
      archive.addLayer($(ui.helper).data("dataset"));

      // The user now knows how to add layers to the map so remove tool tip
      $('#document-table-body').tooltip('disable')
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

      return [ {column: 'name', data: row['name']},
               {column: 'source', data: row['source']},
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

  $('tr').draggable( {
    cursor: 'move',
    containment: 'window',
    appendTo: 'body',
    helper: function(event) {

    var parameter = $('.parameter-select', this).val();
    var timestep = $('.timestep-select', this).val();

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
      url: data[0].url,
      basename: data[0].basename
    });

    return drag;
    }
  })

  $('#query-input').removeClass("query-in-progress");
}

archive.query = function(query) {

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
        });

        archive.processLocalResults(response.result.data, true);
        archive.performingLocalQuery = false;
      }
    }
  });
}

/**
 * Main program
 *
 */
archive.main = function() {
  archive.initQueryInteface();

  archive.initQueryInteface();

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

      var layer = archive.myMap.activeLayer();
      if(layer && layer.hasOwnProperty('workflow')) {
        layer.workflow.resize();
      }
    }
    resizeCanvas();

    function updateAndDraw(width, height) {

      archive.myMap.redraw();
      archive.myMap.resize(width, height);
      archive.myMap.update();
      archive.myMap.redraw();
    }

    // Create a placeholder for the layers
    var layersTable = ogs.ui.gis.createList('layers', 'Layers');

    // Create a placeholder for layer controls
    var layersControlTable = ogs.ui.gis.createList('layer-controls', 'Controls');

    // Populate controls
    ogs.ui.gis.createControls(layersControlTable, archive.myMap);

    // Create a place holder for view controls
    // Create a placeholder for layer controls
    var viewControlTable = ogs.ui.gis.createList('view-controls', 'View-Options');

    // Generate options
    ogs.ui.gis.generateOptions(viewControlTable, archive.myMap);


    $(canvas).on("mousemove", function(event) {
        var infoBox = $("#map-info-box")[0];
        infoBox.style.left = (event.pageX+20)+"px";
        infoBox.style.top = (event.pageY+20)+"px";
        infoBox.innerHTML = "["+event.pageX+","+event.pageY+"]";
        var worldPos = archive.myMap.windowToWorld(event.pageX, event.pageY);
        infoBox.innerHTML += "<br>"+worldPos;
        return true;
    });

  });

  init();
  archive.initWebSockets();
  initWorkflowCanvas();
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



}


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
  if ($(target).attr('data-toggle') !== 'button') { // don't toggle if data-toggle="button"
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
  var layer = archive.myMap.findLayerById(layerId);
  if (layer != null) {
    archive.myMap.removeLayer(layer);
    archive.myMap.redraw();
    ogs.ui.gis.removeLayer(target, layerId);
    return true;
  }

  return false;
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
          "Close": function() {
            $(this).dialog("close");
            layer.setVisible(false);
          }
        }
      });
    activeWorkflow = layer.workflow;
    layer.workflow.show();
  }
}

archive.addLayer = function(target) {
  ogs.ui.gis.addLayer(archive, 'table-layers', target, archive.selectLayer,
    archive.toggleLayer, archive.removeLayer, archive.workflowLayer, function() {
    var widgetName, widget, timeval, varval;

    var timeval = target.timestep;
    var varval = target.parameter;

    var source = ogs.geo.archiveLayerSource(JSON.stringify(target.basename),
      JSON.stringify(varval), archive.error);
    var layer = ogs.geo.featureLayer();
    layer.setName(target.name);
    layer.setDataSource(source);

    layer.update(ogs.geo.updateRequest(timeval));
    layer.workflow = ogs.ui.workflow({data:exworkflow});

    archive.myMap.addLayer(layer);
    archive.myMap.redraw();
    ogs.ui.gis.layerAdded(target);
    $('.btn-layer').each(function(index){
      $(this).removeClass('disabled');
      $(this).removeAttr('disabled');
    });

  });
};
