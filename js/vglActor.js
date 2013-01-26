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
/// \class vglActor
/// \ingroup vgl
/// \brief Transform node that contains a drawable entity
///
/// vglActor is a placeholder transform node that contains a drawable entity.
/// One actor can contain only one drawable entity (mapper).
/// A mapper however can be set to multiple actors.
/// \see vglTransformNode vglMapper

//////////////////////////////////////////////////////////////////////////////
//
// vglActor class
//
//////////////////////////////////////////////////////////////////////////////

function vglActor() {
  vglNode.call(this);
  this.m_center = new Array(3);
  this.m_rotation = new Array(4);
  this.m_scale = new Array(3);
  this.m_translation = new Array(3);
  this.m_referenceFrame = 0;

  this.m_mapper = 0;
}

inherit(vglActor, vglNode);

/// Get center of transformations
//----------------------------------------------------------------------------
vglActor.prototype.center  = function() {
  return m_center;
}
/// Set center of transformations
//----------------------------------------------------------------------------
vglActor.prototype.setCenter = function(x, y, z) {
  this.m_center[0] = x;
  this.m_center[1] = y;
  this.m_center[2] = z;
}

/// Get rotation as described by angle (in radians) and axis
/// ( axis(x, y, z), angle )
///---------------------------------------------------------------------------
vglActor.prototype.rotation = function() {
}
/// Set rotation as described by angle (in radians) and axis
/// ( axis(x, y, z), angle )
//----------------------------------------------------------------------------
vglActor.prototype.setRotation = function(angle, x, y, z) {
}

/// Get scale in x, y and z directions
//----------------------------------------------------------------------------
vglActor.prototype.scale = function() {
}
/// Set scale in x, y and z directions
//----------------------------------------------------------------------------
vglActor.prototype.setScale = function(x, y, z) {
}

/// Get translation in x, y and z directions
//----------------------------------------------------------------------------
vglActor.prototype.translation = function() {
}
/// Set translation in x, y and z directions
//----------------------------------------------------------------------------
vglActor.prototype.setTranslation = function(x, y, z) {
}

/// Get reference frame for the transformations. Possible values
/// are Absolute and Relative.
//----------------------------------------------------------------------------
vglActor.prototype.referenceFrame = function() {
}
/// Set reference frame for the transformations. Possible values
/// are Absolute and Relative.
//----------------------------------------------------------------------------
vglActor.prototype.setReferenceFrame = function(referenceFrame) {
}

/// Evaluate the transform associated with the vtkActor.
/// Return affine transformation for the actor.
//----------------------------------------------------------------------------
vglActor.prototype.modelViewMatrix = function() {
  var mat = mat4.create();
  mat4.identity(mat);
  return mat;
}

/// \copydoc vesTransformInterace::matrix
//----------------------------------------------------------------------------
vglActor.prototype.matrix = function() {
  return this.modelViewMatrix();
}

/// Get mapper of the actor
/// \sa vglMapper
//----------------------------------------------------------------------------
vglActor.prototype.mapper = function() {
  return this.m_mapper;
}
/// Set mapper for the actor
/// \sa vglMapper
//----------------------------------------------------------------------------
vglActor.prototype.setMapper = function(mapper) {
  this.m_mapper = mapper;
}

/// \copydoc vglNode::accept()
//----------------------------------------------------------------------------
vglActor.prototype.accept = function(visitor) {
  // TODO
}

/// \copydoc vglNode::ascend()
//----------------------------------------------------------------------------
vglActor.prototype.ascend = function(visitor) {
  // TODO
}

/// Compute object space to world space matrix
//----------------------------------------------------------------------------
vglActor.prototype.computeLocalToWorldMatrix = function(matrix, visitor) {
}

/// Compute world space to object space matrix
//----------------------------------------------------------------------------
vglActor.prototype.computeWorldToLocalMatrix = function(matrix, visitor) {
}

/// Compute actor bounds
//----------------------------------------------------------------------------
vglActor.prototype.computeBounds = function() {
}
