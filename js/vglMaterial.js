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
// vglMaterial class
//
//////////////////////////////////////////////////////////////////////////////

///---------------------------------------------------------------------------
function vglMaterial()
{
  this.RenderBin = {
    "Default"     : 0,
    "Opaque"      : 1,
    "Transparent" : 10,
    "Overlay"     : 20
  };

  vglObject.call(this);
  this.shaderProgram = new vglShaderProgram();
  this.m_binNumber = 0;
  this.m_textureAttributes = {};
  this.m_attributres = {};
}

inherit(vglMaterial, vglObject);

///---------------------------------------------------------------------------
vglMaterial.prototype.binNumber = function() {
  return this.m_binNumber;
}
///---------------------------------------------------------------------------
vglMaterial.prototype.setBinNumber = function(binNo) {
  this.m_binNumber = binNo;
  this.setModified();
}

///---------------------------------------------------------------------------
vglMaterial.prototype.exists = function(attr) {
  if (attr.type() === vglMaterialAttribute.Texture) {
    return this.m_textureAttributes.hasOwnProperty(attr);
  } else {
    return this.m_attributres.hasOwnProperty(attr);
  }
}

///---------------------------------------------------------------------------
vglMaterial.prototype.addAttribute = function(attr) {

  if this.exists(attr) {
    return false;
  }

  if (attr.type() === vglMaterialAttribute.Texture) {
    this.m_textureAttributes[attr.textureUnit()] = attr;
    this.setModified(true);
    return true;
  } else {
    // Shader is a very special attribute
    if (attr.type() === vglMaterialAttribute.Shader) {
      this.m_shaderProgram = attr;
    }

    this.m_attributres[attr.type()] = attr;

    return true;
  }

  return false;
}

///---------------------------------------------------------------------------
vglMaterial.prototype.shaderProgram = function() {
  return this.m_shaderProgram;
}

///---------------------------------------------------------------------------
vglMaterial.prototype.render = function(renderState) {
  this.bind(renderState);
}

///---------------------------------------------------------------------------
vglMaterial.prototype.bind = function(renderState) {
  for (var i = 0; i < this.m_attributes.length; ++i) {
    this.m_attributes.bind(renderState);
  }

  for (var i = 0; i < this.m_textureAttributes.length; ++i) {
    this.m_textureAttributes.bind(renderState);
  }
}
///---------------------------------------------------------------------------
vglMaterial.prototype.undoBind = function(renderState) {
  for (var i = 0; i < this.m_attributes.length; ++i) {
    this.m_attributes.undoBind(renderState);
  }

  for (var i = 0; i < this.m_textureAttributes.length; ++i) {
    this.m_textureAttributes.undoBind(renderState);
  }
}

///---------------------------------------------------------------------------
vglMaterial.prototype.bindVertexData = function(renderState, key) {
  for (var i = 0; i < this.m_attributes.length; ++i) {
    this.m_attributes.bindVertexData(renderState);
  }
}
///---------------------------------------------------------------------------
vglMaterial.prototype.undoBindVertexData = function(renderState, key) {
  for (var i = 0; i < this.m_attributes.length; ++i) {
    this.m_attributes.undoBindVertexData(renderState);
  }
}
