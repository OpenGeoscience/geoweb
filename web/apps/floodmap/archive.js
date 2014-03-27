// Disable console log
// console.log = function() {}

var archive = {};
archive.myMap = null;
archive.floodLayer = null

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
 * Main program
 *
 */
//////////////////////////////////////////////////////////////////////////////
archive.main = function() {
  init();

  $('#error-dialog').hide();
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

  $('.ui-resizeable-s').css('bottom', 0);
  $('.ui-resizeable-e').css('right', 0);

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
