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
// vglRenderStage class
//
//////////////////////////////////////////////////////////////////////////////

///---------------------------------------------------------------------------
function vglRenderState {
  this.m_modelViewMatrix = null;
  this.m_projectionMatrix = null;
  this.m_material = null;
  this.m_mapper = null;
}

//////////////////////////////////////////////////////////////////////////////
//
// vglRenderer class
//
//////////////////////////////////////////////////////////////////////////////


///---------------------------------------------------------------------------
function vglRenderer()
{
  vglObject.call(this);

  this.m_width = 1280;
  this.m_height = 1024;
  this.m_clippingRange = [0.1, 1000.0];
  this.m_sceneRoot = new vglGroupNode();
  this.m_camera = new vglCamera();

  this.m_camera.addChild(this.m_sceneRoot);
}

inherit(vglRenderer, vglObject);

/// Get scene root. Do not change scene root or its data unless
/// required in some special circumstances.
///---------------------------------------------------------------------------
vglRenderer.prototype.sceneRoot = function()
{
  return this.m_sceneRoot;
}

/// Get main camera of the renderer
///---------------------------------------------------------------------------
vglRenderer.prototype.camera = function()
{
  return this.m_camera;
}

/// Get width of renderer
///---------------------------------------------------------------------------
vglRenderer.prototype.width = function()
{
  return this.m_width;
}
/// Get height of renderer
///---------------------------------------------------------------------------
vglRenderer.prototype.height = function()
{
  return this.m_height;
}

/// Render the scene
///---------------------------------------------------------------------------
vglRenderer.prototype.render = function()
{
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  perspectiveMatrix = camera.projectionMatrix(this.m_width / this.m_height, 0.1, 1000.0);

  var renSt = new vglRenderState();
  var children = this.m_sceneRoot.children();
  for (var i = 0; i < children.length; ++i)
  {
    var actor = children(i);
    renSt.m_modelViewMatrix = actor.matrix();
    renSt.m_material = actor.matrial();
    renSt.m_mapper = actor.mapper();

    // NOTE For now we are taking a shortcut because of lack of time
    renSt.m_material.render(renSt);
    renSt.m_mapper.render(renSt);
  }
}

/// Recalculate camera's clipping range
///---------------------------------------------------------------------------
vglRenderer.prototype.resetCameraClippingRange = function()
{
  // TODO
}

/// Resize viewport based on the new width and height of the window
///---------------------------------------------------------------------------
vglRenderer.prototype.resize = function()
{
  // TODO
}

/// Add new actor to the collection. This is required if the actor
/// needs to be rendered by the renderer.
///---------------------------------------------------------------------------
vglRenderer.prototype.addActor = function(actor)
{
  if (actor instanceof vglActor)
  {
    this.m_sceneRoot.addChild(actor);
    return true;
  }

  return false;
}
/// Remove the actor from the collection.This method will
/// not trigger reset camera.
///---------------------------------------------------------------------------
vglRenderer.prototype.removeActor = function(actor)
{
  if (actor in this.m_sceneRoot.children())
  {
    this.m_sceneRoot.removeChild(actor);
    return true;
  }

  return false;
}

//----------------------------------------------------------------------------
function worldToDisplay(worldPt, viewMatrix, projectionMatrix, width, height) {
  console.log('worldPt ', worldPt);

  var viewProjectionMatrix = mat4.create();
  mat4.multiply(projectionMatrix, viewMatrix, viewProjectionMatrix);

  // Transform world to clipping coordinates
  var clipPt = vec4.create();
  mat4.multiplyVec4(viewProjectionMatrix, worldPt, clipPt);

  if (clipPt[3] != 0.0)
    {
    clipPt[0] = clipPt[0] / clipPt[3];
    clipPt[1] = clipPt[1] / clipPt[3];
    clipPt[2] = clipPt[2] / clipPt[3];
    clipPt[3] = 1.0;
    }

  var winX = Math.round( ( ( ( clipPt[0]) + 1 ) / 2.0) * width );
  // We calculate -point3D.getY() because the screen Y axis is
  // oriented top->down
  var winY = Math.round((( 1 - clipPt[1] ) / 2.0) *  height );
  var winZ = clipPt[2];
  var winW = clipPt[3];

  console.log('worldToDisplay ', winX, winY, winZ);

  return vec4.createFrom(winX, winY, winZ, winW);
}

//----------------------------------------------------------------------------
function displayToWorld(displayPt, viewMatrix, projectionMatrix, width, height)
{
    console.log('displayPt ', displayPt);

    var x =  ( 2.0 * displayPt[0] / width )  - 1;
    var y = -( 2.0 * displayPt[1] / height ) + 1;
    var z =  displayPt[2];

    var viewProjectionInverse = mat4.create();
    mat4.multiply(projectionMatrix, viewMatrix, viewProjectionInverse);
    mat4.inverse(viewProjectionInverse, viewProjectionInverse);

    var worldPt = vec4.createFrom(x, y, z, 1);
    mat4.multiplyVec4(viewProjectionInverse, worldPt, worldPt);

    if (worldPt[3] != 0.0)
    {
      worldPt[0] = worldPt[0] / worldPt[3];
      worldPt[1] = worldPt[1] / worldPt[3];
      worldPt[2] = worldPt[2] / worldPt[3];
      worldPt[3] = 1.0;
    }

    console.log('displayToWorld ', worldPt);

    return worldPt;
}


