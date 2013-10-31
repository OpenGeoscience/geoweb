# various cdms operations
import cdms2
from cdms2 import CDMSError

import json

class functions(object):

    @staticmethod
    def get_vars(filepath):
        cdmsFile = cdms2.open(filepath)

        result = []
        for (_, varId) in sorted([(len(var.listdimnames()), var.id)
                                    for var in cdmsFile.variables.itervalues()])[::-1]:

            var = cdmsFile.variables[varId]
            label = var.id + ' ' + str(var.shape) + ' ['

            if hasattr(var, 'long_name'):
                label += var.long_name
            if hasattr(var, 'units') and var.units != '':
                if label[-1] != '[': label += ' '
                label += var.units
            label += ']'
            result.append({'id':varId, 'label':label})

        return result

    def get_time_series(filepath, lat, lon):
        f = cdms2.open(filePath)
        myvariable = f[variable_name]

        '''Return nothing if the variable does not contain time, longitude & latitude condition at all'''
        order = myvariable.getOrder()

        if(order.find('t') == -1 or order.find('x') == -1 or order.find('y') == -1):
            raise TypeError('Missing Dimensions for the variable')

        try:
            # Cob gives the nearest point
            data = myvariable.subRegion(latitude=(lat, lat, 'cob'), longitude=(lon, lon, 'cob'))
            innerList = []
            timeAxis = data.getTime()
            outerList = {'TimeUnit':data.getTime().units,'Calendar': data.getTime().calendar}
            if(order.find('z')!=-1):
                '''We have a level for the given variable'''
                levelAxis = data.getLevel()
                outerList['LevelUnit'] = data.getLevel().units
                for mylevel in levelAxis:
                    for mytime in timeAxis:
                        innerList.append({'Level':str(mylevel),'Time':str(mytime),'VariableValue':str(data(level=mylevel, time=mytime)[0])})
            else:
                '''We Don't have a level field'''
                for mytime in timeAxis:
                    innerList.append({'Time':str(mytime),'variable':str(data(time=mytime)[0])})

            outerList['values']= innerList
            return json.dumps(outerList)
        except CDMSError:
            ''' Handle  the case where there is no data for the location'''
            return None


def run(func_name, **kwargs):
    func = getattr(functions, func_name)
    return func(**kwargs)
