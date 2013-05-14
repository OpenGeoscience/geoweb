var cpsimplified_modules = [
 {
  "category": "org-vistrails-climatepipes",
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
      "left": 64.0
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
      "left": 128.0
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
      "left": 192.0
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
      "left": 256.0
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
     "name": "source",
     "offsetPosition": {
      "bottom": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "o(org.vistrails.climatepipes:cpSource)",
      "allowedTypes": [
       "i(org.vistrails.climatepipes:cpSource)",
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
  "name": "ESGFSource"
 },
 {
  "category": "org-vistrails-climatepipes",
  "container": {
   "fields": [],
   "terminals": [
    {
     "direction": [
      0,
      1
     ],
     "name": "source",
     "offsetPosition": {
      "bottom": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "o(org.vistrails.climatepipes:cpSource)",
      "allowedTypes": [
       "i(org.vistrails.climatepipes:cpSource)",
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
  "name": "KitwareSource"
 },
 {
  "category": "org-vistrails-climatepipes",
  "container": {
   "fields": [
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:String",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "Keywords",
      "label": "Keywords"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:String",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "From",
      "label": "From"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:String",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "To",
      "label": "To"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:String",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "Location",
      "label": "Location"
     }
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:Integer",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "numitems",
      "label": "numitems"
     }
    }
   ],
   "terminals": [
    {
     "direction": [
      0,
      -1
     ],
     "name": "source",
     "offsetPosition": {
      "top": -15,
      "left": 45.714285714285715
     },
     "ddConfig": {
      "type": "i(org.vistrails.climatepipes:cpSource)",
      "allowedTypes": [
       "o(org.vistrails.climatepipes:cpSource)"
      ]
     }
    },
    {
     "direction": [
      0,
      -1
     ],
     "name": "Keywords",
     "offsetPosition": {
      "top": -15,
      "left": 91.428571428571431
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
     "name": "From",
     "offsetPosition": {
      "top": -15,
      "left": 137.14285714285714
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
     "name": "To",
     "offsetPosition": {
      "top": -15,
      "left": 182.85714285714286
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
     "name": "Location",
     "offsetPosition": {
      "top": -15,
      "left": 228.57142857142858
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
     "name": "numitems",
     "offsetPosition": {
      "top": -15,
      "left": 274.28571428571428
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
      1
     ],
     "name": "query",
     "offsetPosition": {
      "bottom": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "o(org.vistrails.climatepipes:cpQuery)",
      "allowedTypes": [
       "i(org.vistrails.climatepipes:cpQuery)",
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
  "name": "Query"
 },
 {
  "category": "org-vistrails-climatepipes",
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
    },
    {
     "alias": "",
     "vtype": "edu.utah.sci.vistrails.basic:String",
     "type": "string",
     "inputParams": {
      "required": true,
      "name": "variable",
      "label": "variable"
     }
    }
   ],
   "terminals": [
    {
     "direction": [
      0,
      -1
     ],
     "name": "source",
     "offsetPosition": {
      "top": -15,
      "left": 80.0
     },
     "ddConfig": {
      "type": "i(org.vistrails.climatepipes:cpSource)",
      "allowedTypes": [
       "o(org.vistrails.climatepipes:cpSource)"
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
     "name": "variable",
     "offsetPosition": {
      "top": -15,
      "left": 240.0
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
     "name": "query",
     "offsetPosition": {
      "bottom": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "o(org.vistrails.climatepipes:cpQuery)",
      "allowedTypes": [
       "i(org.vistrails.climatepipes:cpQuery)",
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
  "name": "DataFile"
 },
 {
  "category": "org-vistrails-climatepipes-simplified",
  "container": {
   "fields": [],
   "terminals": [
    {
     "direction": [
      0,
      -1
     ],
     "name": "query",
     "offsetPosition": {
      "top": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "i(org.vistrails.climatepipes:cpQuery)",
      "allowedTypes": [
       "o(org.vistrails.climatepipes:cpQuery)"
      ]
     }
    }
   ],
   "vt": {
    "cache": 1,
    "namespace": "",
    "version": "0.0.1",
    "package": "org.vistrails.climatepipes.simplified"
   },
   "xtype": "climatePipes.Container",
   "icon": "wireit/res/icons/application_edit.png"
  },
  "name": "ListData"
 },
 {
  "category": "org-vistrails-climatepipes-simplified",
  "container": {
   "fields": [],
   "terminals": [
    {
     "direction": [
      0,
      -1
     ],
     "name": "query",
     "offsetPosition": {
      "top": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "i(org.vistrails.climatepipes:cpQuery)",
      "allowedTypes": [
       "o(org.vistrails.climatepipes:cpQuery)"
      ]
     }
    }
   ],
   "vt": {
    "cache": 1,
    "namespace": "",
    "version": "0.0.1",
    "package": "org.vistrails.climatepipes.simplified"
   },
   "xtype": "climatePipes.Container",
   "icon": "wireit/res/icons/application_edit.png"
  },
  "name": "Visualize"
 },
 {
  "category": "org-vistrails-climatepipes-simplified",
  "container": {
   "fields": [],
   "terminals": [
    {
     "direction": [
      0,
      -1
     ],
     "name": "query",
     "offsetPosition": {
      "top": -15,
      "left": 160.0
     },
     "ddConfig": {
      "type": "i(org.vistrails.climatepipes:cpQuery)",
      "allowedTypes": [
       "o(org.vistrails.climatepipes:cpQuery)"
      ]
     }
    }
   ],
   "vt": {
    "cache": 1,
    "namespace": "",
    "version": "0.0.1",
    "package": "org.vistrails.climatepipes.simplified"
   },
   "xtype": "climatePipes.Container",
   "icon": "wireit/res/icons/application_edit.png"
  },
  "name": "DownloadCSV"
 }
];
