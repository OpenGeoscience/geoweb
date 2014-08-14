// Disable console log
// console.log = function() {}

floodmap.myMap = null;
floodmap.layer = null;

//////////////////////////////////////////////////////////////////////////////
/**
 * Display error message
 *
 * @param errorString
 * @param onClose
 */
//////////////////////////////////////////////////////////////////////////////
floodmap.error = function(errorString, onClose) {

  $('#error-modal-text').html(errorString);
  $('#error-modal').modal();
  if (onClose)
    $('#error-modal').off('hidden.bs.modal').one('hidden.bs.modal', onClose)
};

var getBoundingBox = function(regionSelectEvent) {
  var latFrom, longFrom, latTo, longTo, bbox;

  latFrom = regionSelectEvent.lowerRight[1] < regionSelectEvent.upperLeft[1] ?
            regionSelectEvent.lowerRight[1] : regionSelectEvent.upperLeft[1];
  latTo = regionSelectEvent.lowerRight[1] > regionSelectEvent.upperLeft[1] ?
          regionSelectEvent.lowerRight[1] : regionSelectEvent.upperLeft[1];
  longFrom = regionSelectEvent.lowerRight[0] < regionSelectEvent.upperLeft[0] ?
             regionSelectEvent.lowerRight[0] : regionSelectEvent.upperLeft[0]
  longTo = regionSelectEvent.lowerRight[0] > regionSelectEvent.upperLeft[0] ?
           regionSelectEvent.lowerRight[0] : regionSelectEvent.upperLeft[0];
  bbox = [[longFrom, latFrom], [longTo, latTo]];

  return bbox;
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Main program
 *
 */
//////////////////////////////////////////////////////////////////////////////
floodmap.main = function() {
  $('#disclaimer-dialog').modal({
                                  backdrop: 'static',
                                  keyboard: false
                                });
  $('#error-dialog').hide();
  $('#draw-bbox').off('click').click(function() {
    console.log("click");
    var active = $(this).toggleClass('active').hasClass('active');
      floodmap.myMap.baseLayer().renderer().viewer().interactorStyle().clearRegionSelection();
      floodmap.myMap.baseLayer().renderer().viewer().interactorStyle().selectRegion(active);
  });


  var mapOptions = {
    node: '#geojs-map',
    zoom : 6,
    center : [0.0, 0.0],
    source: '/services/data/land_shallow_topo_2048.png',
    country_boundaries: true
  };

  $(function() {
    var layer = null;
    floodmap.myMap = geo.map(mapOptions);
    layer = floodmap.myMap.createLayer('osm', {'renderer' : 'vglRenderer'});
    floodmap.myMap.draw();

    var canvas = document.getElementById('geojs-map');

    $(floodmap.myMap.baseLayer().renderer().viewer().interactorStyle()).on(geo.event.regionSelect, function(event) {
      var rise, bbox;

      if ($('#draw-bbox').hasClass('active')) {

        rise = $('#depth-slider-input').slider('getValue');
        bbox = getBoundingBox(event);

        floodmap.checkRegion(bbox).then(function(ok) {

            if (ok) {
              floodmap.update(rise, bbox);
            }
            else {
              $('#error-modal-heading').html("No data available");
              $('#error-modal-text').html("Data is currently only available for North America. " +
                                          "Please select an area with in this region.");
              $('#error-modal').modal();
            }

            floodmap.myMap.interactorStyle().selectRegion(false);
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
      floodmap.myMap.resize(0, 0, width, height);
      floodmap.myMap.draw();
    };

    // Ask for mouseMove events
    $(canvas).on("mousemove", function(event) {
      var infoBox = $("#map-info-box");
      var mapCoord = floodmap.myMap.displayToGcs([event.pageX, event.pageY]);
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
      var infoBox = $("#map-info-box");
      infoBox.fadeOut();
      return true;
    });

    // show when moving into the map
    $(canvas).on("mouseenter", function(event) {
      var infoBox = $("#map-info-box");
      infoBox.fadeIn();
      return true;
    });

    //hook up extra info close click
    $('#close-extra-info').off('click').click(function() {
      $("#map-extra-info-box").fadeOut({duration: 200, queue: false});
      $(floodmap.myMap).off(ogs.geo.command.animateEvent + ".extraInfoBox"); // stop re-querying during animations
    });

    // setup tooltips
    $('#query-input').tooltip();
    $('#document-table-body').tooltip();
    $('#layers').tooltip();

    //init tooltips on time and space inputs
    $('#collapse-documents').find('.input-small').tooltip();
  });

  $('.ui-resizeable-s').css('bottom', 0);
  $('.ui-resizeable-e').css('right', 0);

  floodmap.userName(function(openIdUri) {
    var parts = openIdUri.split('/');
    $('#user-name').html(parts[parts.length-1]);
  });

  $('#about').click(function(event) {
    $('#about-dialog').modal('show');
  });

  //floodmap.addLayerToMap();

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

    floodmap.update(rise, bbox);
  });

  $("#threshold-menu .dropdown-menu li a").click(function(){
    var thresh = -1;

    $('#threshold-value').html($(this).text());
    bbox = getBoundingBox();
    rise = $('#depth-slider-input').slider('getValue');

    if ($(this).text() !== "Off") {
      thresh = parseFloat($(this).data('value'));
    }
    floodmap.layer.threshold(thresh);
    floodmap.update(rise, bbox);
  });

  $('#cluster-menu .dropdown-menu li a' ).click(function() {
    var cluster;

    $('#cluster-value').html($(this).text());
    cluster = parseInt($(this).data('value'));
    floodmap.layer.clusterSize(cluster);
    bbox = getBoundingBox();
    rise = $('#depth-slider-input').slider('getValue');
    floodmap.update(rise, bbox);
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
floodmap.removeLayer = function(target, layerId) {
  ogs.ui.gis.removeLayer(target, layerId);
  var layer = floodmap.myMap.findLayerById(layerId);
  if (layer != null) {
    floodmap.myMap.removeLayer(layer);
    floodmap.myMap.draw();
    return true;
  }

  return false;
};
//////////////////////////////////////////////////////////////////////////////
/**
 * Update view
 */
//////////////////////////////////////////////////////////////////////////////
floodmap.update = function(rise, bbox) {
  console.log('rise ', rise);

  if (floodmap.layer == null) {
    floodmap.layer = floodmap.floodLayer();
    floodmap.layer.setUsePointSprites(true);
    floodmap.layer.setScalarRange("rise", [0, rise]);
    floodmap.layer.rise(rise)
    floodmap.layer.boundingBox(bbox);

    floodmap.myMap.addLayer(floodmap.layer);
  }

  floodmap.layer.update(ogs.geo.updateRequest(1));
  floodmap.myMap.draw();
};

floodmap.checkRegion = function(bbox) {

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

floodmap.userName = function(onUserName) {
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
        $(floodmap).trigger('query-error');
      } else {
        onUserName(response.result.value);
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      floodmap.error(errorThrown);
    }
  });
};

//////////////////////////////////////////////////////////////////////////////
/**
 * End the session
 */
//////////////////////////////////////////////////////////////////////////////
floodmap.logOut = function() {
  $.ajax({
    type: 'DELETE',
    url: '/services/session',
    dataType: 'json',
    success: function(response) {
      if (response.error !== null) {
        console.log("[error] " + response.error ? response.error : "no results returned from server");
        $(floodmap).trigger('query-error');
      } else {
        location.reload();
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      floodmap.error(errorThrown);
    }
  });
};
