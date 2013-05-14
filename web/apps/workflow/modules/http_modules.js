var http_modules = [
 {
  "category": "edu-utah-sci-vistrails-http",
  "container": {
   "fields": [
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:String",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "url",
      "label": "url"
     }
    }
   ],
   "terminals": [
    {
     "direction": [
      0,
      -1
     ],
     "name": "url",
     "offsetPosition": {
      "top": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "i(edu.utah.sci.vistrails.basic:String)",
      "allowedTypes": [
       "o(edu.utah.sci.vistrails.basic:String)"
      ]
     }
    },
    {
     "direction": [
      0,
      1
     ],
     "name": "file",
     "offsetPosition": {
      "bottom": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "o(edu.utah.sci.vistrails.basic:File)",
      "allowedTypes": [
       "i(edu.utah.sci.vistrails.basic:File)",
       "i(edu.utah.sci.vistrails.basic:Path)",
       "i(edu.utah.sci.vistrails.basic:Constant)",
       "i(edu.utah.sci.vistrails.basic:Module)"
      ]
     }
    }
   ],
   "vt": {
    "cache": 1,
    "namespace": "",
    "version": "0.9.0",
    "package": "edu.utah.sci.vistrails.http"
   },
   "xtype": "climatePipes.Container",
   "icon": "wireit/res/icons/application_edit.png"
  },
  "name": "HTTPFile"
 }
];
