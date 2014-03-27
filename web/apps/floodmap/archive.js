// Disable console log
// console.log = function() {}

var archive = {};
archive.myMap = null;
archive.floodLayer = null;
archive.floodLayerSource = null;

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
      archive.myMap.viewer().interactorStyle().clearDrawRegion();
      archive.myMap.viewer().interactorStyle().drawRegionMode(active);
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

    //hook up extra info close click
    $('#close-extra-info').off('click').click(function() {
      $("#map-extra-info-box").fadeOut({duration: 200, queue: false});
      $(archive.myMap).off(ogs.geo.command.animateEvent + ".extraInfoBox"); // stop re-querying during animations
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

  if (archive.floodLayerSource == null)
    archive.floodLayerSource = ogs.geo.floodLayerSource();

  archive.floodLayerSource.rise(rise)
  archive.floodLayerSource.boundingBox(bbox);

  if (archive.floodLayer == null) {
    archive.floodLayer = ogs.geo.floodLayer();
    archive.floodLayer.setUsePointSprites(true);
    archive.floodLayer.setDataSource(archive.floodLayerSource);
    archive.myMap.addLayer(archive.floodLayer);
  }

  archive.floodLayer.update(ogs.geo.updateRequest(1));
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
