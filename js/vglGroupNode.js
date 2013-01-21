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
// vglGroupNode class
//
//////////////////////////////////////////////////////////////////////////////

function vglGroupNode() {
  vglNode.call(this);
  this.m_children = new Array();
}

inherit(vglGroupNode, vglNode);

///
vglGroupNode.prototype.setVisible = function(flag)
{
  if (vglNode.prototype.setVisible.call(this, flag) !== true)
  {
    return false;
  }

  for (var i = 0; i < this.m_children.length; ++i)
  {
    this.m_children[i].setVisible(flag);
  }

  return true;
}

///
vglGroupNode.prototype.addChild = function(childNode)
{
  if (childNode instanceof vglNode)
  {
    if (this.m_children.indexOf(childNode) === -1)
    {
      childNode.setParent(this);
      this.m_children.push(childNode);
      this.setBoundsDirty(true);

      return true;
    }
    return false;
  }

  return false;
}

///
vglGroupNode.prototype.removeChild = function(childNode)
{
  if (childNode.parent() === this)
  {
    var index = this.m_children.indexof(childNode);
    this.m_children.splice(index, 1);
    this.setBoundsDirty(true);
    return true;
  }
}

///
vglGroupNode.prototype.children = function()
{
  return this.m_children;
}

///
vglGroupNode.prototype.accept = function(visitor)
{
  visitor.visit(this);
}

///
vglGroupNode.prototype.traverse = function(visitor)
{
  switch (visitor.type())
  {
  case vglVisitor.UpdateVisitor:
    this.traverseChildrenAndUpdateBounds(visitor);
    break;
  case vglVisitor.CullVisitor:
    this.traverseChildren(visitor);
    break;
  default:
    break;
  }
}

///
vglGroupNode.prototype.traverseChildrenAndUpdateBounds = function(visitor)
{
  this.computeBounds();

  if (visitor.mode() === vglVisitor.TraverseAllChildren)
  {
    for (var i = 0; i < this.m_children.length(); ++i)
    {
      this.m_children[i].accept(visitor);
      this.updateBounds(this.m_children[i]);
    }
  }

  if (this.m_parent && this.boundsDirty())
  {
    // Flag parents bounds dirty.
    this.m_parent.setBoundsDirty(true);
  }

  // Since by now, we have updated the node bounds it is
  // safe to mark that bounds are no longer dirty anymore
  this.setBoundsDirty(false);
}

///
vglGroupNode.prototype.traverseChildren = function(visitor)
{
  if (visitor.mode() == vesVisitor.TraverseAllChildren)
  {
    for (var i = 0; i < this.m_children.length(); ++i)
    {
      this.m_children[i].accept(visitor);
    }
  }
}

///
vglGroupNode.prototype.updateBounds = function(childNode)
{
  // TODO: Compute bounds here
}

