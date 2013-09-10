#!/bin/sh
VTK_ROOT=${VTK_ROOT:?"Need to set VTK_ROOT to VTK build directory"}
VisTrails_ROOT=${VisTrails_ROOT:?"Need to set VisTrails_ROOT to VisTrails directory"}
export PYTHONPATH=${VTK_ROOT}/Wrapping/Python:${VTK_ROOT}/bin:${VTK_ROOT}/lib:${VisTrails_ROOT}:${PYTHONPATH}
echo 'Setting PYTHONPATH to' ${PYTHONPATH}
