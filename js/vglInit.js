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
//
// Globals
//
//////////////////////////////////////////////////////////////////////////////
gl = 0;


//////////////////////////////////////////////////////////////////////////////
function webGL()
{
  var canvas = document.getElementById("glcanvas");

  // Initialize the GL context
  initWebGL(canvas);
}


//////////////////////////////////////////////////////////////////////////////
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