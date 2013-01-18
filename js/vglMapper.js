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
/// \class vglMapper
/// \ingroup vgl
/// \brief Mapper contains a geometry data and has the responsibility of rendering
/// the geometry appropriately.
///
/// Actor and mapper works in pair where mapper takes the responsibility of
/// rendering a geometry using OpenGL ES 2.0 API. vglMapper defines
/// a light weight polydata rendering entity that works in conjunction with a
/// vglActor.
///
/// \see vglBoundingObject vglActor vglGeometryData

//////////////////////////////////////////////////////////////////////////////
//
// vglMapper class
//
//////////////////////////////////////////////////////////////////////////////

function vglMapper()
{
  vglBoundingObject.call(this);

  this.m_dirty = true;
  this.m_geomData = 0;
  this.m_buffers = new Array();
  this.m_bufferVertexAttributeMap = {};
}

inherit(vglMapper, vglBoundingObject);

/// Compute bounds of the data
//----------------------------------------------------------------------------
vglMapper.prototype.computeBounds = function()
{
}

/// Return stored geometry data if any
//----------------------------------------------------------------------------
vglMapper.prototype.geometryData = function
{
  return this.m_geomData;
}
/// Set geometry data for the mapper
//----------------------------------------------------------------------------
vglMapper.prototype.setGeometryData = function(geom)
{
  if (this.m_geomData !== geom )
  {
    this.m_geomData = geom;

    // TODO we need
    this.m_dirty = true;
  }

/// Render
//----------------------------------------------------------------------------
vglMapper.prototype.render(renderState)
{
  // Bind material

  // TODO Use renderState
  var noOfPrimitives = geom.numberOfPrimitives();
  for (var j = 0; j < noOfPrimitives; ++j)
  {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[i++]);
    var primitive = geom.primitive(j);
    gl.drawElements(primitive.primitiveType(), primitive.numberOfIndices(),
                    primitive.indicesValueType(),  0);
  }


  // Unbind material
}

///
/// Internal methods
//
///////////////////////////////////////////////////////////////////////////////

/// Delete previously created buffers
//----------------------------------------------------------------------------
vglMapper.prototype.deleteVertexBufferObjects = function()
{
  for (var i = 0 ; i < this.m_buffers.length; ++i)
  {
    gl.deleteBuffer(this.m_buffers[i]);
  }
}

/// Create new buffers
//----------------------------------------------------------------------------
vglMapper.prototype.createVertexBufferObjects = function()
{
  if (this.m_geomData)
  {
    var numberOfSources = geom.numberOfSources();

    for (var i = 0; i < numberOfSources; ++i)
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

      this.m_bufferVertexAttributeMap[i] = ks;
      this.m_buffers[i] = bufferId;
    }

    var numberOfPrimitives = geom.numberOfPrimitives();
    for (var k = 0; k < numberOfPrimitives; ++k)
    {
      var bufferId = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferId);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geom.primitive(k).indices(), gl.STATIC_DRAW);
      this.m_buffers[i++] = bufferId;
    }
  }
}

/// Clear cache related to buffers
//----------------------------------------------------------------------------
vglMapper.prototype.cleanUpDrawObjects = function()
{
  this.m_bufferVertexAttributeMap = {}
  this.m_buffers = [];
}

/// Setup draw objects; Delete old ones and create new ones
//----------------------------------------------------------------------------
vglMapper.prototype.setupDrawObjects = function(renderState)
{
  // Delete buffer objects from past if any.
  this.deleteVertexBufferObjects();

  // Clear any cache related to buffers
  this.cleanUpDrawObjects();

  // Now construct the new ones.
  this.createVertexBufferObjects();

  this.m_dirty = false;
}