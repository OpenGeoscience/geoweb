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

//--------------------------------------------------------------------------
this.relMouseCoords = function(event) {
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

  var coords = canvas.relMouseCoords(event);

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
    var focalPoint = app.camera().focalPoint();
    var focusWorldPt = vec4.createFrom(
      focalPoint[0], focalPoint[1], focalPoint[2], 1);

    var focusDisplayPt = worldToDisplay(focusWorldPt,
      app.camera().m_viewMatrix, app.camera().m_projectionMatrix, 1680, 1050);

    var displayPt1 = vec4.createFrom(
      currentMousePos.x, currentMousePos.y, focusDisplayPt[2], 1.0);
    var displayPt2 = vec4.createFrom(
      app.m_mouseLastPos.x, app.m_mouseLastPos.y, focusDisplayPt[2], 1.0);

    var worldPt1 = displayToWorld(displayPt1, app.camera().m_viewMatrix,
      app.camera().m_projectionMatrix, 1680, 1050);
    var worldPt2 = displayToWorld(displayPt2, app.camera().m_viewMatrix,
      app.camera().m_projectionMatrix, 1680, 1050);

    dx = worldPt1[0] - worldPt2[0];
    dy = worldPt1[1] - worldPt2[1];

    // Move the scene in the direction of movement of mouse;
    app.camera().pan(-dx, -dy);
  }

  if (this.m_rightMouseButtonDown) {
    zTrans = currentMousePos.y - app.m_mouseLastPos.y;
    app.camera().zoom(zTrans * 0.5);
  }

  app.m_mouseLastPos.x = currentMousePos.x;
  app.m_mouseLastPos.y = currentMousePos.y;
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
    app.m_mouseLastPos.x = coords.x;
  }

  if (coords.y < 0) {
    app.m_mouseLastPos.y = 0;
  } else {
    app.m_mouseLastPos.y = coords.y;
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

///---------------------------------------------------------------------------
function drawScene() {
  app.drawScene();
}

//--------------------------------------------------------------------------
function handleTextureLoaded(image, texture) {
  texture.setImage(image);
}

//////////////////////////////////////////////////////////////////////////////
///
/// Application class
///
//////////////////////////////////////////////////////////////////////////////

///---------------------------------------------------------------------------
function cpApp() {
  this.m_leftMouseButtonDown = false;
  this.m_rightMouseButtonDown = false;
  this.m_mouseLastPos = {x : 0, y : 0};
  this.m_renderer = new vglRenderer();
  this.m_camera = this.m_renderer.camera();

//--------------------------------------------------------------------------
  this.camera = function() {
    return this.m_camera;
  }

  //--------------------------------------------------------------------------
  this.createMap = function() {
    var geom = new vglVTKUnpack().parseObject(sphereString);

    var mapper = new vglMapper();
    mapper.setGeometryData(geom);

    var mat = new vglMaterial();
    var prog = new vglShaderProgram();

    var posVertAttr = new vglVertexAttribute("aVertexPosition");
    prog.addVertexAttribute(posVertAttr, vglVertexAttributeKeys.Position);
    var posNormAttr = new vglVertexAttribute("aVertexNormal");
    prog.addVertexAttribute(posNormAttr, vglVertexAttributeKeys.Normal);

    var modelViewUniform = new vglModelViewUniform("modelViewMatrix");
    prog.addUniform(modelViewUniform);

    var projectionUniform = new vglProjectionUniform("projectionMatrix");
    prog.addUniform(projectionUniform);

    var fragmentShader = this.createDefaultFragmentShader(gl);
    prog.addShader(fragmentShader);

    var vertexShader = this.createDefaultVertexShader(gl);
    prog.addShader(vertexShader);

    mat.addAttribute(prog);

    var actor = new vglActor();
    actor.setMapper(mapper);
    actor.setMaterial(mat);

    return actor;
  }

  //--------------------------------------------------------------------------
  this.createDefaultFragmentShader = function(context) {
    var fragmentShaderSource = [
      'precision mediump float;',
      'varying vec3 vNormal;',
      'void main(void) {',
        'gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0) * vec4(vNormal, 1.0);',
      '}'
     ].join('\n');

    var shader = new vglShader(gl.FRAGMENT_SHADER);
    shader.setShaderSource(fragmentShaderSource);
    return shader;
  }

  //--------------------------------------------------------------------------
  this.createDefaultVertexShader = function(context) {
    var vertexShaderSource = [
      'attribute vec3 aVertexPosition;',
      'attribute vec3 aVertexNormal;',
      'uniform mat4 modelViewMatrix;',
      'uniform mat4 projectionMatrix;',
      'varying vec3 vNormal;',
      'void main(void)',
      '{',
      'gl_Position = projectionMatrix * modelViewMatrix * vec4(aVertexPosition, 1.0);',
      'vNormal = aVertexNormal;',
      '}'
    ].join('\n');

    var shader = new vglShader(gl.VERTEX_SHADER);
    shader.setShaderSource(vertexShaderSource);
    return shader;
  }

  ///-------------------------------------------------------------------------
  this.start = function() {
    // Initialize the GL context
    webGL();

    // Only continue if WebGL is available and working
    if (gl) {
      this.initScene();
      document.onmousedown = handleMouseDown;
      document.onmouseup = handleMouseUp;
      document.onmousemove = handleMouseMove;
      document.oncontextmenu = new Function("return false");
      HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;
    } else {
      console.log("[ERROR] Invalid GL context");
    }
  }

  ///-------------------------------------------------------------------------
  this.initScene = function() {
    var map = this.createMap();
    this.m_renderer.addActor(map);
    this.m_renderer.camera().setPosition(0.0, 0.0, 10.0);
    this.m_renderer.camera().setFocalPoint(0.0, 0.0, 0.0);
  }

///-------------------------------------------------------------------------
  this.drawScene = function() {
    this.m_renderer.render();
  }
}

///---------------------------------------------------------------------------
function main() {
  app = new cpApp();
  app.start();
  setInterval(drawScene, 15);
}