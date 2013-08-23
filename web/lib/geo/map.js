//////////////////////////////////////////////////////////////////////////////
/**
 * @module geoModule
 */

/*jslint devel: true, forin: true, newcap: true, plusplus: true*/
/*jslint white: true, indent: 2*/

/*global geoModule, ogs, inherit, $, HTMLCanvasElement, Image*/
/*global vglModule, document*/
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
/**
 * Map options object specification
 */
//////////////////////////////////////////////////////////////////////////////
geoModule.mapOptions = {
  zoom: 0,
  center: geoModule.latlng(0.0, 0.0),
  gcs: 'EPSG:3857',
  display_gcs: 'EPSG:4326',
  country_boundaries: true,
  state_boundaries: false,
};

//////////////////////////////////////////////////////////////////////////////
/**
 * Create a new instance of class map
 *
 * @class Creates a new map inside of the given HTML container (Typically DIV)
 * @returns {geoModule.map}
 */
//////////////////////////////////////////////////////////////////////////////
geoModule.map = function(node, options) {
  "use strict";
  if (!(this instanceof geoModule.map)) {
    return new geoModule.map(node, options);
  }
  vglModule.object.call(this);

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Private member variables
   * @private
   */
  ////////////////////////////////////////////////////////////////////////////
  var m_that = this,
      m_node = node,
      m_initialized = false,
      m_options = options,
      m_layers = {},
      m_activeLayer = null,
      m_mapLayer = null,
      m_featureCollection = geoModule.featureCollection(),
      m_renderTime = vglModule.timestamp(),
      m_lastPrepareToRenderingTime = vglModule.timestamp(),
      m_interactorStyle = null,
      m_viewer = null,
      m_renderer = null,
      m_updateRequest = null,
      m_prepareForRenderRequest = null,
      m_animationStep = 0;

  m_renderTime.modified();

  if (!options.gcs) {
    m_options.gcs = 'EPSG:3857';
  }

  if (!options.display_gcs) {
    m_options.display_gcs = 'EPSG:4326';
  }

  if (!options.center) {
    m_options.center = geoModule.latlng(0.0, 0.0);
  }

  if (options.zoom === undefined) {
    m_options.zoom = 10;
  }

  if (!options.source) {
    console.log("[error] Map requires valid source for the context");
    return null;
  }

  // Initialize
  m_interactorStyle = geoModule.mapInteractorStyle();
  m_viewer = vglModule.viewer(m_node);
  m_viewer.setInteractorStyle(m_interactorStyle);
  m_viewer.init();
  m_viewer.renderWindow().resize($(m_node).width(), $(m_node).height());
  m_renderer = m_viewer.renderWindow().activeRenderer();

  m_prepareForRenderRequest =
    geoModule.prepareForRenderRequest(m_options, m_viewer, m_featureCollection);
  m_updateRequest = geoModule.updateRequest(null, m_options, m_viewer, m_node);

  $(m_prepareForRenderRequest).on(geoModule.command.requestRedrawEvent,
    function(event) {
      m_that.redraw();
  });
  $(m_updateRequest).on(geoModule.command.requestRedrawEvent,
    function(event) {
      m_that.redraw();
  });

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update view based on the zoom
   * @private
   */
  ////////////////////////////////////////////////////////////////////////////
  function updateViewZoom(useCurrent) {
    m_interactorStyle.zoom(m_options, useCurrent);
  }

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Compute zoom level based on the camera distance and then perform update
   * @private
   */
  ////////////////////////////////////////////////////////////////////////////
  function computeZoom() {
    var camera = m_renderer.camera();

    if (camera.position()[2] < 0) {
      m_options.zoom = 3;
    }
    else if (camera.position()[2] < 0.02) {
      m_options.zoom = 17;
    }
    else if (camera.position()[2] < 0.05) {
      m_options.zoom = 16;
    }
    else if (camera.position()[2] < 0.10) {
      m_options.zoom = 15;
    }
    else if (camera.position()[2] < 0.15) {
      m_options.zoom = 14;
    }
    else if (camera.position()[2] < 0.25) {
      m_options.zoom = 13;
    }
    else if (camera.position()[2] < 0.5) {
      m_options.zoom = 12;
    }
    else if (camera.position()[2] < 1) {
      m_options.zoom = 11;
    }
    else if (camera.position()[2] < 3) {
      m_options.zoom = 10;
    }
    else if (camera.position()[2] < 5) {
      m_options.zoom = 9;
    }
    else if (camera.position()[2] < 10) {
      m_options.zoom = 8;
    }
    else if (camera.position()[2] < 15) {
      m_options.zoom = 7;
    }
    else if (camera.position()[2] < 35) {
      m_options.zoom = 6;
    }
    else if (camera.position()[2] < 50) {
      m_options.zoom = 5;
    }
    else if (camera.position()[2] < 200) {
      m_options.zoom = 4;
    }
    else if (camera.position()[2] < Number.MAX_VALUE) {
      m_options.zoom = 3;
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update view extents
   * @private
   */
  ////////////////////////////////////////////////////////////////////////////
  function updateViewExtents() {
    m_that.update(m_updateRequest);
  }

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Initialize the scene
   * @private
   */
  ////////////////////////////////////////////////////////////////////////////
  function initScene() {
    updateViewZoom();
    m_initialized = true;
  }

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Initialize the scene (if not initialized) and then render the map
   * @private
   */
  ////////////////////////////////////////////////////////////////////////////
  function draw() {
    if (m_initialized === false) {
      initScene();
    }
    m_viewer.render();
  }

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Increment current animation step and then return its current value
   *
   * @returns {number}
   */
  ////////////////////////////////////////////////////////////////////////////
  function nextAnimationStep() {
    return ++m_animationStep;
  }

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Decrement current animation step and then return its current value
   *
   * @returns {number}
   *
   * @private
   */
  ////////////////////////////////////////////////////////////////////////////
  function prevAnimationStep() {
    return --m_animationStep;
  }

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Reset the animation step
   *
   * @private
   */
  ////////////////////////////////////////////////////////////////////////////
  function resetAnimationStep() {
    m_animationStep = 0;
  }

  /**
   * Get map options
   */
  ////////////////////////////////////////////////////////////////////////////
  this.options = function() {
    return m_options;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Get the zoom level of the map
   *
   * @returns {Number}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.zoom = function() {
    return m_options.zoom;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Set zoom level of the map
   *
   * @param val [0-17]
   */
  ////////////////////////////////////////////////////////////////////////////
  this.setZoom = function(val) {
    if (val !== m_options.zoom) {
      m_options.zoom = val;
      $(this).trigger(geoModule.command.updateViewZoomEvent);
      return true;
    }

    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Add layer to the map
   *
   * @method addLayer
   * @param {geo.layer} layer to be added to the map
   * @return {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.addLayer = function(layer) {
    if (layer !== null) {
      // TODO Check if the layer already exists
      if (!layer.binNumber() || layer.binNumber() === -1) {
        layer.setBinNumber(Object.keys(m_layers).length);
      }

      // Transform layer
      geoModule.geoTransform.transformLayer(m_options.gcs, layer);

      m_layers[layer.id()] = layer;
      this.predraw();
      this.modified();

      $(this).trigger({
        type: geoModule.command.addLayerEvent,
        layer: layer
      });
      return true;
    }
    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Remove layer from the map
   *
   * @method removeLayer
   * @param {geo.layer} layer that should be removed from the map
   * @return {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.removeLayer = function(layer) {
    if (layer !== null && typeof layer !== 'undefined') {
      m_renderer.removeActors(layer.features());
      this.modified();
      $(this).trigger({
        type: geoModule.command.removeLayerEvent,
        layer: layer
      });
      return true;
    }

    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Toggle visibility of a layer
   *
   *  @method toggleLayer
   *  @param {geo.layer} layer
   *  @returns {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.toggleLayer = function(layer) {
    if (layer !== null && typeof layer !== 'undefined') {
      layer.setVisible(!layer.visible());
      this.modified();
      $(this).trigger({
        type: geoModule.command.toggleLayerEvent,
        layer: layer
      });
      return true;
    }

    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Return current or active layer
   *
   * @returns {geo.layer}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.activeLayer = function() {
    return m_activeLayer;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Make a layer current or active for operations
   *
   * @method selectLayer
   * @param {geo.layer} layer
   * @returns {Boolean}
   *
   */
  ////////////////////////////////////////////////////////////////////////////
  this.selectLayer = function(layer) {
    if (typeof layer !== 'undefined' && m_activeLayer !== layer) {
      m_activeLayer = layer;
      this.modified();
      if (layer !== null) {
        $(this).trigger({
          type: geoModule.command.selectLayerEvent,
          layer: layer
        });
      } else {
        $(this).trigger({
          type: geoModule.command.unselectLayerEvent,
          layer: layer
        });
      }
      return true;
    }

    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Find layer by layer id
   *
   * @method findLayerById
   * @param {String} layerId
   * @returns {geo.layer}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.findLayerById = function(layerId) {
    if (m_layers.hasOwnProperty(layerId)) {
      return m_layers[layerId];
    }
    return null;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Resize map
   *
   * @param {Number} width
   * @param {Number} height
   */
  ////////////////////////////////////////////////////////////////////////////
  this.resize = function(width, height) {
    m_viewer.renderWindow().resize(width, height);
    $(this).trigger({
      type: geoModule.command.resizeEvent,
      width: width,
      height: height
    });
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Toggle country boundaries
   *
   * @returns {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.toggleCountryBoundaries = function() {
    var layer = null,
        reader = null,
        geoms = null,
        result = false;

    layer = this.findLayerById('country-boundaries');
    if (layer !== null) {
      layer.setVisible(!layer.visible());
      result = layer.visible();
    } else {
      // Load countries data first
      reader = vglModule.geojsonReader();
      geoms = reader.readGJObject(geoModule.countries);
      // @todo if opacity is on layer, solid color should be too
      layer = geoModule.featureLayer({
        "opacity": 1,
        "showAttribution": 1,
        "visible": 1
      }, geoModule.compositeGeometryFeature(geoms, [1.0,0.5, 0.0]));

      layer.setName('country-boundaries');
      this.addLayer(layer);
      result = layer.visible();
    }

    return result;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Toggle us state boundaries
   *
   * @returns {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.toggleStateBoundaries = function() {
    // @todo Implement this
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update layers
   */
  ////////////////////////////////////////////////////////////////////////////
  this.update = function() {
    computeZoom();

    // For now update all layers. In the future, we should be
    // able to perform updates based on the layer type
    var layerName = null;
    for (layerName in m_layers) {
      if (m_layers.hasOwnProperty(layerName)) {
        m_layers[layerName].update(m_updateRequest);
      }
    }
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Prepare map for rendering
   */
  ////////////////////////////////////////////////////////////////////////////
  this.predraw = function() {
    var i = 0,
        layerName = 0;

    for (layerName in m_layers) {
      if (m_layers.hasOwnProperty(layerName)) {
        m_layers[layerName].predraw(m_prepareForRenderRequest);
      }
    }

    if (m_featureCollection.getMTime() >
        m_lastPrepareToRenderingTime.getMTime()) {

      // Remove expired features from the renderer
      for (layerName in m_layers) {
        m_renderer.removeActors(
          m_featureCollection.expiredFeatures(layerName));

        // Add new actors (Will do sorting by bin and then material later)
        m_renderer.addActors(
          m_featureCollection.newFeatures(layerName));
      }

      m_featureCollection.resetAll();
      m_lastPrepareToRenderingTime.modified();
    }
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Manually force to render map
   */
  ////////////////////////////////////////////////////////////////////////////
  this.redraw = function() {
    m_that.predraw();
    draw();
    m_that.postdraw();
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Prepare map for rendering
   */
  ////////////////////////////////////////////////////////////////////////////
  this.postdraw = function() {
    // TODO Implement this
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update the map and then request a draw
   */
  ////////////////////////////////////////////////////////////////////////////
  this.updateAndDraw = function() {
    m_that.update();
    m_that.redraw();
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Return current animation timestep
   *
   * @returns {number}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.animationStep = function() {
    return m_animationStep;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update the map and then request a
   */
  ////////////////////////////////////////////////////////////////////////////
  this.animateTimestep = function(currentTime, layers) {
    var i = 0;
    for (; i < layers.length; ++i) {
      layers[i].update(geoModule.updateRequest(currentTime));
      geoModule.geoTransform.transformLayer(m_options.gcs, layers[i]);
    }
    $(m_that).trigger({
      type: geoModule.command.animateEvent,
      currentTime: currentTime,
    });
    this.redraw();
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Animate layers of a map
   */
  ////////////////////////////////////////////////////////////////////////////
  this.animate = function(timeRange, layers) {
    if (!timeRange) {
      console.log('[error] Invalid time range');
      return;
    }

    if (timeRange.length < 2) {
      console.log('[error] Invalid time range. Requires atleast \
        begin and end time');
      return;
    }

    var that = this,
        currentTime = timeRange[0],
        endTime = timeRange[timeRange.length - 1],
        intervalId = null,
        stop = false;

    $(this).on('animation-stop', function () {
      stop = true;
    });

    function frame() {
      if (that.animationStep() < 0) {
        ++currentTime;
      } else {
        currentTime = timeRange[nextAnimationStep()];
      }

      if (currentTime > endTime || that.animationStep() > timeRange.length) {
        clearInterval(intervalId);
        resetAnimationStep();
      }
      else if (stop) {
        clearInterval(intervalId);
      }
      else {

        that.animateTimestep(currentTime, layers);
      }
    }

    // Update every 2 ms. Updating every ms might be too much.
    intervalId = setInterval(frame, 2);
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Pause animation
   */
  ////////////////////////////////////////////////////////////////////////////
  this.pauseAnimation = function() {
    $(this).trigger('animation-stop');
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Stop animation
   */
  ////////////////////////////////////////////////////////////////////////////
  this.stopAnimation = function() {
    $(this).trigger('animation-stop');
    m_animationStep = 0;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Play next animation step and then pause
   */
  ////////////////////////////////////////////////////////////////////////////
  this.stepAnimationForward = function(timeRange, layers) {
    if (m_animationStep >= timeRange.length)
      return

    this.animateTimestep(timeRange[nextAnimationStep()], layers);
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Play previous animation step and then pause
   */
  ////////////////////////////////////////////////////////////////////////////
  this.stepAnimationBackward = function(timeRange, layers) {
    if (m_animationStep <= 0)
      return

    this.animateTimestep(timeRange[prevAnimationStep()], layers);
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Convert display coordinates to map coordinates
   *
   * @returns {'x': number, 'y': number}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.displayToMap = function(winX, winY) {
    var camera = m_renderer.camera(),
        width = m_renderer.width(),
        height = m_renderer.height(),
        fpoint = camera.focalPoint(),
        focusWorldPt = vec4.fromValues(fpoint[0], fpoint[1], fpoint[2], 1.0),
        focusDisplayPt = m_renderer.worldToDisplay(focusWorldPt, camera.viewMatrix(),
                                                    camera.projectionMatrix(),
                                                    width, height),
        displayPt = vec4.fromValues(winX, winY, focusDisplayPt[2], 1.0),
        worldPt = m_renderer.displayToWorld(displayPt,
                                            camera.viewMatrix(),
                                            camera.projectionMatrix(),
                                            width, height),
        // NOTE: the map is using (nearly) normalized web-mercator.
        // The constants below bring it to actual EPSG:3857 units.
        latlon = geoModule.mercator.m2ll(
          geoModule.mercator.deg2rad(worldPt[0]) * geoModule.mercator.r_major,
          geoModule.mercator.deg2rad(worldPt[1]) * geoModule.mercator.r_minor),
        location = {'x': latlon.lon, 'y': latlon.lat};

    return location;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Queries each layer for information at this location.
   *
   * @param location
   */
  ////////////////////////////////////////////////////////////////////////////
  this.queryLocation = function(location) {
    var layer = null,
        srcPrj = new proj4.Proj(m_options.display_gcs),
        dstPrj = new proj4.Proj(m_options.gcs),
        point = new proj4.Point(location.x, location.y);

    proj4.transform(srcPrj, dstPrj, point);

    for (var layerName in m_layers) {
      layer = m_layers[layerName];
      layer.queryLocation(point);
    }
  };

  // Bind events to handlers
  document.onmousedown = m_viewer.handleMouseDown;
  document.onmouseup = m_viewer.handleMouseUp;
  document.onmousemove = m_viewer.handleMouseMove;
  document.oncontextmenu = m_viewer.handleContextMenu;
  HTMLCanvasElement.prototype.relMouseCoords = m_viewer.relMouseCoords;

  // Create map layer
  m_mapLayer = geoModule.openStreetMapLayer();
  m_mapLayer.update(m_updateRequest);
  m_mapLayer.predraw(m_prepareForRenderRequest);
  this.addLayer(m_mapLayer);

  // Check if need to show country boundaries
  if (m_options.country_boundaries === true) {
    this.toggleCountryBoundaries();
  }

  $(m_interactorStyle).on(
    geoModule.command.updateViewZoomEvent, this.updateAndDraw);
  $(m_interactorStyle).on(
    geoModule.command.updateViewPositionEvent, this.updateAndDraw);
  $(this).on(geoModule.command.updateEvent, this.updateAndDraw);

  for (var name in m_layers)
    $(m_layers[name]).on(geoModule.command.queryResultEvent, function(event, queryResult) {
      $(m_that).trigger(event, queryResult);
      return true;
    });


  return this;
};

inherit(geoModule.map, ogs.vgl.object);

/* Local Variables:   */
/* mode: js           */
/* js-indent-level: 2 */
/* End:               */