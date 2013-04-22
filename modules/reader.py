import os
import sys
import geoweb

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir))

def read(expr, vars):
  if expr is None:
    return geoweb.empty_result()

  try:
    # @todo Implement plugin mechanism to ask each reader if they can
    # read this file for now read using the vtk_reader
    import vtk_reader
    return vtk_reader.read(expr, vars)
  except IOError:
    raise Exception('error reading file')
    return geoweb.empty_result()
