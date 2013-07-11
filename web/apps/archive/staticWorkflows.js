var defaultWorkflow = {
  "workflow": {
    "@name": "untitled",
    "@version": "1.0.3",
    "@{http://www.w3.org/2001/XMLSchema-instance}schemaLocation": "http://www.vistrails.org/workflow.xsd",
    "connection": [{
      "#tail": "\n  ",
      "#text": "\n    ",
      "@id": "0",
      "port": [{
        "@moduleName": "Dataset",
        "@name": "self",
        "#tail": "\n    ",
        "@signature": "(org.opengeoscience.geoweb.climate:Dataset)",
        "@id": "4",
        "@type": "source",
        "@moduleId": "1"
      }, {
        "@moduleName": "Variable",
        "@name": "dataset",
        "#tail": "\n  ",
        "@signature": "(org.opengeoscience.geoweb.climate:Dataset)",
        "@id": "5",
        "@type": "destination",
        "@moduleId": "2"
      }]
    }, {
      "#tail": "\n  ",
      "#text": "\n    ",
      "@id": "3",
      "port": [{
        "@moduleName": "Variable",
        "@name": "self",
        "#tail": "\n    ",
        "@signature": "(org.opengeoscience.geoweb.climate:Variable)",
        "@id": "6",
        "@type": "source",
        "@moduleId": "2"
      }, {
        "@moduleName": "WriteJSON",
        "@name": "tvariable",
        "#tail": "\n  ",
        "@signature": "(org.opengeoscience.geoweb.climate:TransientVariable)",
        "@id": "9",
        "@type": "destination",
        "@moduleId": "5"
      }]
    }],
    "module": [{
      "function": {
        "@name": "file",
        "#tail": "\n  ",
        "@id": "8",
        "@pos": "0",
        "#text": "\n      ",
        "parameter": {
          "@val": "/Users/benbu/Downloads/clt.nc",
          "@name": "<no description>",
          "#tail": "\n    ",
          "@pos": "0",
          "@alias": "",
          "@id": "9",
          "@type": "org.vistrails.vistrails.basic:String"
        }
      },
      "@name": "Dataset",
      "@package": "org.opengeoscience.geoweb.climate",
      "@version": "0.9.0",
      "@namespace": "",
      "#tail": "\n  ",
      "@cache": "1",
      "location": {
        "#tail": "\n    ",
        "@x": 206.59877574990003,
        "@y": -226.700762591,
        "@id": "23"
      },
      "#text": "\n    ",
      "@id": "1"
    }, {
      "function": {
        "@name": "name",
        "#tail": "\n  ",
        "@id": "7",
        "@pos": "0",
        "#text": "\n      ",
        "parameter": {
          "@val": "clt",
          "@name": "<no description>",
          "#tail": "\n    ",
          "@pos": "0",
          "@alias": "",
          "@id": "8",
          "@type": "org.vistrails.vistrails.basic:String"
        }
      },
      "@name": "Variable",
      "@package": "org.opengeoscience.geoweb.climate",
      "@version": "0.9.0",
      "@namespace": "",
      "#tail": "\n  ",
      "@cache": "1",
      "location": {
        "#tail": "\n    ",
        "@x": 581.5987757499,
        "@y": -191.700762591,
        "@id": "24"
      },
      "#text": "\n    ",
      "@id": "2"
    }, {
      "function": {
        "@name": "filename",
        "#tail": "\n  ",
        "@id": "1",
        "@pos": "0",
        "#text": "\n      ",
        "parameter": {
          "@val": "/Users/benbu/test/outjson.js",
          "@name": "<no description>",
          "#tail": "\n    ",
          "@pos": "0",
          "@alias": "",
          "@id": "11",
          "@type": "org.vistrails.vistrails.basic:String"
        }
      },
      "@name": "WriteJSON",
      "@package": "org.opengeoscience.geoweb.climate",
      "@version": "0.9.0",
      "@namespace": "",
      "#tail": "\n",
      "@cache": "1",
      "location": {
        "#tail": "\n    ",
        "@x": 919.5987757499001,
        "@y": -194.700762591,
        "@id": "27"
      },
      "#text": "\n    ",
      "@id": "5"
    }],
    "@vistrail_id": "",
    "#text": "\n  ",
    "@id": "0"
  }
};

var tenyearavg = {
  "workflow": {
    "@name": "untitled",
    "@version": "1.0.3",
    "@{http://www.w3.org/2001/XMLSchema-instance}schemaLocation": "http://www.vistrails.org/workflow.xsd",
    "connection": [{
      "#tail": "\n  ",
      "#text": "\n    ",
      "@id": "0",
      "port": [{
        "@moduleName": "SubSelect",
        "@name": "tvariable",
        "#tail": "\n    ",
        "@signature": "(org.opengeoscience.geoweb.climate:TransientVariable)",
        "@id": "0",
        "@type": "source",
        "@moduleId": "3"
      }, {
        "@moduleName": "MonthlyTimeBounds",
        "@name": "tvariable",
        "#tail": "\n  ",
        "@signature": "(org.opengeoscience.geoweb.climate:TransientVariable)",
        "@id": "1",
        "@type": "destination",
        "@moduleId": "4"
      }]
    }, {
      "#tail": "\n  ",
      "#text": "\n    ",
      "@id": "1",
      "port": [{
        "@moduleName": "MonthlyTimeBounds",
        "@name": "tvariable",
        "#tail": "\n    ",
        "@signature": "(org.opengeoscience.geoweb.climate:TransientVariable)",
        "@id": "2",
        "@type": "source",
        "@moduleId": "4"
      }, {
        "@moduleName": "Average",
        "@name": "tvariable",
        "#tail": "\n  ",
        "@signature": "(org.opengeoscience.geoweb.climate:TransientVariable)",
        "@id": "3",
        "@type": "destination",
        "@moduleId": "0"
      }]
    }, {
      "#tail": "\n  ",
      "#text": "\n    ",
      "@id": "2",
      "port": [{
        "@moduleName": "Dataset",
        "@name": "self",
        "#tail": "\n    ",
        "@signature": "(org.opengeoscience.geoweb.climate:Dataset)",
        "@id": "4",
        "@type": "source",
        "@moduleId": "1"
      }, {
        "@moduleName": "Variable",
        "@name": "dataset",
        "#tail": "\n  ",
        "@signature": "(org.opengeoscience.geoweb.climate:Dataset)",
        "@id": "5",
        "@type": "destination",
        "@moduleId": "2"
      }]
    }, {
      "#tail": "\n  ",
      "#text": "\n    ",
      "@id": "3",
      "port": [{
        "@moduleName": "Variable",
        "@name": "self",
        "#tail": "\n    ",
        "@signature": "(org.opengeoscience.geoweb.climate:Variable)",
        "@id": "6",
        "@type": "source",
        "@moduleId": "2"
      }, {
        "@moduleName": "SubSelect",
        "@name": "variable",
        "#tail": "\n  ",
        "@signature": "(org.opengeoscience.geoweb.climate:Variable)",
        "@id": "7",
        "@type": "destination",
        "@moduleId": "3"
      }]
    }, {
      "#tail": "\n  ",
      "#text": "\n    ",
      "@id": "4",
      "port": [{
        "@moduleName": "Average",
        "@name": "tvariable",
        "#tail": "\n    ",
        "@signature": "(org.opengeoscience.geoweb.climate:TransientVariable)",
        "@id": "8",
        "@type": "source",
        "@moduleId": "0"
      }, {
        "@moduleName": "WriteJSON",
        "@name": "tvariable",
        "#tail": "\n  ",
        "@signature": "(org.opengeoscience.geoweb.climate:TransientVariable)",
        "@id": "9",
        "@type": "destination",
        "@moduleId": "5"
      }]
    }],
    "module": [{
      "function": {
        "@name": "axis",
        "#tail": "\n  ",
        "@id": "2",
        "@pos": "0",
        "#text": "\n      ",
        "parameter": {
          "@val": "t",
          "@name": "<no description>",
          "#tail": "\n    ",
          "@pos": "0",
          "@alias": "",
          "@id": "2",
          "@type": "org.vistrails.vistrails.basic:String"
        }
      },
      "@name": "Average",
      "@package": "org.opengeoscience.geoweb.climate",
      "@version": "0.9.0",
      "@namespace": "",
      "#tail": "\n  ",
      "@cache": "1",
      "location": {
        "#tail": "\n    ",
        "@x": "95.5987757499",
        "@y": "-150.700762591",
        "@id": "22"
      },
      "#text": "\n    ",
      "@id": "0"
    }, {
      "function": {
        "@name": "file",
        "#tail": "\n  ",
        "@id": "8",
        "@pos": "0",
        "#text": "\n      ",
        "parameter": {
          "@val": "/Users/benbu/Downloads/clt.nc",
          "@name": "<no description>",
          "#tail": "\n    ",
          "@pos": "0",
          "@alias": "",
          "@id": "9",
          "@type": "org.vistrails.vistrails.basic:String"
        }
      },
      "@name": "Dataset",
      "@package": "org.opengeoscience.geoweb.climate",
      "@version": "0.9.0",
      "@namespace": "",
      "#tail": "\n  ",
      "@cache": "1",
      "location": {
        "#tail": "\n    ",
        "@x": "95.5987757499",
        "@y": "265.299237409",
        "@id": "23"
      },
      "#text": "\n    ",
      "@id": "1"
    }, {
      "function": {
        "@name": "name",
        "#tail": "\n  ",
        "@id": "7",
        "@pos": "0",
        "#text": "\n      ",
        "parameter": {
          "@val": "clt",
          "@name": "<no description>",
          "#tail": "\n    ",
          "@pos": "0",
          "@alias": "",
          "@id": "8",
          "@type": "org.vistrails.vistrails.basic:String"
        }
      },
      "@name": "Variable",
      "@package": "org.opengeoscience.geoweb.climate",
      "@version": "0.9.0",
      "@namespace": "",
      "#tail": "\n  ",
      "@cache": "1",
      "location": {
        "#tail": "\n    ",
        "@x": "95.5987757499",
        "@y": "161.299237409",
        "@id": "24"
      },
      "#text": "\n    ",
      "@id": "2"
    }, {
      "function": [{
        "@name": "axis",
        "#tail": "\n    ",
        "@id": "3",
        "@pos": "0",
        "#text": "\n      ",
        "parameter": {
          "@val": "time",
          "@name": "<no description>",
          "#tail": "\n    ",
          "@pos": "0",
          "@alias": "",
          "@id": "3",
          "@type": "org.vistrails.vistrails.basic:String"
        }
      }, {
        "@name": "end",
        "#tail": "\n    ",
        "@id": "5",
        "@pos": "1",
        "#text": "\n      ",
        "parameter": {
          "@val": "1990-1",
          "@name": "<no description>",
          "#tail": "\n    ",
          "@pos": "0",
          "@alias": "",
          "@id": "7",
          "@type": "org.vistrails.vistrails.basic:String"
        }
      }, {
        "@name": "start",
        "#tail": "\n  ",
        "@id": "6",
        "@pos": "2",
        "#text": "\n      ",
        "parameter": {
          "@val": "1980-1",
          "@name": "<no description>",
          "#tail": "\n    ",
          "@pos": "0",
          "@alias": "",
          "@id": "6",
          "@type": "org.vistrails.vistrails.basic:String"
        }
      }],
      "@name": "SubSelect",
      "@package": "org.opengeoscience.geoweb.climate",
      "@version": "0.9.0",
      "@namespace": "",
      "#tail": "\n  ",
      "@cache": "1",
      "location": {
        "#tail": "\n    ",
        "@x": "95.5987757499",
        "@y": "57.2992374095",
        "@id": "25"
      },
      "#text": "\n    ",
      "@id": "3"
    }, {
      "@name": "MonthlyTimeBounds",
      "@package": "org.opengeoscience.geoweb.climate",
      "@version": "0.9.0",
      "@namespace": "",
      "#tail": "\n  ",
      "@cache": "1",
      "location": {
        "#tail": "\n  ",
        "@x": "95.5987757499",
        "@y": "-46.7007625905",
        "@id": "26"
      },
      "#text": "\n    ",
      "@id": "4"
    }, {
      "function": {
        "@name": "filename",
        "#tail": "\n  ",
        "@id": "1",
        "@pos": "0",
        "#text": "\n      ",
        "parameter": {
          "@val": "/Users/benbu/test/outjson.js",
          "@name": "<no description>",
          "#tail": "\n    ",
          "@pos": "0",
          "@alias": "",
          "@id": "11",
          "@type": "org.vistrails.vistrails.basic:String"
        }
      },
      "@name": "WriteJSON",
      "@package": "org.opengeoscience.geoweb.climate",
      "@version": "0.9.0",
      "@namespace": "",
      "#tail": "\n",
      "@cache": "1",
      "location": {
        "#tail": "\n    ",
        "@x": "95.5987757499",
        "@y": "-254.700762591",
        "@id": "27"
      },
      "#text": "\n    ",
      "@id": "5"
    }],
    "@vistrail_id": "",
    "#text": "\n  ",
    "@id": "0"
  }
};