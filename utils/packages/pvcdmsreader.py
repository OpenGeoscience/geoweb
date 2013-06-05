
# Import system libraries
import sys, os, time

# CDAT
import cdms2, cdtime, cdutil, MV2

# VTK
import vtk

# Others
import numpy as np
from mpl_toolkits.axes_grid.axes_size import Scalable

class PVCDMSReader():
    def __init__(self):
        self.grid_bounds = None
        self.zscale = 1
        self.output_type = None
        self.lon = None
        self.lat = None
        self.lev = None
        self.time = None
        pass

    def is_level_axis(self, axis):
        if axis.isLevel(): return True
        # // @note: What's so special about isobaric?
        if (axis.id == 'isobaric'):
            axis.designateLevel(1)
            return True
        return False

    def is_three_dimensional(self, cdms_var):
        dim = 0
        if cdms_var is not None:
            axes_list = cdms_var.var.getAxisList()

            for axis in axes_list:
                if axis.isLongitude():
                    dim += 1
                if axis.isLatitude():
                    dim += 1
                if self.is_level_axis(axis):
                    dim += 1
        return (True if (dim == 3) else False)

    def get_coord_type(self, axis):
        icoord = -2
        if axis.isLongitude():
            self.lon = axis
            icoord = 0
        if axis.isLatitude():
            self.lat = axis
            icoord = 1
        if self.is_level_axis(axis):
            self.lev = axis
            icoord = 2
        # // @todo: Not sure if this is needed here
        if axis.isTime():
            self.time = axis
            icoord = 2
        return icoord

    def get_axis_values(self, axis, roi):
        values = axis.getValue()
        bounds = None
        if roi:
            if   axis.isLongitude():  bounds = [ roi[0], roi[2] ]
            elif axis.isLatitude():   bounds = [ roi[1], roi[3] ]
        if bounds:
            if axis.isLongitude() and (values[0] > values[-1]):
                values[-1] = values[-1] + 360.0
            value_bounds = [ min(values[0], values[-1]), max(values[0], values[-1]) ]
            mid_value = (value_bounds[0] + value_bounds[1]) / 2.0
            mid_bounds = (bounds[0] + bounds[1]) / 2.0
            offset = (360.0 if mid_bounds > mid_value else -360.0)
            trans_val = mid_value + offset
            if (trans_val > bounds[0]) and (trans_val < bounds[1]):
                value_bounds[0] = value_bounds[0] + offset
                value_bounds[1] = value_bounds[1] + offset
            bounds[0] = max([ bounds[0], value_bounds[0] ])
            bounds[1] = min([ bounds[1], value_bounds[1] ])
        return bounds, values

    def new_list(self, size, init_value):
        return [ init_value for i in range(size) ]

    def new_array_set_scalars(self, scalar_dtype, image_data, num_components):
        if scalar_dtype == np.ushort:
            image_data.AllocateScalars(vtk.VTK_UNSIGNED_SHORT, num_components)
            return vtk.vtkUnsignedShortArray()
        if scalar_dtype == np.int32:
            image_data.AllocateScalars(vtk.VTK_INT, num_components)
            return vtk.vtkIntArray()
        if scalar_dtype == np.ubyte:
            image_data.AllocateScalars(vtk.VTK_UNSIGNED_CHAR, num_components)
            return vtk.vtkUnsignedCharArray()
        if scalar_dtype == np.float32:
            image_data.AllocateScalars(vtk.VTK_FLOAT, num_components)
            return vtk.vtkFloatArray()
        if scalar_dtype == np.float64:
            # // @todo: check if this type is supported
            image_data.AllocateScalars(vtk.VTK_TYPE_FLOAT64, num_components)
            return vtk.vtkDoubleArray()
        print >> sys.stderr, '[ERROR] ' + str(scalar_dtype) + ' is not supported '
        return None

    def get_grid_specs(self, var, roi, zscale):
        gridOrigin = self.new_list(3, 0.0)
        outputOrigin = self.new_list(3, 0.0)
        gridBounds = self.new_list(6, 0.0)
        gridSpacing = self.new_list(3, 1.0)
        gridExtent = self.new_list(6, 0)
        outputExtent = self.new_list(6, 0)
        gridShape = self.new_list(3, 0)
        gridSize = 1
        self.lev = var.getLevel()
        axis_list = var.getAxisList()
        for axis in axis_list:
            size = len(axis)
            iCoord = self.get_coord_type(axis)
            roiBounds, values = self.get_axis_values(axis, roi)
            if iCoord >= 0:
                iCoord2 = 2 * iCoord
                gridShape[ iCoord ] = size
                gridSize = gridSize * size
                outputExtent[ iCoord2 + 1 ] = gridExtent[ iCoord2 + 1 ] = size - 1
                if iCoord < 2:
                    lonOffset = 0.0  # 360.0 if ( ( iCoord == 0 ) and ( roiBounds[0] < -180.0 ) ) else 0.0
                    outputOrigin[ iCoord ] = gridOrigin[ iCoord ] = values[0] + lonOffset
                    spacing = (values[size - 1] - values[0]) / (size - 1)
                    if roiBounds:
                        if (roiBounds[1] < 0.0) and  (roiBounds[0] >= 0.0): roiBounds[1] = roiBounds[1] + 360.0
                        gridExtent[ iCoord2 ] = int(round((roiBounds[0] - values[0]) / spacing))
                        gridExtent[ iCoord2 + 1 ] = int(round((roiBounds[1] - values[0]) / spacing))
                        if gridExtent[ iCoord2 ] > gridExtent[ iCoord2 + 1 ]:
                            geTmp = gridExtent[ iCoord2 + 1 ]
                            gridExtent[ iCoord2 + 1 ] = gridExtent[ iCoord2 ]
                            gridExtent[ iCoord2 ] = geTmp
                        outputExtent[ iCoord2 + 1 ] = gridExtent[ iCoord2 + 1 ] - gridExtent[ iCoord2 ]
                        outputOrigin[ iCoord ] = lonOffset + roiBounds[0]
                    roisize = gridExtent[ iCoord2 + 1 ] - gridExtent[ iCoord2 ] + 1
                    gridSpacing[ iCoord ] = spacing
                    gridBounds[ iCoord2 ] = roiBounds[0] if roiBounds else values[0]
                    gridBounds[ iCoord2 + 1 ] = (roiBounds[0] + roisize * spacing) if roiBounds else values[ size - 1 ]
                else:
                    gridSpacing[ iCoord ] = 1.0
#                    gridSpacing[ iCoord ] = zscale
                    gridBounds[ iCoord2 ] = values[0]  # 0.0
                    gridBounds[ iCoord2 + 1 ] = values[ size - 1 ]  # float( size-1 )
        if gridBounds[ 2 ] > gridBounds[ 3 ]:
            tmp = gridBounds[ 2 ]
            gridBounds[ 2 ] = gridBounds[ 3 ]
            gridBounds[ 3 ] = tmp
        gridSpecs = {}
        md = { 'bounds':gridBounds, 'lat':self.lat, 'lon':self.lon, 'lev':self.lev, 'time': self.time }
        gridSpecs['gridOrigin'] = gridOrigin
        gridSpecs['outputOrigin'] = outputOrigin
        gridSpecs['gridBounds'] = gridBounds
        gridSpecs['gridSpacing'] = gridSpacing
        gridSpecs['gridExtent'] = gridExtent
        gridSpecs['outputExtent'] = outputExtent
        gridSpecs['gridShape'] = gridShape
        gridSpecs['gridSize'] = gridSize
        gridSpecs['md'] = md
        # // @todo: How we get the attributes?
            # if dset:  gridSpecs['attributes'] = dset.dataset.attributes
        return gridSpecs

    def convert(self, cdms_var, **args):
        '''Convert a cdms data to vtk image data

        '''
        cdms_var.var = cdms_var
        trans_var = cdms_var.var
        level_axis = trans_var.getLevel()
        time_axis = trans_var.getTime()

        if level_axis:
            values = level_axis.getValue()
            ascending_values = (values[-1] > values[0])
            invert_z = ((level_axis.attributes.get('positive', '') == 'down') and ascending_values) or ((levaxis.attributes.get('positive', '') == 'up') and not ascending_values)

        time_bounds = args.get('time', None)
        [ time_value, time_index, use_time_index ] = time_bounds if time_bounds else [ None, None, None ]

        raw_data_array = None

        # // @todo: Pass decimation required
        decimation_factor = 1

        # // @todo: Worry about order later
        data_args = {}

        try:
            if (time_index != None and use_time_index):
                data_args['time'] = slice(time_index, time_index + 1)
            elif time_value:
                data_args['time'] = time_value
        except:
            pass

        try:
            raw_data_array = trans_var(**data_args)
        except Exception, err:
            print >> sys.stderr, "Error Reading Variable " + str(err)
            return None

        # @note: Why masked_equal?
        try:
            raw_data_array = MV2.masked_equal(raw_data_array, raw_data_array.fill_value)
        except:
            pass

        data_array = raw_data_array
        var_data_specs = self.get_grid_specs(data_array, None, 1)

        # // @todo: Handle attributes later

        # // Now create a vtk image data
        image_data = vtk.vtkImageData()

        # // @note: Assuming number of components always equal to 1
        num_components = 1

        # // @note: What's the difference between gridOrigin and outputOrigin
        scalar_dtype = cdms_var.var.dtype

        vtk_data_array = self.new_array_set_scalars(scalar_dtype, image_data,
                                                     num_components)

        origin = var_data_specs['outputOrigin']
        image_data.SetOrigin(origin[0], origin[1], origin[2])

        spacing = var_data_specs['gridSpacing']
        image_data.SetSpacing(spacing[0], spacing[1], spacing[2])

        extents = var_data_specs['outputExtent']
        extents = image_data.SetExtent(extents[0], extents[1], extents[2], extents[3], extents[4], extents[5])
        no_tuples = data_array.size

        vtk_data_array.SetNumberOfComponents(num_components)
        vtk_data_array.SetNumberOfTuples(no_tuples)
        vtk_data_array.SetVoidArray(data_array, data_array.size, 1)
        vtk_data_array.SetName(cdms_var.id)

        image_point_data = image_data.GetPointData()
        image_point_data.SetScalars(vtk_data_array)

#        writer = vtk.vtkDataSetWriter()
#        writer.SetFileName("/home/aashish/Desktop/foo.vtk")
#        writer.SetInput(image_data)
#        writer.Write()

        # // @note: why make a copy?
#        image_data_copy = vtk.vtkImageData()
#        image_data_copy.DeepCopy(image_data)
#
#        return image_data_copy

        return image_data
