/**
 * Layer options object specification
 */
geoModule.layerOptions = function() {

  // Check against no use of new()
  if (!(this instanceof geoModule.layerOptions)) {
    return new geoModule.layerOptions();
  }

  this.opacity = 1;
  this.showAttribution = true;
  this.visible = true;

  return this;
};

/**
 * Base class for all layer types ogs.geo.layer represents any object that be
 * rendered on top of the map base. This could include image, points, line, and
 * polygons.
 */
geoModule.layer = function(options) {

  this.events = {
    "opacitychange" : "opacitychange",
    "update" : "update"
  };

  if (!(this instanceof geoModule.layer)) {
    return new geoModule.layer(options);
  }

  ogs.vgl.object.call(this);

  // Member variables
  var m_that = this;
  var m_opacity = options.opacity || 1.0;

  // TODO Write a function for this
  if (m_opacity > 1.0) {
    m_opacity = 1.0;
    console.log("[WARNING] Opacity cannot be greater than 1.0");
  }
  else if (m_opacity < 0.0) {
    console.log("[WARNING] Opacity cannot be less than 1.0");
  }

  var m_showAttribution = options.showAttribution || true;
  var m_visible = options.visible || true;

  /**
   * Return the underlying drawable entity This function should be implemented
   * by the derived classes
   */
  this.actor = function() {
    return null;
  };

  /**
   * Query opacity of the layer (range[0.0, 1.0])
   */
  this.opacity = function() {
    return m_opacity;
  };

  /**
   * Set opacity of the layer in the range of [0.0, 1.0]
   */
  this.setOpacity = function(val) {
    m_opacity = val;
    $(m_that).trigger({
      type : this.events.opacitychange,
      opacity : m_opacity
    });
  };

  /**
   * Virtual function to update the layer *
   */
  this.update = function() {
  };

  /**
   * Virtual slot to handle opacity change Concrete class should implement this
   * method.
   */
  this.updateLayerOpacity = function(event) {
  };

  return this;
};

inherit(geoModule.layer, ogs.vgl.object);

// ////////////////////////////////////////////////////////////////////////////
//
// featureLayer class
//
// ////////////////////////////////////////////////////////////////////////////

/**
 * Layer to draw points, lines, and polygons on the map The polydata layer
 * provide mechanisms to create and draw geometrical shapes such as points,
 * lines, and polygons.
 */
geoModule.featureLayer = function(options, feature) {

  if (!(this instanceof geoModule.featureLayer)) {
    return new geoModule.featureLayer(options, feature);
  }
  geoModule.layer.call(this, options);

  /** @priave */
  var m_that = this;
  var m_actor = feature;

  /**
   * Return the underlying drawable entity This function should be implemented
   * by the derived classes
   */
  this.actor = function() {
    return m_actor;
  };

  /**
   * Set feature (points, lines, or polygons)
   */
  this.setFeature = function(feature) {
    m_actor = feature;
  };

  /**
   * Slot to handle opacity change
   */
  this.updateLayerOpacity = function(event) {
    var mat = m_actor.material();
    var opacityUniform = mat.shaderProgram().uniform('opacity');

    if (opacityUniform != null) {
      opacityUniform.set(event.opacity);
      $(m_that).trigger(this.events.update);
    }
  };

  $(m_that).on(this.events.opacitychange, m_that.updateLayerOpacity);

  return this;
};

inherit(geoModule.featureLayer, geoModule.layer);
