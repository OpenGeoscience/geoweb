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
// vglVertexAttribute class
//
//////////////////////////////////////////////////////////////////////////////

///---------------------------------------------------------------------------
function vglVertexAttribute()
{
  this.m_name = "";
}

///---------------------------------------------------------------------------
vglVertexAttribute.prototype.bind = function(renderState, key) {
  var geometryData = renderState.m_mapper.geometryData();
  var sourceData = geometryData.sourceData(key);
  var program = renderState.m_material.shaderProgram();

  glVertexAttribPointer(program.attributeLocation(this.m_name),
                        sourceData.attributeNumberOfComponents(key),
                        sourceData->attributeDataType(key),
                        sourceData->normalized(key),
                        sourceData->attributeStride(key),
                        sourceData->attributeOffset(key));

  gl.enableVertexAttribArray(program.attributeLocation(this.m_name));
}
///---------------------------------------------------------------------------
vglVertexAttribute.prototype.undoBind = function(renderState, key) {
  var program = renderState.m_material.shaderProgram();

  gl.enableVertexAttribArray(program.attributeLocation(this.m_name));
}