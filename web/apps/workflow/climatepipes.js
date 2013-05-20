var vt_modules = [];

if (typeof cpsimplified_modules == 'object') {
  vt_modules = vt_modules.concat(cpsimplified_modules);
}

if (typeof basic_modules == 'object') {
  vt_modules = vt_modules.concat(basic_modules);
}

if (typeof esgf_modules == 'object') {
  vt_modules = vt_modules.concat(esgf_modules);
}

if (typeof climatepipes_modules == 'object') {
  vt_modules = vt_modules.concat(climatepipes_modules);
}

if (typeof http_modules == 'object') {
  vt_modules = vt_modules.concat(http_modules);
}

function manageError(error) {
  // Some message
  climatePipes.busy.hide();
  alert(error);
  return true; // Propagate the error
}

var locationList = ["World", "Asia", "Africa", "North America", "South America",
  "Antarctica", "Europe", "Australia",
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

var listView = {};

var climatePipes = {

  language: {

    languageName: "climatePipes",

    // inputEx fields for pipes properties
    propertiesFields: [
      // default fields (the "name" field is required by the WiringEditor)
      {"type": "string", inputParams: {"name": "name", label: "Title", typeInvite: "Enter a title" } },
      {"type": "text", inputParams: {"name": "description", label: "Description", cols: 30} },

      // Additional fields
      {"type": "boolean", inputParams: {"name": "isTest", value: true, label: "Test"}},
      {"type": "select", inputParams: {"name": "category", label: "Category", selectValues: ["Demo", "Test", "Other"]} }
    ],

    layoutOptions: {
      units: [
        { position: 'top', height: 50, body: 'top'},
        { position: 'left', width: 200, resize: true, body: 'left-all', gutter: '5px', collapse: true,
          collapseSize: 25, header: 'Modules', scroll: true, animate: true },
        { position: 'center', body: 'center-all', gutter: '5px' },
        { header: 'Results', position: 'right', width: 600, resize: true, body: 'right-all', gutter: '5px', collapse: true,
          collapseSize: 25, /*header: 'Properties', scroll: true,*/ animate: true }
      ]
    },
    // List of node types definition
    modules: vt_modules
  },
  /**
   * @method init
   * @static
   */
  init: function () {

    // Configure the adapter backend url :
    // we're not using a backend adapter atm, but wireit complains if you don't set this
    WireIt.WiringEditor.adapters.JsonRpc.config.url = "../../../editor/backend/php/WiringEditor.php";

    this.editor = new climatePipes.WiringEditor(this.language);

    // add listener for right panel resizing to manually resize maps and data table
    this.editor.layout.getUnitByPosition("right").subscribe("widthChange", this.resizeMapAndTable);

    // Open the infos panel
    this.editor.accordionView.openPanel(2);

    // init busy modal
    this.busy = busyWait();

  },

  resizeMapAndTable: function (event) {
    if (resultMap)
      google.maps.event.trigger(resultMap, "resize");

    if (listView.hasOwnProperty('dataTable') && typeof listView.dataTable != "undefined") {
      var newVal = event.newValue;
      if (newVal == 0)
        newVal = this.editor.layout.getUnitByPosition("right").getSizes().body.w;
      var diff = newVal - listView.dataTable.getTableEl().offsetWidth;

      var urlCol = listView.dataTable.getColumn("url");

      if (listView.defaultUrlWidth == 0)
        listView.defualtUrlWidth = urlCol.getThEl().offsetWidth;

      if (urlCol.getThEl().offsetWidth + diff < listView.defaultUrlWidth)
        urlCol.getThEl().style.width = listView.defaultUrlWidth + "px";
      else
        urlCol.getThEl().style.width = urlCol.getThEl().offsetWidth + diff + "px";
    }

  },

  /**
   * Execute the module in the "ExecutionFrame" virtual machine
   * @method run
   * @static
   */
  run: function (message) {
    message = typeof message !== 'undefined' ? message : "Executing Pipeline...";
    this.busy.setFooter(message);
    this.busy.show();

    var jsonObject = this.editor.getValue();
    var workflowxml = json2workflowxml(jsonObject.working);

    var resultmap = document.getElementById("result-map");
    var resultlist = document.getElementById("result-list");

    var serverUrl = "/PWService";
    var paraview = new Paraview(serverUrl);
    paraview.errorListener = window;
    paraview.createSession("ClimatePipes", "Executing Vistrails Workflow...", "default");
    var vtPlugin = paraview.getPlugin("vt_plugin");
    vtPlugin.Asyncexecute(function (result) {
      resultmap.innerHTML = '';
      var resultArr = result.split("\n");
      if (resultArr[0] == "Content-Type: text/plain" ||
        resultArr[0] == "Content-Type: text/html") {
        resultmap.innerHTML = resultArr.slice(1).join("\n");
      } else if (resultArr[0] == "Content-Type: image/png" ||
        resultArr[0] == "Content-Type: image/jpg") {
        overlayImage(resultArr[1]);
        //resultmap.innerHTML = "<img src=\"" + resultArr[1] + "\">";
      } else if (resultArr[0] == "Content-Type: application/json") {
        var files = YAHOO.lang.JSON.parse(resultArr[1]);
        for (var i = 0; i < files.length; ++i) {
          if (files[i].var.length > 0)
            files[i].Variable = files[i].var[0].short_name;
          else
            files[i].Variable = 'unknown';
          files[i].Id = i;
          files[i].Visualize = "Visualize"; //placeholder for the button
          files[i].DownloadCSV = "DownloadCSV"; //placeholder for the button
        }
        resultlist.innerHTML = '<div id="listViewTable"></div>';
        listView.Data = files;
        BuildDataTable();
        climatePipes.resizeMapAndTable({newValue: 0});
      } else if (resultArr[0] == "Content-Type: text/csv") {
        startCSVDownload(resultArr[1]);
      }
      paraview.disconnect();
      climatePipes.busy.hide();
    }, workflowxml);
  },

  xml: function () {
    myPanel = new YAHOO.widget.Panel("exportWindow", {
      width: "1000px",
      height: "800px",
      modal: true,
      fixedcenter: true,
      constraintoviewport: true,
      close: true,
      draggable: true});

    //.replace(/},{/g, "},\n{");
    var jsonObject = this.editor.getValue();
    var workflowxml = json2workflowxml(jsonObject.working);
    var jsonString = YAHOO.lang.JSON.stringify(jsonObject);
    myPanel.setHeader("XML Workflow");
    myPanel.setBody("<div style='overflow:auto;text-align:left;'><pre>" + workflowxml.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</pre></div>");
    myPanel.setFooter("<div style='overflow:auto;'>" + jsonString + "</div>");
    myPanel.render(document.body);
    myPanel.show();
  },

  getModuleConfig: function (name) {
    for (var i = 0; i < this.language.modules.length; i++)
      if (this.language.modules[i].name == name) {
        var config = this.language.modules[i].container;
        config.title = name;
        return config;
      }

    return {};
  },

  wire0_1_source_source: {"src": {"moduleId": 0, "terminal": "source"}, "tgt": {"moduleId": 1, "terminal": "source"}},
  wire1_2_query_query: {"src": {"moduleId": 1, "terminal": "query"}, "tgt": {"moduleId": 2, "terminal": "query"}},


  createVisualizePipeline: function (url, vari) {
    this.clear();

    var dataFile = this.getModuleConfig("DataFile"),
      esgfSource = this.getModuleConfig("ESGFSource"),
      visualize = this.getModuleConfig("Visualize");

    esgfSource.position = [20, 20];
    dataFile.position = [40, 160];
    visualize.position = [60, 260];

    dataFile.fields[0].inputParams.value = url;
    dataFile.fields[1].inputParams.value = vari;

    this.editor.layer.addContainer(esgfSource);
    this.editor.layer.addContainer(dataFile);
    this.editor.layer.addContainer(visualize);

    this.editor.layer.addWire(this.wire0_1_source_source);
    this.editor.layer.addWire(this.wire1_2_query_query);

    this.run();
  },

  createDownloadCSVPipeline: function (url, vari) {
    this.clear();

    var dataFile = this.getModuleConfig("DataFile"),
      esgfSource = this.getModuleConfig("ESGFSource"),
      download = this.getModuleConfig("DownloadCSV");

    esgfSource.position = [20, 20];
    dataFile.position = [40, 160];
    download.position = [60, 260];

    dataFile.fields[0].inputParams.value = url;
    dataFile.fields[1].inputParams.value = vari;

    this.editor.layer.addContainer(esgfSource);
    this.editor.layer.addContainer(dataFile);
    this.editor.layer.addContainer(download);

    this.editor.layer.addWire(this.wire0_1_source_source);
    this.editor.layer.addWire(this.wire1_2_query_query);

    this.run();
  },

  googleMapSubmit: function () {
    //determine which source to use
    var elSource = document.getElementById("selectSource");
    var source = elSource.options[elSource.selectedIndex].text;

    var keywords = document.getElementById("search_text_input").value;
    var from = document.getElementById("date1").value;
    var to = document.getElementById("date2").value;
    var location = document.getElementById("bounds").value;
    var numitems = document.getElementById("numitems").value;

    if (keywords == 'Keywords') keywords = '';
    if (from == 'From (mm-dd-yy)') from = '';
    if (to == 'To (mm-dd-yy)') to = '';
    if (location == 'Region (minLat,maxLat,minLng,maxLng)') location = '';
    if (numitems == '# of Items') numitems = 1;

    //determine which view to use
    var elView = document.getElementById("selectView");
    var view = elView.options[elView.selectedIndex].text;

    this.createQueryPipeline(source, keywords, from, to, location, numitems, view);
  },

  createQueryPipeline: function (source, keywords, from, to, location, numitems, view) {
    this.clear();

    var sourceConfig = this.getModuleConfig(source),
      query = this.getModuleConfig("Query"),
      viewConfig = this.getModuleConfig(view);

    sourceConfig.position = [20, 20];
    query.position = [40, 160];
    viewConfig.position = [60, 320];

    query.fields[0].inputParams.value = keywords;
    query.fields[1].inputParams.value = from;
    query.fields[2].inputParams.value = to;
    query.fields[3].inputParams.value = location;
    query.fields[4].inputParams.value = numitems;

    this.editor.layer.addContainer(sourceConfig);
    this.editor.layer.addContainer(query);
    this.editor.layer.addContainer(viewConfig);

    this.editor.layer.addWire(this.wire0_1_source_source);
    this.editor.layer.addWire(this.wire1_2_query_query);

    this.run();
  },

  clear: function () {
    this.editor.layer.clear();
  },

  testing: function () {
    /* Test busy modal  */
    // this.busy.show();

    /* Testing module and wire creation */
    this.clear();

    var sourceConfig = this.getModuleConfig('KitwareSource'),
      query = this.getModuleConfig("Query"),
      viewConfig = this.getModuleConfig('Visualize');

    sourceConfig.position = [20, 20];
    query.position = [40, 160];
    viewConfig.position = [60, 320];

    query.fields[0].inputParams.value = 'keywords';
    query.fields[1].inputParams.value = 'from';
    query.fields[2].inputParams.value = 'to';
    query.fields[3].inputParams.value = 'location';
    query.fields[4].inputParams.value = 'numitems';

    this.editor.layer.addContainer(sourceConfig);
    this.editor.layer.addContainer(query);
    this.editor.layer.addContainer(viewConfig);

    this.editor.layer.addWire(this.wire0_1_source_source);
    this.editor.layer.addWire(this.wire1_2_query_query);

    /* Testing List View */
    var resultsPanel = document.getElementById("result-list");
    resultsPanel.innerHTML = '<div id="listViewTable"></div>';
    var testData =
    {'url': 'http://www.google.com/extremelylongandincrediblyuselessfilenamefile.nc',
      'var': [
        {'rank': 1.0, 'name': 'North Atlantic Draft', 'short_name': 'nad'},
        {'rank': 1.2, 'name': 'South Atlantic Draft', 'short_name': 'sad'}
      ],
      'rank': 1.5,
      'Variable': 'nad',
      'Id': 0,
      'Visualize': 'Visualize',
      'DownloadCSV': 'DownloadCSV',
      'randomotherthing': 'withval'};

    listView.Data = [];
    for (var i = 0; i < 25; i++)
      listView.Data.push(testData);

    listView.varOptions = [
      [
        {label: 'Lable1', value: 'val1'},
        {label: 'Lable2', value: 'val2'},
        {label: 'Lable3', value: 'val3'}
      ]
    ];
    BuildDataTable();
    this.resizeMapAndTable({newValue: this.editor.layout.getUnitByPosition("right").getSizes().body.w});

    overlayImage('tmp/vt_cff77b203877472aa85c86d5987ccc07.png');
  },

  testDownload: function () {

    //generate a hidden iframe and make it download the returned URL
    var iframe = document.createElement("iframe");
    iframe.src = 'tmp/test.csv';
    iframe.style.display = "none";
    document.body.appendChild(iframe);
  }
};

/**
 * The wiring editor is overriden to add a button "RUN" to the control bar
 */
climatePipes.WiringEditor = function (options) {
  climatePipes.WiringEditor.superclass.constructor.call(this, options);
};

YAHOO.lang.extend(climatePipes.WiringEditor, WireIt.WiringEditor, {
  /**
   * Add the "run" button
   */
  renderButtons: function () {
    // render defualt buttons
    // climatePipes.WiringEditor.superclass.renderButtons.call(this);

    // Add the run button to the toolbar
    var toolbar = YAHOO.util.Dom.get('toolbar');
    var runButton = new YAHOO.widget.Button({ label: "Run", id: "WiringEditor-runButton", container: toolbar });
    runButton.on("click", climatePipes.run, climatePipes, true);
    var xmlButton = new YAHOO.widget.Button({ label: "XML", id: "WiringEditor-xmlButton", container: toolbar });
    xmlButton.on("click", climatePipes.xml, climatePipes, true);
    var clrButton = new YAHOO.widget.Button({ label: "Clear", id: "WiringEditor-clrButton", container: toolbar });
    clrButton.on("click", climatePipes.clear, climatePipes, true);
    // var tstButton = new YAHOO.widget.Button({ label:"TestDataTableMap", id:"WiringEditor-tstButton", container: toolbar });
    // tstButton.on("click", climatePipes.testing, climatePipes, true);
    // var tstDownload = new YAHOO.widget.Button({ label:"TestDownload", id:"WiringEditor-dnlButton", container: toolbar });
    // tstDownload.on("click", climatePipes.testDownload, climatePipes, true);
  }
});


//our custom container to include extra data in the exported config
climatePipes.Container = function (options, layer) {
  climatePipes.Container.superclass.constructor.call(this, options, layer);
};

YAHOO.extend(climatePipes.Container, WireIt.FormContainer, {

  /**
   * @method setOptions
   */
  setOptions: function (options) {
    climatePipes.Container.superclass.setOptions.call(this, options);

    this.options.vt = options.vt;
  },


  getConfig: function () {
    var obj = climatePipes.Container.superclass.getConfig.call(this);
    obj.sig = {};
    obj.params = {};
    obj.fields = [];
    obj.terminals = this.options.terminals;

    //add signature info
    for (var i in this.options.terminals) {
      obj.sig[this.options.terminals[i].name] = this.options.terminals[i].ddConfig.type;
    }

    //add parameter info
    for (var j in this.options.fields) {
      var field = this.options.fields[j];
      obj.params[field.inputParams.name] = [field.alias, field.vtype];
      obj.fields.push(field);
      obj.fields[j].inputParams.container = null; // prevent infinite loop
    }

    //add vistrails info
    obj.vt = this.options.vt;

    return obj;
  }
});

var resultMap;

function initResultMap() {
  var latlng = new google.maps.LatLng(43, -89);
  var settings = {
    zoom: 4,
    center: latlng,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
    },
    navigationControl: true,
    navigationControlOptions: {
      style: google.maps.NavigationControlStyle.SMALL
    },
    mapTypeId: google.maps.MapTypeId.SATELLITE
  };

  var resultMapElem = $("#result-map");
  //document.getElementById("result-map").style.height='100%';
  //document.getElementById("result-map").style.width='100%';
  resultMap = new google.maps.Map(resultMapElem[0], settings);
}


function overlayImage(filename) {
  alert(window.location.pathname.split('/'));

  initResultMap();

  // \NOTE Hard coded bounds for now
  var imageBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(-89.9999, -179.9999),
    new google.maps.LatLng(89.9999, 179.9999));

  // \NOTE Hard coded base URL for now
  var imageUrl = 'http://localhost:8080' + '/' + filename;
  // \TODO Remove later
  alert(imageUrl);
  var myOverlay = new google.maps.GroundOverlay(filename, imageBounds);
  myOverlay.setMap(resultMap);
}

// YUI DataTable definition
function BuildDataTable() {
  // Define a custom formatter for the cdms variable column
  listView.variableDropdown = function (elLiner, oRecord, oColumn, oData) {
    var idx = oRecord.getData("Id");
    var opts = [];

    // create dropdown options from cdms variables
    for (var j = 0; j < listView.Data[idx].var.length; j++) {
      var option = {"value": listView.Data[idx].var[j].short_name,
        "label": listView.Data[idx].var[j].name};
      opts.push(option);
    }

    if (opts.length > 0) {
      oColumn.dropdownOptions = opts;
      YAHOO.widget.DataTable.formatDropdown(elLiner, oRecord, oColumn, oData);
    } else {
      elLiner.innerHTML = 'unknown'; //only get here if file had no variables
    }
  };

  // Add the custom formatter to the shortcuts
  YAHOO.widget.DataTable.Formatter.variableDD = listView.variableDropdown;

  // Override the built-in link formatter to just show the filename
  YAHOO.widget.DataTable.formatLink = function (elLiner, oRecord, oColumn, oData) {
    elLiner.innerHTML = '<a href="' + oData + '">' + oData.replace(/^.*[\\\/]/, '') + '</a>';
  };

  var columnDefs =
    [
      {key: "Id", formatter: "number", resizeable: true},
      {key: "url", label: "Filename", formatter: YAHOO.widget.DataTable.formatLink, resizeable: true},
      {key: "Variable", formatter: "variableDD", resizeable: true},
      {key: "Visualize", formatter: YAHOO.widget.DataTable.formatButton, resizeable: true},
      {key: "DownloadCSV", label: "DownloadCSV", formatter: YAHOO.widget.DataTable.formatButton, resizeable: true}
    ];

  listView.dataSource = new YAHOO.util.DataSource(listView.Data);
  listView.dataSource.responseType = YAHOO.util.DataSource.TYPE_JSARRAY;
  listView.dataSource.responseSchema = {
    fields: ['Id', 'url', 'Variable', 'Visualize', 'DownloadCSV']
  };

  listView.dataTable = new YAHOO.widget.DataTable("listViewTable", columnDefs, listView.dataSource);

  listView.dataTable.subscribe("buttonClickEvent", function (oArgs) {
    var oRec = this.getRecord(oArgs.target);
    var url = oRec.getData("url");
    var vari = oRec.getData("Variable");
    if (oArgs.target.innerText == "Visualize")
      climatePipes.createVisualizePipeline(url, vari);
    if (oArgs.target.innerText == "DownloadCSV")
      climatePipes.createDownloadCSVPipeline(url, vari);

  });

  var variableDropDownChanged = function (evt) {
    var tar = YAHOO.util.Event.getTarget(evt);
    var oRec = listView.dataTable.getRecord(tar);
    oRec.setData("Variable", tar.value);
  };

  // add a listener to drop down changed on table
  YAHOO.util.Event.delegate(listView.dataTable.getTbodyEl(), "change", variableDropDownChanged, "select");

  listView.defaultUrlWidth = 0;
};

function json2workflowxml(json, newLine, indent) {
  // default params
  newLine = typeof newLine !== 'undefined' ? newLine : '\n';
  indent = typeof indent !== 'undefined' ? indent : '  ';

  var result = "<workflow id=\"0\" name=\"ClimatePipes\" version=\"1.0.2"
    + "\" vistrail_id=\"\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance"
    + "\" xsi:schemaLocation=\"http://www.vistrails.org/workflow.xsd\">" + newLine;

  var j = 0;
  for (var i = 0; i < json.wires.length; i += 1) {
    var src = json.wires[i].src;
    var tgt = json.wires[i].tgt;
    if (json.modules[src.moduleId].config.sig[src.terminal][0] == 'i') {
      var tmp = src;
      src = tgt;
      tgt = tmp;
    }
    result += indent + "<connection id=\"" + i + "\">" + newLine;
    result += indent + indent + "<port id=\"" + j + "\" moduleId=\"" + src.moduleId
      + "\" moduleName=\"" + json.modules[src.moduleId].name
      + "\" name=\"" + src.terminal + "\" type=\"source"
      + "\" signature=\"" + json.modules[src.moduleId].config.sig[src.terminal].substr(1)
      + "\" />" + newLine;
    result += indent + indent + "<port id=\"" + (j + 1) + "\" moduleId=\"" + tgt.moduleId
      + "\" moduleName=\"" + json.modules[tgt.moduleId].name
      + "\" name=\"" + tgt.terminal + "\" type=\"destination"
      + "\" signature=\"" + json.modules[tgt.moduleId].config.sig[tgt.terminal].substr(1)
      + "\" />" + newLine;
    result += indent + "</connection>" + newLine;
    j += 2;
  }

  var fid = 0;
  var pid = 0;
  for (var i = 0; i < json.modules.length; i += 1) {
    var con = json.modules[i];
    var pos = con.config.position;

    result += indent + "<module cache=\"" + con.config.vt.cache + "\" id=\"" + i + "\" name=\"" + con.name
      + "\" namespace=\"" + con.config.vt.namespace + "\" package=\"" + con.config.vt.package
      + "\" version=\"" + con.config.vt.version + "\">" + newLine;
    result += indent + indent + "<location id=\"" + i + "\" x=\"" + pos[0]
      + "\" y=\"-" + pos[1] + "\" />" + newLine;
    if (con.config.hasOwnProperty('params') && typeof con.config.params != "undefined") {
      var fkeys = {};
      for (var key in con.config.params) {
        if (con.value[key].length > 0) {
          var lastBraceIdx = key.lastIndexOf("[");
          if (key.substr(-1) == "]" && lastBraceIdx != -1) {
            var k = key.substr(0, lastBraceIdx);
            var a = key.slice(lastBraceIdx + 1, -1);
            var numkey = parseInt(a) + 1;
            if (k in fkeys) {
              if (fkeys[k] < numkey) {
                fkeys[k] = numkey;
              }
            } else {
              fkeys[k] = numkey;
            }
          } else {
            fkeys[key] = 1;
          }
        }
      }
      for (var k in fkeys) {
        result += indent + indent + "<function id=\"" + fid + "\" name=\"" + k
          + "\" pos=\"" + fid + "\">" + newLine;
        for (var j = 0; j < fkeys[k]; j += 1) {
          if (fkeys[k] <= 1) {
            key = k;
          } else {
            key = k + "[" + j + "]";
          }
          result += indent + indent + indent + "<parameter alias=\"" + con.config.params[key][0]
            + "\" id=\"" + pid
            + "\" name=\"&lt;nodescription&gt;\" pos=\"" + j
            + "\" type=\"" + con.config.params[key][1]
            + "\" val=\"" + con.value[key].replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;') + "\" />" + newLine;
          pid += 1;
        }
        result += indent + indent + "</function>" + newLine;
        fid += 1;
      }
    }

    result += indent + "</module>" + newLine;
  }
  result += "</workflow>" + newLine;
  return result;
}

function startCSVDownload(url) {
  //generate a hidden iframe and make it download the returned URL
  var iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.style.display = "none";
  document.body.appendChild(iframe);
}

function busyWait() {
  modalDialog = new YAHOO.widget.SimpleDialog(
    "Please wait...",
    {  width: "300px",
      fixedcenter: true,
      modal: true,
      visible: false,
      draggable: true,
      close: false,
      icon: null,
      constraintoviewport: true,
      buttons: []
    }
  );
  modalDialog.setHeader("Please wait...");
  modalDialog.setBody('<div class="busy-wait"></div>');
  modalDialog.render(document.body);
  return modalDialog;
}
