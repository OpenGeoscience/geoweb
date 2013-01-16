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
// vglVisitor class
//
//////////////////////////////////////////////////////////////////////////////

var TraversalMode
{
  "TraverseNone"           : 0x1,
  "TraverseParents"        : 0x2,
  "TraverseAllChildren"    : 0x4,
  "TraverseActiveChildren" : 0x8
}

var VisitorType
{
  "ActorVisitor"  : 0x1,
  "UpdateVisitor" : 0x2,
  "EventVisitor"  : 0x4,
  "CullVisitor"   : 0x8
};

function vglVisitor()
{
  vglObject.call(this);
  this.m_visitorType =  VisitorType.UpdateVisitor;
  this.m_traversalMode = TraversalMode.TraverseAllChildren;
  this.m_modelViewMatrixStack = new Array();
  this.m_projectionMatrixStack = new Array();
}

inherit(vglVisitor, vglObject);

///
vglVisitor.prototype.pushModelViewMatrix = function(mat)
{
  this.m_modelViewMatrixStack.push(mat);
}
vglVisitor.prototype.popModelViewMatrix = function()
{
  this.m_modelViewMatrixStack.pop();
}

///
vglVisitor.prototype.pushProjectionMatrix = function(mat)
{
  this.m_projectionMatrixStack.push(mat);
}
vglVisitor.prototype.popProjectionMatrix = function()
{
  this.m_projectionMatrixStack.pop();
}

///
vglVisitor.prototype.modelViewMatrix = function()
{
  mvMat = mat4.create();
  mat4.identity(mvMat);

  for (var i = 0; i < this.m_modelViewMatrixStack.length; ++i)
  {
    mat4.multiply(mvMat, this.m_modelViewMatrixStack[i], mvMat);
  }

  return mvMat;
}

///
vglVisitor.prototype.projectionMatrix = function()
{
  projMat = mat4.create();
  mat4.identity(projMat);

  for (var i = 0; i < this.m_modelViewMatrixStack.length; ++i)
  {
    mat4.multiply(mvMat, this.m_modelViewMatrixStack[i], projMat);
  }

  return projMat;
}

///
vglVisitor.prototype.traverse = function(node)
{
  if (node instanceof vglNode)
  {
    if (this.m_traversalMode === TraversalMode.TraverseParents)
    {
      node.ascend(this);
    }
    else
    {
      node.traverse(this);
    }
  }
}

///
vglVisitor.prototype.visit(node)
{
  this.traverse(node);
}

///
vglVisitor.prototype.visit(actor)
{
  this.traverse(actor);
}