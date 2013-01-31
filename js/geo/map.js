///---------------------------------------------------------------------------
geoModule.latlng = function(lat, lng) {
  var m_lat = lat;
  var m_lng = lng;

  return {
    lat : function() {
      return m_lat;
    },
    lng : function() {
      return m_lng;
    }
  };
};

///---------------------------------------------------------------------------
geoModule.mapOptions = function() {
  var m_zoom  = 10;
  var m_center = geoModule.latlng(0.0, 0.0);

  return {
    zoom : function() {
      return m_zoom;
    },
    center : function() {
      return m_center;
    }
  };
};

///---------------------------------------------------------------------------
geoModule.map = function(node, options) {
  initWebGL(node);
  var m_options = options;

  if (!options.center) {
    m_options.m_center = geoModule.latlng(0.0, 0.0);
  } else {
    m_options.m_center = m_options.center;
  }
  if (!options.zoom) {
    m_options.m_zoom = 10;
  } else {
    m_options.m_zoom = m_options.zoom;
  }

  var m_renderer = new vglRenderer();

  ///-------------------------------------------------------------------------
  function initScene() {

    m_renderer.camera().setPosition(m_options.m_center.lat(), m_options.m_center.lng(), 800.0);
    m_renderer.camera().setFocalPoint(m_options.m_center.lat(), m_options.m_center.lng(), 0.0);
  }

  ///-------------------------------------------------------------------------
  function draw(interval) {
    initScene();
    m_renderer.render();
  }

  ///-------------------------------------------------------------------------
  function createDefaultFragmentShader(context) {
    var fragmentShaderSource = [
      'varying highp vec3 vTextureCoord;',
      'uniform sampler2D uSampler;',
      'void main(void) {',
        'gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));',
      '}'
     ].join('\n');

    var shader = new vglShader(gl.FRAGMENT_SHADER);
    shader.setShaderSource(fragmentShaderSource);
    return shader;
  }

  //--------------------------------------------------------------------------
  function createDefaultVertexShader(context) {
    var vertexShaderSource = [
      'attribute vec3 aVertexPosition;',
      'attribute vec3 aTextureCoord;',
      'uniform mat4 modelViewMatrix;',
      'uniform mat4 projectionMatrix;',
      'varying highp vec3 vTextureCoord;',
      'void main(void)',
      '{',
      'gl_Position = projectionMatrix * modelViewMatrix * vec4(aVertexPosition, 1.0);',
      ' vTextureCoord = aTextureCoord;',
      '}'
    ].join('\n');

    var shader = new vglShader(gl.VERTEX_SHADER);
    shader.setShaderSource(vertexShaderSource);
    return shader;
  }

  // TODO use zoom and center options
  var m_baseMap = (function() {
    // TODO Move it somewhere else
    var geom = new vglGeometryData();
    var source = new vglSourceDataP3T3f();

    var triIndices = [ 0,1,2,3 ];

    var v1 = new vglVertexDataP3T3f();
    v1.m_position = new Array(180.0,  90.0,  0.0);
    v1.m_texCoordinate = new Array(1.0, 1.0, 0.0);

    var v2 = new vglVertexDataP3T3f();
    v2.m_position = new Array(-180.0, 90.0,  0.0);
    v2.m_texCoordinate = new Array(0.0, 1.0, 0.0);

    var v3 = new vglVertexDataP3T3f();
    v3.m_position = new Array(180.0,  -90.0, 0.0);
    v3.m_texCoordinate = new Array(1.0, 0.0, 0.0);

    var v4 = new vglVertexDataP3T3f();
    v4.m_position = new Array(-180.0, -90.0, 0.0);
    v4.m_texCoordinate = new Array(0.0, 0.0, 0.0);

    source.pushBack(v1);
    source.pushBack(v2);
    source.pushBack(v3);
    source.pushBack(v4);

    // Create primitives
    var triangleStrip = new vglTriangleStrip();
    triangleStrip.setIndices(triIndices);

    geom.setName("World");
    geom.addSource(source);
    geom.addPrimitive(triangleStrip);

    var mapper = new vglMapper();
    mapper.setGeometryData(geom);

    var mat = new vglMaterial();
    var prog = new vglShaderProgram();
    var vertexShader = createDefaultVertexShader(gl);
    var fragmentShader = createDefaultFragmentShader(gl);
    var posVertAttr = new vglVertexAttribute("aVertexPosition");
    var texCoordVertAttr = new vglVertexAttribute("aTextureCoord");
    var modelViewUniform = new vglModelViewUniform("modelViewMatrix");
    var projectionUniform = new vglProjectionUniform("projectionMatrix");
    var worldTexture = new vglTexture();
    var samplerUniform = new vglUniform(gl.INT, "uSampler");
    samplerUniform.set(0);

    prog.addVertexAttribute(posVertAttr,
      vglVertexAttributeKeys.Position);
    prog.addVertexAttribute(texCoordVertAttr,
      vglVertexAttributeKeys.TextureCoordinate);
    prog.addUniform(modelViewUniform);
    prog.addUniform(projectionUniform);
    prog.addUniform(samplerUniform);
    prog.addShader(fragmentShader);
    prog.addShader(vertexShader);
    mat.addAttribute(prog);

    // Setup texture
    worldImage = new Image();
    worldTexture.setImage(worldImage);

    // TODO Currently hard-coded
    worldImage.src = "./data/land_shallow_topo_2048.png";
    mat.addAttribute(worldTexture);

    var actor = new vglActor();
    actor.setMapper(mapper);
    actor.setMaterial(mat);

    m_renderer.addActor(actor);

    draw();

    return actor;
  })();
};
