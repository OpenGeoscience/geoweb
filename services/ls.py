# module to list files in the data directory
from os import listdir
from os.path import isfile, join, abspath
import os

import cherrypy

# root_dir = cherrypy.tree.apps[''].config['/']['tools.staticdir.root']
data_dir = cherrypy.tree.apps[''].config['/data']['tools.staticdir.dir']

def run(ext='*', path=''):
    files = []
    for filename in listdir(join(data_dir, path)):
        full_path = abspath(join(data_dir, path, filename))
        if isfile(full_path):
            if (ext == '*' or filename.lower().endswith(ext.lower())):
                files.append({'path':full_path, 'name':filename})

    return files
