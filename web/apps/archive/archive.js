// Disable console log
// console.log = function() {}

var archive = {};
archive.myMap = null;

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
    zoom : 1,
    center : ogs.geo.latlng(30.0, 70.0)
  };

  archive.myMap = ogs.geo.map(document.getElementById("glcanvas"), mapOptions);
  var planeLayer = ogs.geo.featureLayer({
    "opacity" : 1,
    "showAttribution" : 1,
    "visible" : 1
  }, ogs.geo.planeFeature(ogs.geo.latlng(-90.0, 0.0), ogs.geo.latlng(90.0,
                                                                     180.0)));
 archive.myMap.addLayer(planeLayer);

  // Read city geo-coded data
  var table = [];
  var citieslatlon = [];
  var colors = [];
  $.ajax({
    type : "GET",
    url : "/data/assets/cities.csv",
    dataType : "text",
    success : function(data) {
      table = archive.processCSVData(data);
      if (table.length > 0) {
        var i;
        for (i = 0; i < table.length; ++i) {
          if (table[i][2] != undefined) {
            var lat = table[i][2];
            lat = lat.replace(/(^\s+|\s+$|^\"|\"$)/g, '');
            lat = parseFloat(lat);

            var lon = table[i][3];
            lon = lon.replace(/(^\s+|\s+$|^\"|\"$)/g, '');
            lon = parseFloat(lon);
            citieslatlon.push(lon, lat, 0.0);
            colors.push(1.0, 1.0, 153.0 / 255.0);
          }
        }

        // Load image to be used for drawing dots
        var image = new Image();
        image.src = '/data/assets/spark.png';
        image.onload = function() {
          var pointLayer = ogs.geo.featureLayer({
            "opacity" : 1,
            "showAttribution" : 1,
            "visible" : 1
          }, ogs.geo.pointSpritesFeature(image, citieslatlon, colors));

         archive.myMap.addLayer(pointLayer);
        };
      }
    }
  });

  // Listen for slider slidechange event
  $('#opacity').slider().bind('slide', function(event, ui) {
    planeLayer.setOpacity(ui.value);
   archive.myMap.redraw();
  });

  $('#opacity').on('mousedown', function(e) {
    e.stopPropagation();
    return false;
  });

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
    ogs.ui.gis.createGisLayerList('layers', 'Layers');
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

archive.getDocuments = function() {
  mongo = archive.getMongoConfig();
  $.ajax({
    type: 'POST',
    url: '/mongo/' + mongo.server + '/' + mongo.database + '/' + mongo.collection,
    data: {
      query: JSON.stringify({}),
      limit:100,
      fields: JSON.stringify(['name', 'basename'])
    },
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "no results returned from server");
      } else {
        var noOfResults = response.result.data.length;
        ogs.ui.gis.createGisDataList('documents', 'Documents', 'layers-table', response.result.data, archive.addLayer);
      }
    }
  });
};


archive.toggleLayer = function(layerId) {
  var layer = archive.myMap.findLayerById(layerId);
  if (layer != null) {
    archive.myMap.toggleLayer(layer);
    archive.myMap.redraw();
    // @todo call ui toggle layer nows
    return true;
  }

  return false;
};


archive.removeLayer = function(layerId) {
  var layer = archive.myMap.findLayerById(layerId);

  if (layer != null) {
    archive.myMap.removeLayer(layer);

    return true;
  }

  return false;
};


archive.addLayer = function(event) {
//  console.log(event.target);
//  console.log($(event.target).attr('basename'));
//  console.log($(event.target).attr('name'));
  ogs.ui.gis.addLayer(archive, 'layers-table', event.target, 'archive.toggleLayer', 'archive.removeLayer', function() {
    $.ajax({
      type: 'POST',
      url: '/data/read',
      data: {
        expr: JSON.stringify($(event.target).attr('basename'))
      },
      dataType: 'json',
      success: function(response) {
        if (response.error !== null) {
          console.log("[error] " + response.error ? response.error : "no results returned from server");
        } else {
          var reader = ogs.vgl.geojsonReader();
          var geoms = reader.readGJObject(jQuery.parseJSON(response.result.data[0]));
          for (var i = 0; i < geoms.length; ++i) {
            var layer = ogs.geo.featureLayer({
              "opacity" : 1,
              "showAttribution" : 1,
              "visible" : 1
            }, ogs.geo.geometryFeature(geoms[i]));
            layer.setName($(event.target).attr('name'));
            archive.myMap.addLayer(layer);
          }
          archive.myMap.redraw();

          $('.layer-button').each(function(index){
              $(this).removeClass('disabled');
              $(this).removeAttr('disabled');
            }
          );
        }
      }
    });
  });
};
