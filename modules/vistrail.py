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

from utils import xml2json, log, error, debug

# init vistrails
vt_app.init()

#get vistrails api
vt = get_api();
vt.new_vistrail()
vt.load_package('org.opengeoscience.geoweb.climate', 'Climate')

def execute(workflowJSON):
    ''' Execute a workflow from it's JSON representation
    '''

    #import pdb; pdb.set_trace()

    #convert json to xml
    workflowXML = xml2json.json2xml(workflowJSON)

    #execute xml workflow
    #create temporary file
    #temp_wf_fd, temp_wf = tempfile.mkstemp('.xml')
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

        # Load the Pipeline from the temporary file
        vistrail = Vistrail()
        locator = XMLFileLocator(temp_wf)
        workflow = locator.load(Pipeline)

        # Build a Vistrail from this single Pipeline
        action_list = []
        for module in workflow.module_list:
            action_list.append(('add', module))
        for connection in workflow.connection_list:
            action_list.append(('add', connection))
        action = vistrails.core.db.action.create_action(action_list)

        vistrail.add_action(action, 0L)
        vistrail.update_id_scope()
        tag = 'climatepipes'
        vistrail.addTag(tag, action.id)

        # Build a controller and execute
        controller = VistrailController()
        controller.set_vistrail(vistrail, None)
        controller.change_selected_version(vistrail.get_version_number(tag))
        execution = controller.execute_current_workflow(
                custom_aliases=None,
                custom_params=None,
                extra_info=None,
                reason='API Pipeline Execution')

        #get result
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


#TESTS
import unittest

class TestModuleExecution(unittest.TestCase):
    def setUp(self):
        dir = os.path.dirname(__file__)
        with open(os.path.join(dir, 'testworkflow.json'),'r') as f:
            self.workflowJSON = f.read()

        with open(os.path.join(dir, 'testworkflowoutput.json'),'r') as f:
            self.expectedResult = f.read()

    def test_execution(self):
        result = execute(self.workflowJSON)
        self.assertEqual(result, self.expectedResult)

if __name__ == '__main__':
    unittest.main()
