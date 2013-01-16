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
// vglShader class
//
//////////////////////////////////////////////////////////////////////////////

function vglShader(type) {
  vglObject.call(this);

  this.m_shaderHandle = 0;
  this.m_shaderType =  type;
  this.m_shaderSource = "";
  this.m_fileName = "";
}

inherit(vglShader, vglObject);

///---------------------------------------------------------------------------
vglShader.prototype.shaderHandle = function() {
}

///---------------------------------------------------------------------------
vglShader.prototype.shaderType = function() {
  return this.m_shaderType;
}

///---------------------------------------------------------------------------
vglShader.prototype.fileName = function() {
  return this.m_fileName;
}
///---------------------------------------------------------------------------
vglShader.prototype.setFileName = function(fileName) {
  this.m_fileName = fileName;
}

///---------------------------------------------------------------------------
vglShader.prototype.shaderSource = function() {
  return this.m_shaderSource;
}
///---------------------------------------------------------------------------
vglShader.prototype.setShaderSource = function(source) {
  this.m_shaderSource = source;

  this.setModified(true);
}

///---------------------------------------------------------------------------
vglShader.prototype.compile = function() {

  if (this.modified() === false) {
    return null;
  }

  gl.deleteShader(this.m_shaderHandle);
  this.m_shaderHandle = gl.createShader(this.m_type);
  gl.shaderSource(this.m_shaderHandle, this.m_shaderSource);
  gl.compileShader(this.m_shaderHandle);

  // See if it compiled successfully
  if (!gl.getShaderParameter(this.m_shaderHandle, gl.COMPILE_STATUS)) {
    console.log("[ERROR] An error occurred compiling the shaders: " +
                gl.getShaderInfoLog(this.m_shaderHandle));
    gl.deleteShader(this.m_shaderHandle);
    return null;
  }

  return this.m_shaderHandle;
}

///---------------------------------------------------------------------------
vglShader.prototype.attachShader = function(programHandle) {
  gl.attachShader(programHandle, this.m_shaderHandle);
}
