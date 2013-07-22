import os
import tempfile

import vistrails.core
import vistrails.core.db.action
from vistrails.core import application as vt_app
from vistrails.core.api import get_api
from vistrails.packages.Climate.init import WriteJSON

from vistrails.core.vistrail.pipeline import Pipeline
from vistrails.core.vistrail.vistrail import Vistrail
from vistrails.core.db.locator import XMLFileLocator
from vistrails.core.vistrail.controller import VistrailController

from utils import xml2json, error, debug

#custom logging because we cannot access cherrypy from services
#SERV_DIR = os.path.dirname(os.path.abspath(__file__))
#TEMP_DIR = os.path.abspath(os.path.join(SERV_DIR, '../temp'))
#
#try:
#    SERV_LOG = open(os.path.join(TEMP_DIR, "vistrail.log"), "a")
#    LOGGING_ENABLED = True
#except:
#    LOGGING_ENABLED = False
#
#def debug(msg):
#    if LOGGING_ENABLED:
#        SERV_LOG.write('\nDEBUG: '+ msg)
#
#def error(msg):
#    if LOGGING_ENABLED:
#        SERV_LOG.write('\nERROR: '+ msg)


debug('init vistrails')
vt_app.init({}, [])

debug('get vistrails api')
vt = get_api()

debug('create new vistrail')
vt.new_vistrail()

debug('load vistrail package')
vt.load_package('org.opengeoscience.geoweb.climate', 'Climate')


def run(func_name, **kwargs):
    func = getattr(functions, func_name)
    return func(**kwargs)

class functions(object):
    @staticmethod
    def execute(workflowJSON):
        ''' Execute a workflow from it's JSON representation
        '''

        debug('convert json to xml')
        workflowXML = xml2json.json2xml(workflowJSON)

        #temp_wf_fd, temp_wf = tempfile.mkstemp('.xml')

        debug('create temporary file')
        temp_wf_fd, temp_wf = tempfile.mkstemp()
        try:
            f = open(temp_wf, 'w')
            f.write(workflowXML)
            f.close()
            os.close(temp_wf_fd)

            #load workflow temp file into vistrails
            #vt.load_workflow(temp_wf)

            #execute workflow
            #execution = vt.execute()

            debug('Load the Pipeline from the temporary file')
            vistrail = Vistrail()
            locator = XMLFileLocator(temp_wf)
            workflow = locator.load(Pipeline)

            debug('Build a Vistrail from this single Pipeline')
            action_list = []
            for module in workflow.module_list:
                action_list.append(('add', module))
            for connection in workflow.connection_list:
                action_list.append(('add', connection))
            action = vistrails.core.db.action.create_action(action_list)

            debug('add actions')
            vistrail.add_action(action, 0L)
            vistrail.update_id_scope()
            tag = 'climatepipes'
            vistrail.addTag(tag, action.id)

            debug('Build a controller and execute')
            controller = VistrailController()
            controller.set_vistrail(vistrail, None)
            controller.change_selected_version(vistrail.get_version_number(tag))
            execution = controller.execute_current_workflow(
                    custom_aliases=None,
                    custom_params=None,
                    extra_info=None,
                    reason='API Pipeline Execution')

            debug('get result')
            execution_pipeline = execution[0][0]

            if len(execution_pipeline.errors) > 0:
                error("Executing workflow")
                for key in execution_pipeline.errors:
                    error(execution_pipeline.errors[key])
                    print execution_pipeline.errors[key]
                return None

            modules = execution_pipeline.objects

            for id, module in modules.iteritems():
                if isinstance(module, WriteJSON):
                    return module.JSON

        finally:
            os.unlink(temp_wf)
