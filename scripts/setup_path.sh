#!/bin/sh
VTK_ROOT=${VTK_ROOT:?"Need to set VTK_ROOT to VTK build directory"}
export PYTHONPATH=${VTK_ROOT}/Wrapping/Python:${VTK_ROOT}/bin:${VTK_ROOT}/lib:${PYTHONPATH}
echo 'Setting PYTHONPATH to' ${PYTHONPATH}
