import os
import tempfile

import vistrails.core
import vistrails.core.db.action
from vistrails.core import application as vt_app
from vistrails.core.api import get_api
from vistrails.packages.Climate.init import ToGeoJSON

from vistrails.core.vistrail.pipeline import Pipeline
from vistrails.core.vistrail.vistrail import Vistrail
from vistrails.core.db.locator import XMLFileLocator
from vistrails.core.vistrail.controller import VistrailController

from utils import error, debug


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
        workflowXML = json2xml(workflowJSON)

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
                if isinstance(module, ToGeoJSON):
                    return module.JSON

        finally:
            os.unlink(temp_wf)

"""xml2json.py  Convert XML to JSON

R. White, 2006 November 6
"""

import xml.etree.cElementTree as ET
import simplejson, optparse, sys, os

def elem_to_internal(elem,strip=1):

    """Convert an Element into an internal dictionary (not JSON!)."""

    d = {}
    for key, value in elem.attrib.items():
        d['@'+key] = value

    # loop over subelements to merge them
    for subelem in elem:
        v = elem_to_internal(subelem,strip=strip)
        tag = subelem.tag
        value = v[tag]
        try:
            # add to existing list for this tag
            d[tag].append(value)
        except AttributeError:
            # turn existing entry into a list
            d[tag] = [d[tag], value]
        except KeyError:
            # add a new non-list entry
            d[tag] = value
    text = elem.text
    tail = elem.tail
    if strip:
        # ignore leading and trailing whitespace
        if text: text = text.strip()
        if tail: tail = tail.strip()

    if tail:
        d['#tail'] = tail

    if d:
        # use #text element if other attributes exist
        if text: d["#text"] = text
    else:
        # text is the value if no attributes
        d = text or None
    return {elem.tag: d}


def internal_to_elem(pfsh, factory=ET.Element):

    """Convert an internal dictionary (not JSON!) into an Element.

    Whatever Element implementation we could import will be
    used by default; if you want to use something else, pass the
    Element class as the factory parameter.
    """

    attribs = {}
    text = None
    tail = None
    sublist = []
    tag = pfsh.keys()
    if len(tag) != 1:
        raise ValueError("Illegal structure with multiple tags: %s" % tag)
    tag = tag[0]
    value = pfsh[tag]
    if isinstance(value, dict):
        for k, v in value.items():
            if k[:1] == "@":
                attribs[k[1:]] = v
            elif k == "#text":
                text = v
            elif k == "#tail":
                tail = v
            elif isinstance(v, list):
                for v2 in v:
                    sublist.append(internal_to_elem({k:v2}, factory=factory))
            else:
                sublist.append(internal_to_elem({k:v}, factory=factory))
    else:
        text = value
    e = factory(tag, attribs)
    for sub in sublist:
        e.append(sub)
    e.text = text
    e.tail = tail
    return e


def elem2json(elem, strip=1):

    """Convert an ElementTree or Element into a JSON string."""

    if hasattr(elem, 'getroot'):
        elem = elem.getroot()
    return simplejson.dumps(elem_to_internal(elem, strip=strip))


def json2elem(json, factory=ET.Element):

    """Convert a JSON string into an Element.

    Whatever Element implementation we could import will be used by
    default; if you want to use something else, pass the Element class
    as the factory parameter.
    """

    return internal_to_elem(simplejson.loads(json), factory)


def xml2json(xmlstring, strip=1):

    """Convert an XML string into a JSON string."""

    elem = ET.fromstring(xmlstring)
    return elem2json(elem, strip=strip)


def json2xml(json, factory=ET.Element):

    """Convert a JSON string into an XML string.

    Whatever Element implementation we could import will be used by
    default; if you want to use something else, pass the Element class
    as the factory parameter.
    """

    elem = internal_to_elem(simplejson.loads(json), factory)
    return ET.tostring(elem)
