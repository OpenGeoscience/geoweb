
function vesCamera()
{
  this.m_viewAngle = 30;
  this.m_position = vec3.create([0.0, 0.0, 5.0]);
  this.m_focalPoint = vec3.create([0.0, 0.0, 0.0]);
  this.m_viewUp = vec3.create([0.0, 1.0, 0.0]);
  this.m_right = vec3.create([1.0, 0.0, 0.0]);
  this.m_pitchMatrix = mat4.create();
  this.m_cache = vec3.create([1.0, 0.0, 0.0]);

  this.m_viewMatrix = mat4.create();
  this.m_projectionMatrix = mat4.create();

  mat4.identity(this.m_pitchMatrix);
  
  //----------------------------------------------------------------------------
  this.setPosition = function(x, y, z)
  {
    this.m_position = vec3.create([x, y, z]);
  }
  
  //----------------------------------------------------------------------------
  this.setFocalPoint = function(x, y, z)
  {
    this.m_focalPoint = vec3.create([x, y, z]);
  }
  
  //----------------------------------------------------------------------------
  this.setViewUpDirection = function(x, y, z)
  {
    this.m_viewUp = vec3.create([x, y, z]);
  }

  //----------------------------------------------------------------------------
  this.zoom  = function(dz)
  {
    // Since our direction vector is changed, we need to first
    // calculate this new direction
    dir = new vec3.create();
    vec3.direction(this.m_focalPoint, this.m_position, dir);

    lastPosition = this.m_position;

    this.m_position[0] += dir[0] * dz;
    this.m_position[1] += dir[1] * dz;
    this.m_position[2] += dir[2] * dz;
    
    this.m_focalPoint[0] += dir[0] * dz;
    this.m_focalPoint[1] += dir[1] * dz;
    this.m_focalPoint[2] += dir[2] * dz;

    // TODO: If the distance between focal point and the camera position
    // goes really low then we run into issues
  }
  
  //----------------------------------------------------------------------------
  this.pan = function(dx, dy)
  {
    this.computeOrthogonalAxes();
    
    this.m_position[0] += this.m_right[0] * dx;
    this.m_position[1] += this.m_viewUp[1] * dy;    
    
    this.m_focalPoint[0] += this.m_right[0] * dx;
    this.m_focalPoint[1] += this.m_viewUp[1] * dy;    
  }
  
  //----------------------------------------------------------------------------
  this.computeOrthogonalAxes = function()
  {
    dir = new vec3.create();
    vec3.direction(this.m_focalPoint, this.m_position, dir);
    vec3.normalize(dir);
    vec3.cross(dir, this.m_viewUp, this.m_right);
    vec3.normalize(this.m_right);
  }
  
  //----------------------------------------------------------------------------
  this.yaw = function(degrees)
  {
    radians = degrees * (3.14 / 180.0)

    mat = mat4.create();
    mat4.identity(mat);

    // We would like to rotate about focal point and to do so
    // and since our rotation is calculated assuming that rotation point or
    // axis is at origin, we need to inverse transte, rotate and again translate
    // to calculate the complete transformation matrix.
    invDir = new vec3.create();
    invDir[0] = -this.m_focalPoint[0];
    invDir[1] = -this.m_focalPoint[1];
    invDir[2] = -this.m_focalPoint[2];    

    mat4.translate(mat, this.m_focalPoint, mat);
    mat4.rotate(mat, radians, this.m_viewUp, mat);
    mat4.translate(mat, invDir, mat);

//    console.log(this.m_viewUp);
    mat4.multiplyVec3(mat, this.m_position, this.m_position);   

    this.computeOrthogonalAxes();
  }


  //----------------------------------------------------------------------------
  this.pitch = function(degrees)
  {
    radians = degrees * (3.14 / 180.0)    

    mat = mat4.create();
    mat4.identity(mat);

    // We would like to rotate about focal point and to do so
    // and since our rotation is calculated assuming that rotation point or
    // axis is at origin, we need to inverse transte, rotate and again translate
    // to calculate the complete transformation matrix.
    invDir = new vec3.create();
    invDir[0] = -this.m_focalPoint[0];
    invDir[1] = -this.m_focalPoint[1];
    invDir[2] = -this.m_focalPoint[2];

    mat4.translate(mat, this.m_focalPoint, mat);
    mat4.rotate(mat, radians, this.m_right, mat);
    mat4.translate(mat, invDir, mat);

    dir = vec3.create();
    vec3.direction(this.m_position, this.m_focalPoint, dir);

    // Now update the position
    mat4.multiplyVec3(mat, this.m_position, this.m_position);    
  }

  //----------------------------------------------------------------------------
  this.viewMatrix = function()
  {
    mat4.lookAt(this.m_position, this.m_focalPoint, this.m_viewUp, this.m_viewMatrix);
    
    temp = vec3.create([this.m_viewMatrix[0], this.m_viewMatrix[1], this.m_viewMatrix[2]]);

    // If we realize a flip in x axis, then we need to flip our vertical axis since
    // we don't want to look upside down.
    if(vec3.dot(temp, this.m_cache) < 0.0)
    {
      this.m_viewUp[0] = -this.m_viewUp[0];
      this.m_viewUp[1] = -this.m_viewUp[1];
      this.m_viewUp[2] = -this.m_viewUp[2];
      mat4.lookAt(this.m_position, this.m_focalPoint, this.m_viewUp, this.m_viewMatrix);
      
    }
    
    temp = vec3.create([this.m_viewMatrix[0], this.m_viewMatrix[1], this.m_viewMatrix[2]]);
    vec3.set(temp, this.m_cache);

    return this.m_viewMatrix;
  }

  //----------------------------------------------------------------------------
  this.projectionMatrix = function(aspect, near, far)
  {
    mat4.perspective(this.m_viewAngle, aspect, near, far,
                     this.m_projectionMatrix);

    return this.m_projectionMatrix;
  }
}

