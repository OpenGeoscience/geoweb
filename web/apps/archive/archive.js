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
 * Main program
 *
 */
archive.main = function() {

  var mapOptions = {
    zoom : 6,
    center : ogs.geo.latlng(0.0, 0.0),
    source: '/data/land_shallow_topo_2048.png',
    country_boundaries: true
  };

  archive.myMap = ogs.geo.map(document.getElementById("glcanvas"), mapOptions);

  $(function() {
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
     archive.myMap.resize(width, height);
     archive.myMap.redraw();
    }

    // Fetch documents from the database
    archive.getDocuments();

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
  });

  init();
  archive.initWebSockets();
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


archive.getDocuments = function() {
  mongo = archive.getMongoConfig();
  $.ajax({
    type: 'POST',
    url: '/mongo/' + mongo.server + '/' + mongo.database + '/' + mongo.collection,
    data: {
      query: JSON.stringify({}),
      limit:100,
      fields: JSON.stringify(['name', 'basename', 'variables', 'temporalrange'])
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "no results returned from server");
      } else {
        ogs.ui.gis.createDataList('documents', 'Documents', 'table-layers', response.result.data, archive.addLayer);
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      archive.error("Error reading data from mongodb: " + errorThrown)
    }
  });
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


archive.addLayer = function(event) {
  ogs.ui.gis.addLayer(archive, 'table-layers', event.target, archive.selectLayer,
    archive.toggleLayer, archive.removeLayer, function() {
    var widgetName, widget, timeval, varval;

    //figure out what time and variable were chosen
    widgetName = $(event.target).attr('name') + '_tselect';
    widget = document.getElementById(widgetName);
    timeval = widget.options[widget.selectedIndex].text
    widgetName = $(event.target).attr('name') + '_vselect';
    widget = document.getElementById(widgetName);
    varval = widget.options[widget.selectedIndex].text

    var source = ogs.geo.archiveLayerSource(JSON.stringify($(event.target).attr('basename')),
      JSON.stringify(varval), archive.error);
    var layer = ogs.geo.featureLayer();
    layer.setName($(event.target).attr('name'));
    layer.setDataSource(source);
    layer.update(JSON.stringify(timeval));
    archive.myMap.addLayer(layer);
    archive.myMap.redraw();
    ogs.ui.gis.layerAdded(event.target);
    $('.btn-layer').each(function(index){
              $(this).removeClass('disabled');
              $(this).removeAttr('disabled');
    });

    // $.ajax({
    //   type: 'POST',
    //   url: '/data/read',
    //   data: {
    //     expr: JSON.stringify($(event.target).attr('basename')),
    //     vars: JSON.stringify(varval),
    //     time: JSON.stringify(timeval)
    //   },
    //   dataType: 'json',
    //   success: function(response) {
    //     if (response.error !== null) {
    //       console.log("[error] " + response.error ? response.error : "no results returned from server");
    //     } else {
    //       var reader = ogs.vgl.geojsonReader();
    //       //var time0, time2, time3, time4;
    //       //time0 = new Date().getTime();
    //       var geoms = reader.readGJObject(jQuery.parseJSON(response.result.data[0]));
    //       //time1 = new Date().getTime();
    //       for (var i = 0; i < geoms.length; ++i) {
    //         var layer = ogs.geo.featureLayer({
    //           "opacity" : 0.5,
    //           "showAttribution" : 1,
    //           "visible" : 1
    //         }, ogs.geo.geometryFeature(geoms[i]));
    //         var layerId = $(event.target).attr('name');
    //         layer.setName(layerId);
    //         archive.myMap.addLayer(layer);
    //       }
    //       //time2 = new Date().getTime();
    //       archive.myMap.redraw();
    //       //time3 = new Date().getTime();

    //       //time4 = new Date().getTime();
    //       //console.log("vgl times: ", time1-time0, ",", time2-time1, ",", time3-time2, ",", time4-time3);


    //     }
    //   }
    // });

  });
};
