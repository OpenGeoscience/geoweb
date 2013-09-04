//////////////////////////////////////////////////////////////////////////////
/**
 * @module ogs.geo
 */

/*jslint devel: true, forin: true, newcap: true, plusplus: true*/
/*jslint white: true, indent: 2*/

/*global geoModule, ogs, inherit, $, HTMLCanvasElement, Image*/
/*global vglModule, document*/
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
/**
 * Create a new instance of class featureLayer
 *
 * @class
 * @dec Layer to draw points, lines, and polygons on the map The polydata layer
 *      provide mechanisms to create and draw geometrical shapes such as points,
 *      lines, and polygons.
 * @returns {geoModule.featureLayer}
 */
//////////////////////////////////////////////////////////////////////////////
geoModule.featureLayer = function(options, feature) {
  "use strict";
  if (!(this instanceof geoModule.featureLayer)) {
    return new geoModule.featureLayer(options, feature);
  }
  geoModule.layer.call(this, options);

  /** @private */
  var m_that = this,
      m_time = null,
      m_features = [],
      m_newFeatures = [],
      m_expiredFeatures = [],
      m_predrawTime = ogs.vgl.timestamp(),
      m_updateTime = ogs.vgl.timestamp(),
      m_legend = null,
      m_visible = true;

  if (feature) {
    m_newFeatures.push(feature);
    m_features.push(feature);
  }
  m_predrawTime.modified();
  m_updateTime.modified();

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Get current time of the layer.
   *
   * This should be implemented by the derived class
   */
  ////////////////////////////////////////////////////////////////////////////
  this.time = function() {
     return m_time;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Return the underlying drawable entity.
   * @returns {Array}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.features = function() {
    return m_features;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Set feature.
   *
   * @param {Array} Array of feature
   * @returns {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.setFeatures = function(features) {
    if (features.length > 0) {
      m_newFeatures = features.slice(0);
      m_features = features.slice(0);
      this.modified();
      m_updateTime. modified();
      return true;
    }
    return false;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Return array that holds expired features for this layer
   *
   * This method is mostly should be used by the derived class.
   *
   * @returns {Array}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.expiredFeatures = function() {
    return m_expiredFeatures;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Return array that holds new features for this layer
   *
   * This method is mostly should be used by the derived class.
   *
   * @returns {Array}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.newFeatures = function() {
    return m_newFeatures;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Virtual function that inform if the layer has a legend
   */
  ////////////////////////////////////////////////////////////////////////////
  this.hasLegend = function() {
    if (!this.dataSource()) {
      return false;
    } else {
      return true;
    }
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Create legend for this layer
   */
  ////////////////////////////////////////////////////////////////////////////
  this.createLegend = function() {
    if (m_legend) {
      console.log('[info] Legend already exists for this layer')
      return;
    }

    if (!this.dataSource()) {
      return;
    }

    // Assuming that first variable is the scalar
    var varnames = this.dataSource().variableNames(),
        lut = this.lookupTable();

    if (varnames.length > 0) {
      // Create new lookup table if none exist
      if (!lut) {
        lut = vglModule.lookupTable();
        this.setLookupTable(lut);
      }
      lut.setRange(this.dataSource().getScalarRange(varnames[0]));
      m_legend = vglModule.utils.createColorLegend(
        varnames[0], lut, this.legendOrigin(), this.legendWidth(),
        this.legendHeight(), 10, 0);
      m_newFeatures = m_newFeatures.concat(m_legend);
    }
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update legend because parameters are changed
   */
  ////////////////////////////////////////////////////////////////////////////
  this.updateLegend = function() {
    // For now just delete the last one and create on from scratch
    var i,
        index;
    if (m_legend && m_legend.length > 0) {
      m_expiredFeatures = m_expiredFeatures.concat(m_legend);

      // Also remove it from new features if exists
      for (i = 0; i < m_legend.length; ++i) {
        index = m_newFeatures.indexOf(m_legend[i]);
        if (index != -1) {
          m_newFeatures.splice(index, 1);
        }
      }
    }
    m_legend = null;
    this.createLegend();
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update layer to a particular time
   */
  ////////////////////////////////////////////////////////////////////////////
  this.update = function(request) {
    if (!this.dataSource()) {
      console.log('[info] No valid data source found.');
      return;
    }

    var i = 0,
        time = request.time(),
        data = null,
        varnames = null,
        geomFeature = null,
        lut = this.lookupTable();

    if (!time) {
      console.log('[info] Timestamp not provided. Using time from previous update.');
      // Use previous time
      time = m_time;
    } else {
      m_time = time;
    }

    data = this.dataSource().getData(time);
    if (!data) {
      return;
    }

    // Clear our existing features
    if (m_expiredFeatures.length > 0) {
      m_expiredFeatures = m_expiredFeatures.concat(m_newFeatures.slice(0));
    } else {
      m_expiredFeatures = m_newFeatures.slice(0);
    }

    m_newFeatures.length = 0;

    if (m_legend && m_legend.length > 0) {
      m_newFeatures = m_newFeatures.concat(m_legend);
    }

    // Create legend if not created earlier
    if (!m_legend) {
      this.createLegend();
    }

    for(i = 0; i < data.length; ++i) {
      switch(data[i].type()) {
        case vglModule.data.geometry:
          geomFeature = geoModule.geometryFeature(data[i]);
          geomFeature.material().setBinNumber(this.binNumber());
          geomFeature.setLookupTable(lut);
          m_newFeatures.push(geomFeature);
          break;
        case vglModule.data.raster:
          break;
        default:
          console.log('[warning] Data type not handled', data.type());
      }
    }

    m_features = m_newFeatures.slice(0);

    if (data.length > 0) {
      m_updateTime. modified();
      this.setOpacity(this.opacity());
    }
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Prepare layer for rendering
   */
  ////////////////////////////////////////////////////////////////////////////
  this.predraw = function(request) {
    if (m_predrawTime.getMTime() > m_updateTime.getMTime()) {
      return;
    }

    var featureCollection = request.featureCollection();
    featureCollection.setNewFeatures(this.id(), m_newFeatures);
    featureCollection.setExpiredFeatures(this.id(), m_expiredFeatures);

    m_expiredFeatures.length = 0;

    m_predrawTime.modified();
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update opacity for rendering
   */
  ////////////////////////////////////////////////////////////////////////////
  this.updateLayerOpacity = function(opacity) {
    if (!m_features) {
      return;
    }

    var i = null,
        j = null,
        mat = null,
        skipFeature = false,
        opacityUniform = null;

    for (i = 0; i < m_features.length; ++i) {
      skipFeature = false;
      if (m_legend && m_legend.length) {
        for (j = 0; j < m_legend.length; ++j) {
          if (m_features[i] === m_legend[j]) {
            skipFeature = true;
            break;
          }
        }

        if (skipFeature) {
          continue;
        }

        mat = m_features[i].material();
        opacityUniform = mat.shaderProgram().uniform('opacity');
        if (opacityUniform !== null) {
          opacityUniform.set(opacity);
          $(m_that).trigger(geoModule.command.updateLayerOpacityEvent);
        }
      }
    }
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Update color mapping for the layer for a particular variable.
   * This should be called when lookup table or any other parameters
   * that could affect color mappings changes.
   */
    ////////////////////////////////////////////////////////////////////////////
  this.updateColorMapping = function(varname) {
    var i = null,
        lut = this.lookupTable(varname);

    lut.setRange(this.dataSource().getScalarRange(varname));
    for (i = 0; i < m_features.length; ++i) {
      m_features.setLookupTable(lut);
    }
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Get if layer is visible.
   *
   * @returns {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.visible = function() {
    return m_visible;
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Set layer visible true or false. Set the visability of the features in
   * this layer.
   *
   * @returns {Boolean}
   */
  ////////////////////////////////////////////////////////////////////////////
  this.setVisible = function(flag) {
    m_visible = flag

    $.each(m_features, function(i, feature){
      feature.setVisible(flag)
    });
  };

  ////////////////////////////////////////////////////////////////////////////
  /**
   * Queries the scalar value closest to the location
   */
  ////////////////////////////////////////////////////////////////////////////
  this.queryLocation = function(location) {
    var attrScalar = vglModule.vertexAttributeKeys.Scalar,
        features = this.features(),
        mapper, geomData, p, prim, idx, indices, ia, ib, ic, va, vb, vc,
        point, isLeftTurn, triArea, totalArea, alpha, beta, gamma, sa,
        sb, sc, result;

    for (var fi in features) {
      mapper = features[fi].mapper();
      geomData = mapper.geometryData();

      for (p = 0; p < geomData.numberOfPrimitives(); ++p) {
        prim = geomData.primitive(p);
        if (prim.primitiveType() == gl.TRIANGLES) {
          if (prim.indicesPerPrimitive() != 3)
            console.log("[warning] Triangles should have 3 vertices");

          for (idx = 0; idx < prim.numberOfIndices(); idx += 3) {
            indices = prim.indices();
            ia = indices[idx+0];
            ib = indices[idx+1];
            ic = indices[idx+2];
            va = geomData.getPosition(ia);
            vb = geomData.getPosition(ib);
            vc = geomData.getPosition(ic);


            ///  TODO: this assume triangles in a plane z=0.
            /// Otherwise we would need full-fledged geometric intersection tests.
            ///
            point = vec3.create();
            point[0] = location.x;
            point[1] = location.y;
            point[2] = 0;

            isLeftTurn = function(a, b, c) {
              return (b[0]-a[0])*(c[1]-a[1]) - (c[0]-a[0])*(b[1]-a[1]) >= 0;
            };

            /// NOTE:
            /// Doing all by hand because gl-matrix breaks API depending on version.
            /// e.g. destination argument can be either first or last.
            var cross = function(a, b) {
              return [a[1]*b[2] - a[2]*b[1],
                      a[2]*b[0] - a[0]*b[2],
                      a[0]*b[1] - a[1]*b[0]];
            };

            triArea = function(a, b, c) {
              var ab = [b[0]-a[0], b[1]-a[1], b[2]-a[2]],
                  ac = [c[0]-a[0], c[1]-a[1], c[2]-a[2]],
                  r = cross(ab, ac);

              // NOTE: actual area is half of this
              return Math.sqrt(r[0]*r[0] + r[1]*r[1] + r[2]*r[2]);
            };

            totalArea = triArea(va, vb, vc);
            if (totalArea == 0) {
              //console.log("degenerated triangle");
              continue;
            };

            // this is data that is going down the WebGL pipeline, it better be CCW
            if (isLeftTurn(va, vb, point) && isLeftTurn(vb, vc, point) && isLeftTurn(vc, va, point)) {
              // now compute barycentric coordinates
              alpha = triArea(point, vb, vc)/ totalArea;
              beta  = triArea(point, vc, va)/ totalArea;
              gamma = triArea(point, va, vb)/ totalArea;

              sa = geomData.getScalar(ia);
              sb = geomData.getScalar(ib);
              sc = geomData.getScalar(ic);
              result = {
                layer : this,
                data : {
                  "feature" : fi ,
                  "value" : alpha*sa + beta*sb + gamma*sc
                }
              };
              $(this).trigger(geoModule.command.queryResultEvent, result);
              return; // should we continue checking?
            }
          }
        }
        else if (prim.primitiveType() == gl.TRIANGLE_STRIP) {
          console.log("TRIANGLE_STRIP: " + prim.numberOfIndices() );
          // TODO: how to make sense of this? triangleStrip says it has 3 indices per primitive
        }
      }
    }
  }
  return this;
};

inherit(geoModule.featureLayer, geoModule.layer);