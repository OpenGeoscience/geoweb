/*========================================================================
  VGL --- VTK WebGL Rendering Toolkit

  Copyright 2013 Kitware, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 ========================================================================*/

// Disable console log
//console.log = function() {}

function cpApp() {
  this.m_leftMouseButtonDown = false;
  this.m_rightMouseButtonDown = false;
  this.m_mouseLastPos = {x : 0, y : 0};
  this.m_renderer = new vglRenderer();
  this.m_camera = this.m_renderer.camera();

  //--------------------------------------------------------------------------
  this.createMap = function() {
    // TODO Move it somewhere else
    var geom = new vglGeometryData();
    var source = new vglSourceDataP3t3f();

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
    var vertexShader = this.createDefaultVertexShader(gl);
    var fragmentShader = this.createDefaultFragmentShader(gl);
    var posVertAttr = new vglVertexAttribute("aVertexPosition");
    var texCoordVertAttr = new vglVertexAttribute("aTextureCoord");
    var modelViewUniform = new vglModelViewUniform("modelViewMatrix");
    var projectionUniform = new vglProjectionUniform("projectionMatrix");

    prog.addVertexAttribute(posVertAttr);
    prog.addVertexAttribute(texCoordVertAttr);
    prog.addUniform(modelViewUniform);
    prog.addUniform(projectionUniform);
    prog.addShader(fragmentShader);
    prog.addShader(vertexShader);
    mat.addAttribute(prog);

    var actor = new vglActor();
    actor.setMapper(mapper);
    actor.setMaterial(mat);

    return actor;
  }

  //--------------------------------------------------------------------------
  this.createDefaultFragmentShader = function(context)
  {
    var fragmentShaderSource = [
     'varying highp vec2 vTextureCoord;',
     'uniform sampler2D uSampler;',
     'void main(void) {',
       'gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);',
     '}'
    ].join('\n');

    var shader = new vglShader(gl.FRAGMENT_SHADER);
    shader.setShaderSource(fragmentShaderSource);
    return shader;
  }

  //--------------------------------------------------------------------------
  this.createDefaultVertexShader = function(context)
  {
    var vertexShaderSource = [
      'attribute vec3 aVertexPosition;',
      'attribute vec2 aTextureCoord;',
      'uniform mat4 modelViewMatrix;',
      'uniform mat4 projectionMatrix;',
      'varying highp vec2 vTextureCoord;',
      'void main(void)',
      '{',
      'gl_Position = vec4(aVertexPosition, 1.0);',
      ' vTextureCoord = aTextureCoord;',
      '}'
    ].join('\n');

    var shader = new vglShader(gl.VERTEX_SHADER);
    shader.setShaderSource(vertexShaderSource);
    return shader;
  }

  //--------------------------------------------------------------------------
  this.relMouseCoords = function(event)
  {
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    var currentElement = this;

    do {
      totalOffsetX += currentElement.offsetLeft;
      totalOffsetY += currentElement.offsetTop;
    } while(currentElement = currentElement.offsetParent)

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;

    return {x:canvasX, y:canvasY}
  }

  //--------------------------------------------------------------------------
  this.handleMouseMove = function(event) {
    var canvas = document.getElementById("glcanvas");
    var outsideCanvas = false;

    coords = canvas.relMouseCoords(event);

    var currentMousePos = {x : 0, y : 0};
    if (coords.x < 0) {
      currentMousePos.x = 0;
      outsideCanvas = true;
    } else {
      currentMousePos.x = coords.x;
    }

    if (coords.y < 0) {
      currentMousePos.y = 0;
      outsideCanvas = true;
    } else {
      currentMousePos.y = coords.y;
    }

    if (outsideCanvas == true) {
      return;
    }

    if (this.m_leftMouseButtonDown) {
      var focalPoint = this.m_camera.focalPoint();
      var focusWorldPt = vec4.createFrom(
        focalPoint[0], focalPoint[1], focalPoint[2], 1);

      var focusDisplayPt = worldToDisplay(focusWorldPt,
        camera.m_viewMatrix, camera.m_projectionMatrix, 1680, 1050);

      var displayPt1 = vec4.createFrom(
        currentMousePos.x, currentMousePos.y, focusDisplayPt[2], 1.0);
      var displayPt2 = vec4.createFrom(
        this.m_mouseLastPos.x, this.m_mouseLastPos.y, focusDisplayPt[2], 1.0);

      var worldPt1 = displayToWorld(displayPt1, camera.m_viewMatrix,
                       camera.m_projectionMatrix, 1680, 1050);
      var worldPt2 = displayToWorld(displayPt2, camera.m_viewMatrix,
          camera.m_projectionMatrix, 1680, 1050);

      dx = worldPt1[0] - worldPt2[0];
      dy = worldPt1[1] - worldPt2[1];

      // Move the scene in the direction of movement of mouse;
      this.m_camera.pan(-dx, -dy);
    }

    if (this.m_rightMouseButtonDown) {
      zTrans = currentMousePos.y - this.m_mouseLastPos.y;
      this.m_camera.zoom(zTrans * 0.5);
    }

    this.m_mouseLastPos.x = currentMousePos.x;
    this.m_mouseLastPos.y = currentMousePos.y;
  }

  //--------------------------------------------------------------------------
  this.handleMouseDown = function(event) {
    var canvas = document.getElementById("glcanvas");

    if (event.button == 0) {
      this.m_leftMouseButtonDown = true;
    }
    if (event.button == 2) {
      this.m_rightMouseButtonDown = true;
    }
    if (event.button == 4)  {
//      middileMouseButtonDown = true;
    }

    coords = canvas.relMouseCoords(event);

    if (coords.x < 0) {
      this.m_mouseLastPos.x = 0;
    } else  {
      this.m_mouseLastPos.x = coords.x;
    }

    if (coords.y < 0) {
      this.m_mouseLastPos.y = 0;
    } else {
      this.m_mouseLastPos.y = coords.y;
    }

    return false;
  }

  ///-------------------------------------------------------------------------
  this.handleMouseUp = function(event) {
    if (event.button == 0) {
      this.m_leftMouseButtonDown = false;
    }
    if (event.button == 2) {
      this.m_rightMouseButtonDown = false;
    }
    if (event.button == 4) {
      middileMouseButtonDown = false;
    }

    return false;
  }

  ///-------------------------------------------------------------------------
  this.start = function() {
    // Initialize the GL context
    webGL();

    // Only continue if WebGL is available and working
    if (gl) {
      this.initScene();
//      document.onmousedown = this.handleMouseDown;
//      document.onmouseup = this.handleMouseUp;
//      document.onmousemove = this.handleMouseMove;
//      document.oncontextmenu = new Function("return false");
      HTMLCanvasElement.prototype.relMouseCoords = this.relMouseCoords;
    } else {
      console.log("[ERROR] Invalid GL context");
    }
  }

  ///-------------------------------------------------------------------------
  this.initScene = function() {
    var map = this.createMap();
    this.m_renderer.addActor(map);
    this.m_renderer.camera().setPosition(0.0, 0.0, 400.0);
    this.m_renderer.camera().setFocalPoint(0.0, 0.0, 0.0);
  }

///-------------------------------------------------------------------------
  this.drawScene = function() {
    this.m_renderer.render();
  }
}

///---------------------------------------------------------------------------
function main() {
  var app = new cpApp();
  app.start();
  app.drawScene();
}