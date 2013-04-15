# various cdms operations
import cdms2

class functions(object):

    @staticmethod
    def getVars(filepath):
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

def run(func_name, **kwargs):
    func = getattr(functions, func_name)
    return func(**kwargs)
