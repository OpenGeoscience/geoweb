//////////////////////////////////////////////////////////////////////////////
/**
 * @module floodmap
 */
//////////////////////////////////////////////////////////////////////////////
var floodmap = {};

floodmap.floodLayer = function(arg) {
  "use strict";
  if (!(this instanceof floodmap.floodLayer)) {
    return new floodmap.floodLayer(arg);
  }

  geo.featureLayer.call(this, arg);

  /** @private */
  var m_that = this,
      m_pointSize = 10,
      m_time = -1,
      m_rise = 0,
      m_bbox = null,
      m_resultCache = null,
      m_featureLayer = null,
      m_dataResolution = null,
      m_currentQuery = null,
      m_currentBBox = null,
      m_resolutionChanged = false,
      m_that = this,
      m_panLng = 0, m_panLat = 0,
      m_refresh = true,
      m_scalarsRange = [0, 20],
      m_thresh = 2.0,
      m_clusterSize = 50,
      m_colorTable  = [
                       {end: 0.166 , color: [ 0.07514311, 0.468049805, 1 ]},
                       {end: 0.333, color: [ 0.568724526, 0.646924167, 1 ]},
                       {end: 0.5, color: [ 0.821573924, 0.837809045, 1 ]},
                       {end: 0.666, color: [ 1, 0.88332677, 0.861943246 ]},
                       {end: 0.833, color: [ 1, 0.6289553, 0.568237474 ]},
                       {end: 1, color: [ 1, 0.380759558, 0.320428137]}
                      ];

  var lookupColor  = function(elv) {
   var i, color, start, step;

   color = m_colorTable[0].color;
   start = Number.MIN_VALUE;

   elv = elv / 10

   for (i=0; i< m_colorTable.length; i++) {
     step = m_colorTable[i];

     if (elv > start && elv <= step.end) {
       color = step.color;
       break;
     }
     start = step.end;
   }

   return color;
  };


  var calculateOpacity = function(zoomLevel) {
    var minOpacity = 0.01, maxOpacity = 0.1, maxZoom = 20,
    zoomLevel = m_that.map().zoom();

    return minOpacity + ((maxZoom - zoomLevel)/maxZoom)*(maxOpacity-minOpacity);
  };

  this.addData = function(geoJson, append) {
    var i, features, reader, opacity = calculateOpacity(this.map().zoom()),
        radius = this.calculatePointSize(), color;

    append = append !== undefined ? append : false;

    var i = 0,
    geomFeature = null,
    noOfPrimitives = 0;

    if ((geoJson && geoJson.length < 1) || !geoJson) {
      this.deleteLegend();
      return;
    }

    // Clear our existing features
    if (!append) {
      this.clear();
    }

    reader = new geo.jsonReader({layer: this});
    reader.read(geoJson, function(features) {

      features.forEach(function(feature) {
        feature.style('fillColor', function(d) {
          color = lookupColor(d.z())
          return {r: color[0], g: color[1], b: color[2]}
        }).style('stroke', function() {
          return false;
        }).style('fillOpacity', function(d) {
          return opacity;
        }).position(function(d) {
          return {x: d.x(), y: d.y(), z: 0};
        }).style('radius', function(d) {
          return radius;
        })
      });

      m_that.map().draw();
    });

  };

  this.redraw = function() {
    this.container().draw();
  };

  var getCoursePoints = function(bbox, res, thresh, cluster, batch, clear, id) {
    var errorString,
        pointUrl = '/services/floodmap/points',
        reader, geoJson;

    batch = batch !== undefined ? batch : 0;
    clear = clear !== undefined ? clear : false;
    id = id !== undefined ? id : null;

    //  Reset current query id to prevent stale data being added to view
    if (id == null)
      m_currentQuery = null

    $.get(pointUrl,
          {
            'id': id,
            'bbox': JSON.stringify(bbox),
            rise: m_rise,
            'res': res,
            'thresh': thresh,
            'cluster': cluster,
            'batch': batch
          },
        function(response) {
        if (response.error !== null) {
          errorString = "[error] " + response.error ?
            response.error : "no results returned from server";
          console.log(errorString);
        } else {


          if (id == null) {
            m_currentQuery = response.result.id;
          }

          if (response.result.id === m_currentQuery) {
            if (response.result.geoJson) {
              console.log("Starting to read GeoJSON")

              m_that.addData(response.result.geoJson, !clear);
              m_resolutionChanged = false;
            }

            if ( response.result.hasMore) {
              setTimeout(function() {

                getCoursePoints(bbox, response.result.res, thresh, cluster,
                    response.result.batch, false, response.result.id);
              }, 1000);
            }
          }
        }
      }, 'json');
  };

    var resolutionTable  = [
                             {end: 5,      resolution: 0.1},
                             {end: 7,     resolution: 0.05},
                             {end: 9,    resolution: 0.025},
                             {end: 11,   resolution: 0.0125},
                             {end: 13, resolution: 0.008333}
                           ];

  var selectResolution  = function(delta) {
    var i, res, start, step;

    res = 0.1;
    start = Number.MIN_VALUE;

    for (i=0; i< resolutionTable.length; i++) {
      step = resolutionTable[i];

      if (delta > start && delta <= step.end) {
        res = step.resolution;
        break;
      }
      start = step.end;
    }

    return res
  };


var Rectangle = function (x0, y0, x1, y1) {
  var m_ll = [x0, y0],
      m_tr = [x1, y1];

  this.lowerLeft = function() {
    return m_ll;
  };

  this.upperRight = function() {
    return m_tr;
  };

  this.getBoundingBox = function() {
    return [this.lowerLeft(), this.upperRight()]
  };

  this.contains = function(r) {
    var contains = true;

    contains = contains && r.lowerLeft()[0] >= this.lowerLeft()[0];
    contains = contains && r.lowerLeft()[1] >= this.lowerLeft()[1];
    contains = contains && r.upperRight()[0] <= this.upperRight()[0];
    contains = contains && r.upperRight()[1] <= this.upperRight()[1];

    return contains
  };

  this.width = function() {
    return m_tr[0] - m_ll[0]
  };

  this.height = function() {
    return m_tr[1] - m_ll[1];
  };
}

Rectangle.equal = function(a, b) {
  var equal = function(l1, l2) {
    return  l1[0] === l2[0] && l1[1] === l2[1];
  };

  return equal(a.lowerLeft(), b.lowerLeft()) && equal(a.upperRight, b.upperRight());
}

// [[x1, y1], [x2, y2]]
var intersection = function(a, b) {

    var aLeft, bLeft, aRight, bRight, aTop, bTop, aBottom, bBottom;

    aLeft = a[0][0];
    bLeft = b[0][0];

    aRight = a[1][0];
    bRight = b[1][0];

    aTop = a[1][1];
    bTop = b[1][1];

    aBottom = a[0][1];
    bBottom= b[0][1];

    var x0 = Math.max(aLeft, bLeft);
    var x1 = Math.min(aRight, bRight);

    if (x0 <= x1) {
      var y0 = Math.max(aBottom, bBottom);
      var y1 = Math.min(aTop, bTop);

      if (y0 <= y1) {
        return new Rectangle(x0, y0, x1, y1);
      }
    }

    return null;
  };

  this.fetchPoints = function(zoomLevelChanged) {
    var start, end, delta, res, clippedBBox, radius, clear = true,
    zoomLevel = this.map().zoom(), opacity;

    res = selectResolution(zoomLevel);

    // Clip bounding box based on view extent
    start = this.map().displayToGcs({x: 0, y: $('.webgl-canvas').height()})
    end = this.map().displayToGcs({x: $('.webgl-canvas').width(), y: 0});

    clippedBBox = intersection([[start.x, start.y], [end.x, end.y]],
                                [m_bbox[0], m_bbox[1]]);

    if (clippedBBox == null) {
      clippedBBox = new Rectangle(m_bbox[0][0], m_bbox[0][1],
                                  m_bbox[1][0], m_bbox[1][1]);
    }

    if (m_dataResolution === res && !m_refresh) {
      // If data resolution hasn't changed and we are in the currently selected
      // bounding box then just return
      if (m_currentBBox.contains(clippedBBox)) {


        // Just update the radius and opacity for the current zoom level
        if (zoomLevelChanged) {
          radius = this.calculatePointSize()
          opacity = calculateOpacity(zoomLevel);
          this.features().forEach(function(feature) {
            feature.style('fillOpacity', function(d) {
              return opacity;
            });

            feature.style('radius', function(d) {
              return radius;
            });

          });
        }

        return;
      }
      // Select using the new bounding box, appending to existing features
      clear = true
    }

    m_dataResolution = res;
    m_currentBBox = clippedBBox;
    m_panLng = 0;
    m_panLat = 0;

    m_resolutionChanged = true;

    getCoursePoints(clippedBBox.getBoundingBox(),
        m_dataResolution, m_thresh, m_clusterSize, 0, clear);
  };

  this.calculatePointSize = function() {
    var canvasWidth, canvasHeight, start, factor, end, delta, deltaX, deltaY;

    canvasWidth = $('.webgl-canvas').width();
    canvasHeight = $('.webgl-canvas').height();

    start = this.map().displayToGcs([0, 0]);
    end = this.map().displayToGcs([canvasWidth, 0]);
    deltaX = Math.abs(end[0] - start[0]);

    end = this.map().displayToGcs([0, canvasHeight]);

    deltaY = Math.abs(end[1] - start[1]);
    delta = deltaX > deltaY ? deltaY : deltaX;

    factor = deltaX > deltaY ? canvasHeight : canvasWidth;

    // Calculate point size
    return (m_dataResolution/delta)*factor*2;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   *
   */
  ////////////////////////////////////////////////////////////////////////////
  this.update = function() {
    var start, end, delta, pointSpriteSize;

    // If this is our first pass then set things up
    if (m_dataResolution == null) {
      this.map().baseLayer().geoOn(geo.event.zoom, function() { m_that.fetchPoints(true); });

      this.map().baseLayer().geoOn(geo.event.pan, function(event) {

          var displayCurrentPoint = m_that.map().gcsToDisplay(event.center);
          var displayPreviousPoint = {
              x: displayCurrentPoint.x - event.screenDelta.x,
              y: displayCurrentPoint.y - event.screenDelta.y
          }
          var gcsPreviousPoint = m_that.map().displayToGcs(displayPreviousPoint)

          m_panLng += event.center.x - gcsPreviousPoint.x
          m_panLat += event.center.y - gcsPreviousPoint.y

          if (Math.abs(m_panLng) >= m_currentBBox.width()/4 ||
              Math.abs(m_panLat) >= m_currentBBox.height()/4) {
            m_that.fetchPoints();
          }
        });
    }

    if (m_refresh) {
      this.fetchPoints();
      m_refresh = false;
    }

    if (!m_resolutionChanged)
      this.updatePointSize();

    return;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Return metadata related to data
   */
   ////////////////////////////////////////////////////////////////////////////
  this.getMetaData = function(time) {
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Return spatial-range for the data
   * @returns {Array}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.getSpatialRange = function(varname) {
    return [0, 0];
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Get/Set rise level of the flood
   */
  ////////////////////////////////////////////////////////////////////////////
  this.rise = function(rise) {
    if(rise !== undefined) {
      m_rise = rise
      // Need to trigger refresh
      m_refresh = true

      return this;
    }
    return m_rise;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update bounding box
   */
  ////////////////////////////////////////////////////////////////////////////
  this.boundingBox = function(bbox) {
    if(bbox  !== undefined) {
      m_bbox = bbox;
      // Need to trigger refresh
      m_refresh = true

      return this
    }
    return m_bbox;
  };

////////////////////////////////////////////////////////////////////////////
  /**
   * Update the K-means threshold
   */
  ////////////////////////////////////////////////////////////////////////////
  this.threshold = function(thresh) {
    if(thresh  !== undefined) {
      m_thresh = thresh;
      // Need to trigger refresh
      m_refresh = true

      return this
    }
    return m_thresh;
  };

////////////////////////////////////////////////////////////////////////////
  /**
   * Update the K-means cluster size
   */
  ////////////////////////////////////////////////////////////////////////////
  this.clusterSize = function(cluster) {
    if(cluster  !== undefined) {
      m_clusterSize = cluster;
      // Need to trigger refresh
      m_refresh = true

      return this
    }
    return m_clusterSize;
  }


  ////////////////////////////////////////////////////////////////////////////
  /**
   * Set scalars range
   */
  ////////////////////////////////////////////////////////////////////////////
  this.setScalarRange = function(varname, val) {
    /// TODO HACK
    m_scalarsRange = val.slice(0);
  }

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Get scalars range
   */
  ////////////////////////////////////////////////////////////////////////////
  this.getScalarRange = function(varname) {
    return m_scalarsRange;
  };

  return this;
};

inherit(floodmap.floodLayer, geo.featureLayer);

geo.registerLayer("flood", floodmap.floodLayer);

