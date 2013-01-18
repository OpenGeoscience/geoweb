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

//////////////////////////////////////////////////////////////////////////////
///
/// Globals
///
//////////////////////////////////////////////////////////////////////////////

var camera;
var leftMouseButtonDown = false;
var rightMouseButtonDown = false;
var mouseLastPos = {};
var buffers = {};
var bufferAttributeMap = {};
var vertexAttributeMap = {};

// Disable console log
//console.log = function() {}

//----------------------------------------------------------------------------
// TODO Move it somewhere else
function createWorldPlane()
{
  var geom = new vglGeometryData();
  var source = new vglSourceDataP3t3f();

  var triIndices =
  [
    0,1,2,3
  ];

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
  return geom;
}

//----------------------------------------------------------------------------
function worldToDisplay(worldPt, viewMatrix, projectionMatrix, width, height)
{
  console.log('worldPt ', worldPt);

  var viewProjectionMatrix = mat4.create();
  mat4.multiply(projectionMatrix, viewMatrix, viewProjectionMatrix);

  // Transform world to clipping coordinates
  var clipPt = vec4.create();
  mat4.multiplyVec4(viewProjectionMatrix, worldPt, clipPt);

  if (clipPt[3] != 0.0)
    {
    clipPt[0] = clipPt[0] / clipPt[3];
    clipPt[1] = clipPt[1] / clipPt[3];
    clipPt[2] = clipPt[2] / clipPt[3];
    clipPt[3] = 1.0;
    }

  var winX = Math.round( ( ( ( clipPt[0]) + 1 ) / 2.0) * width );
  // We calculate -point3D.getY() because the screen Y axis is
  // oriented top->down
  var winY = Math.round((( 1 - clipPt[1] ) / 2.0) *  height );
  var winZ = clipPt[2];
  var winW = clipPt[3];

  console.log('worldToDisplay ', winX, winY, winZ);

  return vec4.createFrom(winX, winY, winZ, winW);
}

//----------------------------------------------------------------------------
function displayToWorld(displayPt, viewMatrix, projectionMatrix, width, height)
{
    console.log('displayPt ', displayPt);

    var x =  ( 2.0 * displayPt[0] / width )  - 1;
    var y = -( 2.0 * displayPt[1] / height ) + 1;
    var z =  displayPt[2];

    var viewProjectionInverse = mat4.create();
    mat4.multiply(projectionMatrix, viewMatrix, viewProjectionInverse);
    mat4.inverse(viewProjectionInverse, viewProjectionInverse);

    var worldPt = vec4.createFrom(x, y, z, 1);
    mat4.multiplyVec4(viewProjectionInverse, worldPt, worldPt);

    if (worldPt[3] != 0.0)
    {
      worldPt[0] = worldPt[0] / worldPt[3];
      worldPt[1] = worldPt[1] / worldPt[3];
      worldPt[2] = worldPt[2] / worldPt[3];
      worldPt[3] = 1.0;
    }

    console.log('displayToWorld ', worldPt);

    return worldPt;
}

//----------------------------------------------------------------------------
function createDefaultFragmentShader(context)
{
  var fragmentShaderSource = [
   'varying highp vec2 vTextureCoord;',
   'uniform sampler2D uSampler;',
   'void main(void) {',
     'gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));',
   '}'
  ].join('\n');

  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragmentShaderSource);
  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
      return null;
  }

  return shader;
}

//----------------------------------------------------------------------------
function createDefaultVertexShader(context)
{
  var vertexShaderSource = [
    'attribute vec3 aVertexPosition;',
    'attribute vec2 aTextureCoord;',
    'uniform mat4 uMVMatrix;',
    'uniform mat4 uPMatrix;',
    'varying highp vec2 vTextureCoord;',
    'void main(void)',
    '{',
    'gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);',
    ' vTextureCoord = aTextureCoord;',
    '}'
  ].join('\n');

    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderSource);
    gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
      return null;
  }

  return shader;
}

//----------------------------------------------------------------------------
function relMouseCoords(event)
{
  var totalOffsetX = 0;
  var totalOffsetY = 0;
  var canvasX = 0;
  var canvasY = 0;
  var currentElement = this;

  do
  {
    totalOffsetX += currentElement.offsetLeft;
    totalOffsetY += currentElement.offsetTop;
  }
  while(currentElement = currentElement.offsetParent)

  canvasX = event.pageX - totalOffsetX;
  canvasY = event.pageY - totalOffsetY;

  return {x:canvasX, y:canvasY}
}
HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

//----------------------------------------------------------------------------
function handleMouseMove(event)
{
  var canvas = document.getElementById("glcanvas");
  var outsideCanvas = false;

  coords = canvas.relMouseCoords(event);

  currentMousePos = {};
  if (coords.x < 0)
  {
    currentMousePos.x = 0;
    outsideCanvas = true;
  }
  else
  {
    currentMousePos.x = coords.x;
  }

  if (coords.y < 0)
  {
    currentMousePos.y = 0;
    outsideCanvas = true;
  }
  else
  {
    currentMousePos.y = coords.y;
  }

  if (outsideCanvas == true)
  {
    return;
  }

  if (leftMouseButtonDown)
  {
    var focalPoint = camera.m_focalPoint;
    var focusWorldPt = vec4.createFrom(focalPoint[0], focalPoint[1], focalPoint[2], 1);
    var focusDisplayPt = worldToDisplay(focusWorldPt, camera.m_viewMatrix,
                           camera.m_projectionMatrix, 1680, 1050);

    var displayPt1 = vec4.createFrom(currentMousePos.x, currentMousePos.y, focusDisplayPt[2], 1.0);
    var displayPt2 = vec4.createFrom(mouseLastPos.x, mouseLastPos.y, focusDisplayPt[2], 1.0);

    var worldPt1 = displayToWorld(displayPt1, camera.m_viewMatrix,
                     camera.m_projectionMatrix, 1680, 1050);
    var worldPt2 = displayToWorld(displayPt2, camera.m_viewMatrix,
        camera.m_projectionMatrix, 1680, 1050);

    dx = worldPt1[0] - worldPt2[0];
    dy = worldPt1[1] - worldPt2[1];

    // Move the scnee in the direction of movement of mouse;
    camera.pan(-dx, -dy);
  }

  if (rightMouseButtonDown)
  {
    zTrans = currentMousePos.y - mouseLastPos.y;
    camera.zoom(zTrans * 0.5);
  }

  mouseLastPos.x = currentMousePos.x;
  mouseLastPos.y = currentMousePos.y;
}

//----------------------------------------------------------------------------
function handleMouseDown(event)
{
  var canvas = document.getElementById("glcanvas");

  if (event.button == 0)
  {
    leftMouseButtonDown = true;
  }
  if (event.button == 2)
  {
    rightMouseButtonDown = true;
  }
  if (event.button == 4)
  {
    middileMouseButtonDown = true;
  }

  coords = canvas.relMouseCoords(event);

  if (coords.x < 0)
  {
    mouseLastPos.x = 0;
  }
  else
  {
    mouseLastPos.x = coords.x;
  }

  if (coords.y < 0)
  {
    mouseLastPos.y = 0;
  }
  else
  {
    mouseLastPos.y = coords.y;
  }

  return false;
}

//----------------------------------------------------------------------------
function handleMouseUp(event)
{
  if (event.button == 0)
  {
    leftMouseButtonDown = false;
  }
  if (event.button == 2)
  {
    rightMouseButtonDown = false;
  }
  if (event.button == 4)
  {
    middileMouseButtonDown = false;
  }

  return false;
}

//----------------------------------------------------------------------------
function start()
{
	// Initialize the GL context
	webGL();

  // Only continue if WebGL is available and working
  if (gl)
  {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set clear color to black, fully opaque
    gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
    gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);      // Clear the color as well as the depth buffer.

    initScene();

    document.onmousedown = handleMouseDown;
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;
    document.oncontextmenu=new Function("return false");

    setInterval(drawScene, 15);
  }
}

//----------------------------------------------------------------------------
function initScene()
{
  initShaders();

  initBuffers();

  initTextures();

  camera = new vglCamera();
  camera.setPosition(0.0, 0.0, 400.0);
  camera.setFocalPoint(0.0, 0.0, 0.0);
}

//----------------------------------------------------------------------------
function initShaders()
{
  var fragmentShader = createDefaultVertexShader(gl);
  var vertexShader = createDefaultFragmentShader(gl);

  // Create the shader program
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
  {
    alert("Unable to initialize the shader program.");
  }

  gl.useProgram(shaderProgram);

  vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(vertexPositionAttribute);

  textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
  gl.enableVertexAttribArray(textureCoordAttribute);

  vertexAttributeMap[vglVertexAttributeKeys.Position] = vertexPositionAttribute;
  vertexAttributeMap[vglVertexAttributeKeys.TextureCoordinate] = textureCoordAttribute;
}

//----------------------------------------------------------------------------
function initBuffers()
{
  geom = this.createWorldPlane();
  var numberOfSources = geom.numberOfSources();

  var i = 0;
  for (; i < numberOfSources; ++i)
  {
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, geom.source(i).data(), gl.STATIC_DRAW);

    keys = geom.source(i).keys();
    ks = [];
    for (var j = 0; j < keys.length; ++j)
    {
      ks.push(keys[j]);
    }

    bufferAttributeMap[i] = ks;
    buffers[i] = bufferId;
  }

  var numberOfPrimitives = geom.numberOfPrimitives();
  for (var k = 0; k < numberOfPrimitives; ++k)
  {
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geom.primitive(k).indices(), gl.STATIC_DRAW);
    buffers[i++] = bufferId;
  }
}

//----------------------------------------------------------------------------
function drawScene()
{
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  perspectiveMatrix = camera.projectionMatrix(1680.0/1050.0, 0.1, 1000.0);

  loadIdentity();

  var i = 0;
  for (var bufferId in bufferAttributeMap)
  {
    if (bufferAttributeMap.hasOwnProperty(bufferId))
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers[i]);

      for (var j = 0; j < bufferAttributeMap[i].length; ++j)
      {
        // TODO Fix this
        var key = bufferAttributeMap[i][j];

        gl.vertexAttribPointer(vertexAttributeMap[key],
            geom.source(i).attributeNumberOfComponents(key),
            geom.source(i).attributeDataType(key),
            geom.source(i).isAttributeNormalized(key),
            geom.source(i).attributeStride(key),
            geom.source(i).attributeOffset(key));
      }
    }
    ++i;
  }

  // Specify the texture to map onto the faces.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, worldTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

  setMatrixUniforms();

  // TODO Fix this
  var noOfPrimitives = geom.numberOfPrimitives();
  for (var j = 0; j < noOfPrimitives; ++j)
  {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[i++]);
    var primitive = geom.primitive(j);
    gl.drawElements(primitive.primitiveType(), primitive.numberOfIndices(),
                    primitive.indicesValueType(),  0);
  }
}

//----------------------------------------------------------------------------
function initTextures()
{
  worldTexture = gl.createTexture();
  worldImage = new Image();
  worldImage.onload = function() { handleTextureLoaded(worldImage, worldTexture); }
  worldImage.src = "./data/land_shallow_topo_2048.png";
}

//----------------------------------------------------------------------------
function handleTextureLoaded(image, texture)
{
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

//Utility functions
//----------------------------------------------------------------------------
function loadIdentity()
{
  mvMatrix = Matrix.I(4);
}

//----------------------------------------------------------------------------
function multMatrix(m)
{
  mvMatrix = mvMatrix.x(m);
}

//----------------------------------------------------------------------------
function mvTranslate(v)
{
  multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
}

//----------------------------------------------------------------------------
function setMatrixUniforms()
{
  var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  gl.uniformMatrix4fv(pUniform, false, perspectiveMatrix);

  var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  gl.uniformMatrix4fv(mvUniform, false, camera.viewMatrix());
}
