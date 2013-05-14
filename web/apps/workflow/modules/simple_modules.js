var simple_modules = [
 {
  "container": {
   "fields": [
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:String",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "name",
      "label": "name"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:File",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "value",
      "label": "value"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:Boolean",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "create_file",
      "label": "create_file"
     }
    }
   ],
   "terminals": [
    {
     "direction": [
      0,
      -1
     ],
     "name": "value",
     "offsetPosition": {
      "top": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "i(edu.utah.sci.vistrails.basic:File)",
      "allowedTypes": [
       "o(edu.utah.sci.vistrails.basic:File)"
      ]
     }
    },
    {
     "direction": [
      0,
      1
     ],
     "name": "value_as_string",
     "offsetPosition": {
      "bottom": -15,
      "left": 106.66666666666667
     },
     "ddConfig": {
      "type": "o(edu.utah.sci.vistrails.basic:String)",
      "allowedTypes": [
       "i(edu.utah.sci.vistrails.basic:String)",
       "i(edu.utah.sci.vistrails.basic:Constant)",
       "i(edu.utah.sci.vistrails.basic:Module)"
      ]
     }
    },
    {
     "direction": [
      0,
      1
     ],
     "name": "value",
     "offsetPosition": {
      "bottom": -15,
      "left": 213.33333333333334
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
    "version": "1.6",
    "package": "edu.utah.sci.vistrails.basic"
   },
   "xtype": "climatePipes.Container",
   "icon": "wireit/res/icons/application_edit.png",
  },
  "name": "File"
 },
 {
  "category": "org-vistrails-climatepipes",
  "container": {
   "fields": [
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:File",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "file",
      "label": "file"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:String",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "var",
      "label": "var"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:Float",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "lat[0]",
      "label": "lat[0]"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:Float",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "lat[1]",
      "label": "lat[1]"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:Float",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "lon[0]",
      "label": "lon[0]"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:Float",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "lon[1]",
      "label": "lon[1]"
     }
    }
   ],
   "terminals": [
    {
     "direction": [
      0,
      -1
     ],
     "name": "file",
     "offsetPosition": {
      "top": -15,
      "left": 64.0
     },
     "ddConfig": {
      "type": "i(edu.utah.sci.vistrails.basic:File)",
      "allowedTypes": [
       "o(edu.utah.sci.vistrails.basic:File)"
      ]
     }
    },
    {
     "direction": [
      0,
      -1
     ],
     "name": "var",
     "offsetPosition": {
      "top": -15,
      "left": 128.0
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
      -1
     ],
     "name": "lat",
     "offsetPosition": {
      "top": -15,
      "left": 192.0
     },
     "ddConfig": {
      "type": "i(edu.utah.sci.vistrails.basic:Float,edu.utah.sci.vistrails.basic:Float)",
      "allowedTypes": [
       "o(edu.utah.sci.vistrails.basic:Float,edu.utah.sci.vistrails.basic:Float)"
      ]
     }
    },
    {
     "direction": [
      0,
      -1
     ],
     "name": "lon",
     "offsetPosition": {
      "top": -15,
      "left": 256.0
     },
     "ddConfig": {
      "type": "i(edu.utah.sci.vistrails.basic:Float,edu.utah.sci.vistrails.basic:Float)",
      "allowedTypes": [
       "o(edu.utah.sci.vistrails.basic:Float,edu.utah.sci.vistrails.basic:Float)"
      ]
     }
    },
    {
     "direction": [
      0,
      1
     ],
     "name": "data",
     "offsetPosition": {
      "bottom": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "o(edu.utah.sci.vistrails.basic:List)",
      "allowedTypes": [
       "i(edu.utah.sci.vistrails.basic:List)",
       "i(edu.utah.sci.vistrails.basic:Constant)",
       "i(edu.utah.sci.vistrails.basic:Module)"
      ]
     }
    }
   ],
   "vt": {
    "cache": 1,
    "namespace": "",
    "version": "0.0.1",
    "package": "org.vistrails.climatepipes"
   },
   "xtype": "climatePipes.Container",
   "icon": "wireit/res/icons/application_edit.png"
  },
  "name": "ClimateIsoFillParams"
 },
{
  "category": "org-vistrails-climatepipes",
  "container": {
   "fields": [
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:List",
     "type": "hidden",
     "inputParams": {
      "required": true,
      "name": "data",
      "label": "data"
     }
    }
   ],
   "terminals": [
    {
     "direction": [
      0,
      -1
     ],
     "name": "data",
     "offsetPosition": {
      "top": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "i(edu.utah.sci.vistrails.basic:List)",
      "allowedTypes": [
       "o(edu.utah.sci.vistrails.basic:List)"
      ]
     }
    }
   ],
   "vt": {
    "cache": 1,
    "namespace": "",
    "version": "0.0.1",
    "package": "org.vistrails.climatepipes"
   },
   "xtype": "climatePipes.Container",
   "icon": "wireit/res/icons/application_edit.png"
  },
  "name": "Visualize"
 },
 {
  "category": "org.vistrails-climatepipes",
  "container": {
   "fields": [
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:File",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "keyCertFile",
      "label": "keyCertFile"
     }
    },
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
     "name": "keyCertFile",
     "offsetPosition": {
      "top": -15,
      "left": 106.66666666666667
     },
     "ddConfig": {
      "type": "i(edu.utah.sci.vistrails.basic:File)",
      "allowedTypes": [
       "o(edu.utah.sci.vistrails.basic:File)"
      ]
     }
    },
    {
     "direction": [
      0,
      -1
     ],
     "name": "url",
     "offsetPosition": {
      "top": -15,
      "left": 213.33333333333334
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
     "name": "output",
     "offsetPosition": {
      "bottom": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "o(edu.utah.sci.vistrails.basic:List)",
      "allowedTypes": [
       "i(edu.utah.sci.vistrails.basic:List)",
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
    "package": "org.vistrails.climatepipes"
   },
   "xtype": "climatePipes.Container",
   "icon": "wireit/res/icons/application_edit.png"
  },
  "name": "ESGFDownloadFile"
 },
 {
  "category": "org.vistrails-climatepipes",
  "container": {
   "fields": [
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:String",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "host",
      "label": "host"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:Integer",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "port",
      "label": "port"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:String",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "user",
      "label": "user"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:String",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "password",
      "label": "password"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:File",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "keyCertFile",
      "label": "keyCertFile"
     }
    }
   ],
   "terminals": [
    {
     "direction": [
      0,
      -1
     ],
     "name": "host",
     "offsetPosition": {
      "top": -15,
      "left": 53.333333333333336
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
      -1
     ],
     "name": "port",
     "offsetPosition": {
      "top": -15,
      "left": 106.66666666666667
     },
     "ddConfig": {
      "type": "i(edu.utah.sci.vistrails.basic:Integer)",
      "allowedTypes": [
       "o(edu.utah.sci.vistrails.basic:Integer)"
      ]
     }
    },
    {
     "direction": [
      0,
      -1
     ],
     "name": "user",
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
      -1
     ],
     "name": "password",
     "offsetPosition": {
      "top": -15,
      "left": 213.33333333333334
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
      -1
     ],
     "name": "keyCertFile",
     "offsetPosition": {
      "top": -15,
      "left": 266.66666666666669
     },
     "ddConfig": {
      "type": "i(edu.utah.sci.vistrails.basic:File)",
      "allowedTypes": [
       "o(edu.utah.sci.vistrails.basic:File)"
      ]
     }
    },
    {
     "direction": [
      0,
      1
     ],
     "name": "keyCertFile",
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
    "package": "org.vistrails.climatepipes"
   },
   "xtype": "climatePipes.Container",
   "icon": "wireit/res/icons/application_edit.png"
  },
  "name": "ESGFLogin"
 },
 {
  "category": "org.vistrails-climatepipes",
  "container": {
   "fields": [
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:String",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "query",
      "label": "query"
     }
    },
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
     "name": "value",
     "offsetPosition": {
      "bottom": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "o(edu.utah.sci.vistrails.basic:List)",
      "allowedTypes": [
       "i(edu.utah.sci.vistrails.basic:List)",
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
    "package": "org.vistrails.climatepipes"
   },
   "xtype": "climatePipes.Container",
   "icon": "wireit/res/icons/application_edit.png"
  },
  "name": "ESGFSearch"
 }
];
