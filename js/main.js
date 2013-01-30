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
//  gl.bindTexture(gl.TEXTURE_2D, texture);
//  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
//  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
//  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
//  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//  gl.generateMipmap(gl.TEXTURE_2D);
//  gl.bindTexture(gl.TEXTURE_2D, null);
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


  this.END_OF_INPUT = -1;
  this.base64Chars = new Array('A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9','+','/');
  this.base64Str = "";
  this.base64Count = 0;
  this.reverseBase64Chars = new Array();
    for (var i=0; i < this.base64Chars.length; i++) { this.reverseBase64Chars[this.base64Chars[i]] = i; };


//--------------------------------------------------------------------------
  this.camera = function() {
    return this.m_camera;
  }


//--------------------------------------------------------------------------
  this.ntos = function (n) {
      n=n.toString(16);
      if (n.length == 1) n='0'+n;
      n='%'+n;
      return unescape(n);
  }

//--------------------------------------------------------------------------
  this.readReverseBase64 = function () {
        if (!this.base64Str) return this.END_OF_INPUT;
        while (true) {
            if (this.base64Count >= this.base64Str.length) return this.END_OF_INPUT;
            var nextCharacter = this.base64Str.charAt(this.base64Count);
            this.base64Count++;
            if (this.reverseBase64Chars[nextCharacter]) {
                return this.reverseBase64Chars[nextCharacter];
            }
            if (nextCharacter == 'A') return 0;
        }
        return this.END_OF_INPUT;
    }

//--------------------------------------------------------------------------
  this.decode64 = function(str) {
      this.base64Str = str;
      this.base64Count = 0;

      var result = '';
      var inBuffer = new Array(4);
      var done = false;
      while (!done && (inBuffer[0] = this.readReverseBase64()) != this.END_OF_INPUT && (inBuffer[1] = this.readReverseBase64()) != this.END_OF_INPUT) {
          inBuffer[2] = this.readReverseBase64();
          inBuffer[3] = this.readReverseBase64();
          result += this.ntos((((inBuffer[0] << 2) & 0xff)| inBuffer[1] >> 4));
          if (inBuffer[2] != this.END_OF_INPUT) {
              result +=  this.ntos((((inBuffer[1] << 4) & 0xff)| inBuffer[2] >> 2));
              if (inBuffer[3] != this.END_OF_INPUT) {
                  result +=  this.ntos((((inBuffer[2] << 6)  & 0xff) | inBuffer[3]));
              } else {
                  done = true;
              }
          } else {
              done = true;
          }
      }
      return result;
  }

  //--------------------------------------------------------------------------
  this.parseObject = function() {
      console.log("PARSING OBJECT")

      obj.data = this.decode64(obj.coded);

      var geom = new vglGeometryData();
      geom.setName("World");

      var points = new vglSourceDataP3t3f();
      var triangles = new vglTriangles();

      geom.addSource(points);
      geom.addPrimitive(triangles);

      var ss = []; pos = 0;
      for(i=0; i<obj.data.length; i++) ss[i] = obj.data.charCodeAt(i) & 0xff;

      size = (ss[pos++]) + (ss[pos++] << 8) + (ss[pos++] << 16) + (ss[pos++] << 24);
      type = String.fromCharCode(ss[pos++]);
      obj.type = type;
      obj.father = this;

      if (type == 'L'){
          console.log("Lines")
          obj.numberOfPoints = (ss[pos++]) + (ss[pos++] << 8) + (ss[pos++] << 16) + (ss[pos++] << 24);
          console.log(obj.numberOfPoints)
          //Getting Points
          test = new Int8Array(obj.numberOfPoints*4*3); for(i=0; i<obj.numberOfPoints*4*3; i++) test[i] = ss[pos++];
          obj.points = new Float32Array(test.buffer);
          //Generating Normals
          test = new Array(obj.numberOfPoints*3); for(i=0; i<obj.numberOfPoints*3; i++) test[i] = 0.0;
          obj.normals = new Float32Array(test);
          //Getting Colors
          test = []; for(i=0; i<obj.numberOfPoints*4; i++) test[i] = ss[pos++]/255.0;
          obj.colors = new Float32Array(test);

          obj.numberOfIndex = (ss[pos++]) + (ss[pos++] << 8) + (ss[pos++] << 16) + (ss[pos++] << 24);
          console.log(obj.numberOfIndex)

          //Getting Index
          test = new Int8Array(obj.numberOfIndex*2); for(i=0; i<obj.numberOfIndex*2; i++) test[i] = ss[pos++];
          obj.index = new Uint16Array(test.buffer);
          //Getting Matrix
          test = new Int8Array(16*4); for(i=0; i<16*4; i++) test[i] = ss[pos++];
          obj.matrix = new Float32Array(test.buffer);

/*
          //Creating Buffers
          obj.lbuff = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obj.lbuff);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, obj.points, this.gl.STATIC_DRAW); obj.lbuff.itemSize = 3;

          obj.nbuff = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obj.nbuff);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, obj.normals, this.gl.STATIC_DRAW);  obj.nbuff.itemSize = 3;

          obj.cbuff = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obj.cbuff);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, obj.colors, this.gl.STATIC_DRAW);   obj.cbuff.itemSize = 4;

          obj.ibuff = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, obj.ibuff);
          this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, obj.index, this.gl.STREAM_DRAW);

          obj.render = this.renderLine;
*/
      }

      //-=-=-=-=-=[ MESH ]=-=-=-=-=-
      else if (type == 'M'){
          console.log("Surface")
          obj.numberOfVertices = (ss[pos++]) + (ss[pos++] << 8) + (ss[pos++] << 16) + (ss[pos++] << 24);
          console.log(obj.numberOfVertices)
          //Getting Vertices
          test = new Int8Array(obj.numberOfVertices*4*3);
          for(i=0; i<obj.numberOfVertices*4*3; i++) {
              test[i] = ss[pos++];
          }
          obj.vertices = new Float32Array(test.buffer);

          //Getting Normals
          test = new Int8Array(obj.numberOfVertices*4*3); for(i=0; i<obj.numberOfVertices*4*3; i++) test[i] = ss[pos++];
          obj.normals = new Float32Array(test.buffer);

          for(i=0; i<obj.numberOfVertices; i++) {
              var v1 = new vglVertexDataP3T3f();
              v1.m_position = new Array(obj.vertices[i*3+0], obj.vertices[i*3+1], obj.vertices[i*3+2]);
              //v1.m_normal = new Array(obj.normals[i*3+0], obj.normals[i*3+1], obj.normals[i*3+2]);
              v1.m_texCoordinate = new Array(obj.normals[i*3+0], obj.normals[i*3+1], obj.normals[i*3+2]);
              points.pushBack(v1);
          }

          //Getting Colors
          test = []; for(i=0; i<obj.numberOfVertices*4; i++) test[i] = ss[pos++]/255.0;
          obj.colors = new Float32Array(test);

          obj.numberOfIndex = (ss[pos++]) + (ss[pos++] << 8) + (ss[pos++] << 16) + (ss[pos++] << 24);
          //Getting Index
          test = new Int8Array(obj.numberOfIndex*2); for(i=0; i<obj.numberOfIndex*2; i++) test[i] = ss[pos++];
          obj.index = new Uint16Array(test.buffer);
          triangles.setIndices(obj.index);

          //Getting Matrix
          test = new Int8Array(16*4); for(i=0; i<16*4; i++) test[i] = ss[pos++];
          obj.matrix = new Float32Array(test.buffer);
          //Getting TCoord
          obj.tcoord = null;

/*
          //Create Buffers
          obj.vbuff = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obj.vbuff);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, obj.vertices, this.gl.STATIC_DRAW); obj.vbuff.itemSize = 3;

          obj.nbuff = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obj.nbuff);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, obj.normals, this.gl.STATIC_DRAW);  obj.nbuff.itemSize = 3;

          obj.cbuff = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obj.cbuff);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, obj.colors, this.gl.STATIC_DRAW);   obj.cbuff.itemSize = 4;

          obj.ibuff = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, obj.ibuff);
          this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, obj.index, this.gl.STREAM_DRAW);

          obj.render = this.renderMesh;
*/
      }

      // ColorMap Widget
      else if (type == 'C'){
          console.log("colormap")

          obj.numOfColors = size;

          //Getting Position
          test = new Int8Array(2*4); for(i=0; i<2*4; i++) test[i] = ss[pos++];
          obj.position = new Float32Array(test.buffer);

          //Getting Size
          test = new Int8Array(2*4); for(i=0; i<2*4; i++) test[i] = ss[pos++];
          obj.size = new Float32Array(test.buffer);

          //Getting Colors
          obj.colors = [];
          for(c=0; c<obj.numOfColors; c++){
              test = new Int8Array(4); for(i=0; i<4; i++) test[i] = ss[pos++];
              v = new Float32Array(test.buffer);
              xrgb = [v[0], ss[pos++], ss[pos++], ss[pos++]];
              obj.colors[c] = xrgb;
          }

          obj.orientation = ss[pos++];
          obj.numOfLabels = ss[pos++];
          tt = "";
          for(jj=0; jj<(ss.length-pos); jj++) tt = tt + String.fromCharCode(ss[pos+jj]);
          obj.title = tt;

/*
        obj.render = this.renderColorMap;
*/
      }

      // Points
      else if (type == 'P'){
          console.log("POINTS")

          obj.numberOfPoints = (ss[pos++]) + (ss[pos++] << 8) + (ss[pos++] << 16) + (ss[pos++] << 24);
          console.log(obj.numberOfPoints)
          //Getting Points
          test = new Int8Array(obj.numberOfPoints*4*3); for(i=0; i<obj.numberOfPoints*4*3; i++) test[i] = ss[pos++];
          obj.points = new Float32Array(test.buffer);

          //Getting Colors
          test = []; for(i=0; i<obj.numberOfPoints*4; i++) test[i] = ss[pos++]/255.0;
          obj.colors = new Float32Array(test);

          //Getting Matrix //Wendel
          test = new Int8Array(16*4); for(i=0; i<16*4; i++) test[i] = ss[pos++];
          obj.matrix = new Float32Array(test.buffer);
/*

          //Creating Buffers
          obj.pbuff = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obj.pbuff);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, obj.points, this.gl.STATIC_DRAW); obj.pbuff.itemSize = 3;

          obj.cbuff = this.gl.createBuffer(); this.gl.bindBuffer(this.gl.ARRAY_BUFFER, obj.cbuff);
          this.gl.bufferData(this.gl.ARRAY_BUFFER, obj.colors, this.gl.STATIC_DRAW);   obj.cbuff.itemSize = 4;

          obj.render = this.renderPoints;
*/
      }
      return geom;
  }

  //--------------------------------------------------------------------------
  this.createMap = function() {

    var geom = this.parseObject();

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
    worldImage.onload = function() {
      handleTextureLoaded(worldImage, worldTexture);
    }
    worldImage.src = "./data/land_shallow_topo_2048.png";
    mat.addAttribute(worldTexture);

    var actor = new vglActor();
    actor.setMapper(mapper);
    actor.setMaterial(mat);

    return actor;
  }

  //--------------------------------------------------------------------------
  this.createDefaultFragmentShader = function(context) {
    var fragmentShaderSource = [
      'varying highp vec3 vTextureCoord;',
      'uniform sampler2D uSampler;',
      'void main(void) {',
        'gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);',
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
    this.m_renderer.camera().setPosition(0.0, 0.0, 800.0);
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