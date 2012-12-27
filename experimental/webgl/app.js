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
    
    initShaders();
    
    initBuffers();
    
    initTextures();
    
    setInterval(drawScene, 15);
  }
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

  perspectiveMatrix = makePerspective(45, 640.0/480.0, 0.1, 1000.0);

  loadIdentity();
  mvTranslate([-0.0, 0.0, -400.0]);

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
  worldImage.src = "land_shallow_topo_2048.png";
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
  gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()));

  var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));
}