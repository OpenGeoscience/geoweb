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

var getBoundingBox = function() {
  var latFrom, longFrom, latTo, longTo, bbox;

  coords = archive.myMap.getInteractorStyle().getDrawRegion();
  latFrom = coords[0] < coords[2] ? coords[0] : coords[2];
  latTo = coords[0] > coords[2] ? coords[0] : coords[2];
  longFrom = coords[1] < coords[3] ? coords[1] : coords[3]
  longTo = coords[1] > coords[3] ? coords[1] : coords[3];
  bbox = [[longFrom, latFrom], [longTo, latTo]];

  return bbox;
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Main program
 *
 */
//////////////////////////////////////////////////////////////////////////////
archive.main = function() {
  $('#disclaimer-dialog').modal({
                                  backdrop: 'static',
                                  keyboard: false
                                });
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
      var rise, bbox;

      if ($('#draw-bbox').hasClass('active')) {

        rise = $('#depth-slider-input').slider('getValue');
        bbox = getBoundingBox();

        archive.checkRegion(bbox).then(function(ok) {

            if (ok) {
              archive.update(rise, bbox);
            }
            else {
              $('#error-modal-heading').html("No data available");
              $('#error-modal-text').html("Data is currently only available for North America. " +
                                          "Please select an area with in this region.");
              $('#error-modal').modal();
            }

            archive.myMap.viewer().interactorStyle().drawRegionMode(false);
            $('#draw-bbox').toggleClass('active');
        });
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
    };

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

    // setup tooltips
    $('#query-input').tooltip();
    $('#document-table-body').tooltip();
    $('#layers').tooltip();

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

  $('#about').click(function(event) {
    $('#about-dialog').modal('show');
  });

  //archive.addLayerToMap();

  $('#depth-slider-input').slider({
    tooltip: 'always',
    reversed: true,
    orientation: 'vertical',
    formater: function(value) { return value + " m" }
  });

  function addToolTips() {
    $('#draw-bbox').tooltip({
                             placement: 'right',
                             trigger: 'manual'
                            });

    $('#draw-bbox').tooltip('show');
    $('#draw-bbox').one('click', function()  {

      setTimeout(function() {
        $('#draw-bbox').tooltip('hide');
      }, 1000);
    });


    $('#depth-slider').attr('title', "Use slider to select sea level rise");
    $('#depth-slider').tooltip({
                                placement: 'right',
                                trigger: 'manual'
                               });
    $('#depth-slider').tooltip('show');
    $('#depth-slider').one('slide', function()  {

      setTimeout(function() {
        $('#depth-slider').tooltip('hide');
      }, 1000);
    });
  };
  addToolTips();

  $('#depth-slider').on('slideStop', function() {
    var bbox, rise;
    bbox = getBoundingBox();
    rise = $('#depth-slider-input').slider('getValue');

    archive.update(rise, bbox);
  });

  $("#threshold-menu .dropdown-menu li a").click(function(){
    var thresh = -1;

    $('#threshold-value').html($(this).text());
    bbox = getBoundingBox();
    rise = $('#depth-slider-input').slider('getValue');

    if ($(this).text() !== "Off") {
      thresh = parseFloat($(this).data('value'));
    }
    archive.floodLayerSource.threshold(thresh);
    archive.update(rise, bbox);
  });

  $('#cluster-menu .dropdown-menu li a' ).click(function() {
    var cluster;

    $('#cluster-value').html($(this).text());
    cluster = parseInt($(this).data('value'));
    archive.floodLayerSource.clusterSize(cluster);
    bbox = getBoundingBox();
    rise = $('#depth-slider-input').slider('getValue');
    archive.update(rise, bbox);
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
 * Update view
 */
//////////////////////////////////////////////////////////////////////////////
archive.update = function(rise, bbox) {

  if (archive.floodLayerSource == null)
    archive.floodLayerSource = ogs.geo.floodLayerSource();

  console.log('rise ', rise);
  archive.floodLayerSource.setScalarRange("rise", [0, rise]);
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

archive.checkRegion = function(bbox) {

  var defer, pointUrl;

  defer = new $.Deferred();
  countUrl = '/services/floodmap/points/count',

  $.get(countUrl,
      {
        'bbox': JSON.stringify(bbox),
        'res': 0.100000
      },
      null,
      'json').then(function(response) {
        if (response.error !== null) {
          errorString = "[error] " + response.error ?
          response.error : "no results returned from server";
          console.log(errorString);
          defer.reject();
        } else {
          defer.resolve(response.result.count !== 0);
        }
     }, function(error) { console.log(error); });

  return defer
}

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
