var camera;
var leftMouseButtonDown = false;
var rightMouseButtonDown = false;
var mouseLastPos = {};

// Disable console log
console.log = function() {}

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
	var canvas = document.getElementById("glcanvas");
	 
	// Initialize the GL context
  initWebGL(canvas);      

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
  
  camera = new vesCamera();
  camera.setPosition(0.0, 0.0, 400.0);
  camera.setFocalPoint(0.0, 0.0, 0.0);  
}

//----------------------------------------------------------------------------
function initWebGL(canvas) 
{
  // Initialize the global variable gl to null.
  gl = null;
   
  try 
  {
    // Try to grab the standard context. If it fails, fallback to experimental.
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  }
  catch(e) {}
   
  // If we don't have a GL context, give up now
  if (!gl) 
  {
    alert("Unable to initialize WebGL. Your browser may not support it.");
  }
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
}

//----------------------------------------------------------------------------
function initBuffers()
{
  squareVerticesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
   
  var vertices = 
  [
    180.0,  90.0,  0.0,
    -180.0, 90.0,  0.0,
    180.0,  -90.0, 0.0,
    -180.0, -90.0, 0.0
  ];
   
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);  
  
  squareVerticesTextureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesTextureCoordBuffer);
   
  var textureCoordinates = [    
    1.0,  1.0,
    0.0,  1.0,
    1.0,  0.0,
    0.0,  0.0    
  ];
   
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);
}

//----------------------------------------------------------------------------
function drawScene() 
{
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  perspectiveMatrix = camera.projectionMatrix(1680.0/1050.0, 0.1, 1000.0);

  loadIdentity();  

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
  gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
  
  // Set the texture coordinates attribute for the vertices.  
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesTextureCoordBuffer);
  gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
  
  // Specify the texture to map onto the faces.  
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, worldTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);
  
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
