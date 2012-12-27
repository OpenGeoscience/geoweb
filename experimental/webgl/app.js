//----------------------------------------------------------------------------
function createDefaultFragmentShader(context)
{
  var fragmentShaderSource = [
   'void main(void) {',
   'gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);',
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
    'uniform mat4 uMVMatrix;',
    'uniform mat4 uPMatrix;',   
    'void main(void)', 
    '{',       
    'gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);',
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
}

//----------------------------------------------------------------------------
function initBuffers()
{
  squareVerticesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
   
  var vertices = 
  [
    1.0,  1.0,  0.0,
    -1.0, 1.0,  0.0,
    1.0,  -1.0, 0.0,
    -1.0, -1.0, 0.0
  ];
   
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);   
}

//----------------------------------------------------------------------------
function drawScene() 
{
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  perspectiveMatrix = makePerspective(45, 640.0/480.0, 0.1, 100.0);

  loadIdentity();
  mvTranslate([-0.0, 0.0, -6.0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
  gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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


