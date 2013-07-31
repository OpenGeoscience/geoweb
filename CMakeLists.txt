cmake_minimum_required(VERSION 2.8)
project(geoweb)

option(DEV_BUILD "Allow running from source tree" OFF)

set(STATICDIR_ROOT "geoweb.current_dir")

if (DEV_BUILD)
  set(STATICDIR_ROOT "\\\"${CMAKE_SOURCE_DIR}\\\"")
endif()

# Extend cmake module path.
list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake")

# Cache variables.
set(DEPLOY_TEST_SERVICES OFF CACHE BOOL "Deploy the \"testing\" web service modules.")
set(SERVER_HOSTNAME localhost CACHE STRING "The hostname of the machine that will run the server.")
set(SERVER_PORT 8080 CACHE STRING "The port the server will run on.")
set(MINIFY ON CACHE BOOL "Minify the JavaScript files prior to concatenating.")
set(MANGLE ON CACHE BOOL "When minifying, also mangle non-public symbol names.")
set(DOCUMENT OFF CACHE BOOL "Generate documentation for JavaScript files.")
set(SERVER_LOGS ON CACHE BOOL "Write cherrypy server access and error logs in deploy/logs")
set(SERVER_DEBUG ON CACHE BOOL "Write debug statements to error logs")
set(DATA_ROOT "data" CACHE PATH "Root directory for the data")

# Non-cache variables.
set(deploy_dir deploy)
set_directory_properties(PROPERTIES ADDITIONAL_MAKE_CLEAN_FILES ${deploy_dir})

# Find JSLint.
find_package(JSLint)

# Find UglifyJS.
find_package(UglifyJS)

# Find JSDuck.
if (DOCUMENT)
  find_package(JSDuck)
endif()

# Find a Python2 interpreter.
find_package(PythonInterp 2.6)

# Create a "stamps" directory for storing fake targets for custom commands.
file(MAKE_DIRECTORY ${CMAKE_BINARY_DIR}/stamps)

# These files should be validated with JSLint.
set(JS_LINT_FILES
    ${CMAKE_SOURCE_DIR}/web/lib/ui/init.js
    ${CMAKE_SOURCE_DIR}/web/lib/ui/gis.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/init.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/latlng.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/ellipsoid.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/mercator.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/command.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/layer.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/featureLayer.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/openStreetMapLayer.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/featureCollection.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/updateRequest.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/prepareForRenderRequest.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/mapInteractorStyle.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/layerSource.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/archiveLayerSource.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/map.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/feature.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/geoTransform.js
    ${CMAKE_SOURCE_DIR}/web/lib/geo/data.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/boundingObject.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/camera.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/geojsonReader.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/data.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/geomData.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/groupNode.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/init.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/timestamp.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/mapper.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/groupMapper.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/materialAttribute.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/blend.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/freezeObject.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/defaultValue.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/material.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/modelViewMatrixStack.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/node.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/object.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/renderer.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/renderWindow.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/interactorStyle.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/trackballInteractorStyle.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/viewer.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/shader.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/shaderProgram.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/texture.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/uniform.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/vertexAttribute.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/visitor.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/vtkUnpack.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/source.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/planeSource.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/pointSource.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/utils.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/command.js
    ${CMAKE_SOURCE_DIR}/web/lib/vgl/picker.js
    ${CMAKE_SOURCE_DIR}/web/lib/srv/init.js
    ${CMAKE_SOURCE_DIR}/web/lib/srv/webSocket.js
    ${CMAKE_SOURCE_DIR}/web/lib/wfl/init.js
    ${CMAKE_SOURCE_DIR}/web/lib/wfl/workflow.js
    ${CMAKE_SOURCE_DIR}/web/lib/wfl/workflowModule.js
    ${CMAKE_SOURCE_DIR}/web/lib/wfl/connection.js
    ${CMAKE_SOURCE_DIR}/web/lib/wfl/port.js
    ${CMAKE_SOURCE_DIR}/web/lib/wfl/geowebRegistry.js
    ${CMAKE_SOURCE_DIR}/web/lib/wfl/inputModule.js
    ${CMAKE_SOURCE_DIR}/web/lib/wfl/inputPort.js
    ${CMAKE_SOURCE_DIR}/web/lib/wfl/outputPort.js
    ${CMAKE_SOURCE_DIR}/web/lib/wfl/staticWorkflows.js
    ${CMAKE_SOURCE_DIR}/web/lib/wfl/workflowStyle.js
    ${CMAKE_SOURCE_DIR}/web/lib/wfl/workflowUtils.js
)

# These files should be uglified and concatenated.
set(JS_UGLIFY_FILES
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/init.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/timestamp.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/object.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/command.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/boundingObject.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/node.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/groupNode.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/actor.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/camera.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/freezeObject.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/defaultValue.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/geojsonReader.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/data.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/geomData.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/mapper.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/groupMapper.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/materialAttribute.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/blend.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/material.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/renderer.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/renderWindow.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/interactorStyle.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/trackballInteractorStyle.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/viewer.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/shader.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/shaderProgram.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/texture.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/uniform.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/vertexAttribute.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/source.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/planeSource.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/pointSource.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/utils.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/vtkUnpack.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/init.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/ellipsoid.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/mercator.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/latlng.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/layer.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/featureLayer.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/openStreetMapLayer.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/featureCollection.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/layerSource.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/archiveLayerSource.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/command.js
  ${CMAKE_SOURCE_DIR}/web/lib/vgl/picker.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/updateRequest.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/prepareForRenderRequest.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/mapInteractorStyle.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/map.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/feature.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/geoTransform.js
  ${CMAKE_SOURCE_DIR}/web/lib/geo/data.js
  ${CMAKE_SOURCE_DIR}/web/lib/ui/init.js
  ${CMAKE_SOURCE_DIR}/web/lib/ui/gis.js
  ${CMAKE_SOURCE_DIR}/web/lib/srv/init.js
  ${CMAKE_SOURCE_DIR}/web/lib/srv/webSocket.js
  ${CMAKE_SOURCE_DIR}/web/lib/wfl/init.js
  ${CMAKE_SOURCE_DIR}/web/lib/wfl/workflow.js
  ${CMAKE_SOURCE_DIR}/web/lib/wfl/workflowModule.js
  ${CMAKE_SOURCE_DIR}/web/lib/wfl/connection.js
  ${CMAKE_SOURCE_DIR}/web/lib/wfl/port.js
  ${CMAKE_SOURCE_DIR}/web/lib/wfl/geowebRegistry.js
  ${CMAKE_SOURCE_DIR}/web/lib/wfl/inputModule.js
  ${CMAKE_SOURCE_DIR}/web/lib/wfl/outputPort.js
  ${CMAKE_SOURCE_DIR}/web/lib/wfl/inputPort.js
  ${CMAKE_SOURCE_DIR}/web/lib/wfl/staticWorkflows.js
  ${CMAKE_SOURCE_DIR}/web/lib/wfl/workflowStyle.js
  ${CMAKE_SOURCE_DIR}/web/lib/wfl/workflowUtils.js
)

# These files should have documentation generated for them.
set(JS_DOCUMENT_FILES
  ${JS_UGLIFY_FILES}
)

# These files should be copied to the deployment directory.
set(sources
    geoweb
    geoweb.py
)

set(paths
  web/apps
  web/common
  web/index.html
  modules
  utils
  nodes
  services
  temp
)

set(lib_dir "${CMAKE_BINARY_DIR}/${deploy_dir}/web/lib")
if(NOT EXISTS ${lib_dir})
  add_custom_command(OUTPUT ${lib_dir}
    COMMAND ${CMAKE_COMMAND} -E make_directory ${lib_dir}
  )
endif()

# Configure the server config file.
set(server_config "${deploy_dir}/server.conf")
add_custom_command(OUTPUT ${CMAKE_BINARY_DIR}/${deploy_dir}/server.conf
  COMMAND ${CMAKE_COMMAND} -P
    ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake
  DEPENDS
    ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake
    ${CMAKE_CURRENT_SOURCE_DIR}/server.conf.in
  COMMENT "Configuring server configuration script"
  VERBATIM
)

# Copy the files to the deployment directory.
set(all_targets)
foreach(m ${sources})
  set(outfile ${deploy_dir}/${m})
  add_custom_command(
    OUTPUT ${outfile}
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_SOURCE_DIR}/${m} ${CMAKE_BINARY_DIR}/${outfile}
    DEPENDS ${m}
  )
  list(APPEND all_targets ${outfile})
endforeach()

# Copy directories / files to the deployment directory
foreach(m ${paths})
    set(copy_command "copy")
    if (IS_DIRECTORY "${CMAKE_SOURCE_DIR}/${m}")
      set(copy_command "copy_directory")
    endif()
    set(outpath ${deploy_dir}/${m})
    add_custom_command(
        OUTPUT ${outpath}
        COMMAND ${CMAKE_COMMAND} -E ${copy_command} ${CMAKE_SOURCE_DIR}/${m} ${CMAKE_BINARY_DIR}/${outpath}
        DEPENDS ${m} ${lib_dir}
    )
    list(APPEND all_targets ${outpath})
endforeach()

add_custom_command(
  OUTPUT ${deploy_dir}/modules/standardtime.py
  COMMAND ${CMAKE_COMMAND} -E "copy" ${CMAKE_SOURCE_DIR}/scripts/standardtime.py ${CMAKE_BINARY_DIR}/${deploy_dir}/modules
  DEPENDS scripts/standardtime.py ${lib_dir}
)
list(APPEND all_targets ${deploy_dir}/modules/standardtime.py)


# Uglify and concatenate the library js files.
if(NOT ${MINIFY})
    set(MINIFY_FLAG "-b")
endif()

if(${MINIFY} AND ${MANGLE})
    set(MANGLE_FLAG "-m")
endif()

set(min_js_file ${CMAKE_BINARY_DIR}/${deploy_dir}/web/lib/geoweb.min.js)

if (UglifyJS_EXECUTABLE)
  add_custom_command(
    OUTPUT ${min_js_file}
    COMMAND ${UglifyJS_EXECUTABLE} -o ${min_js_file} ${JS_UGLIFY_FILES}
            ${MINIFY_FLAG} ${MANGLE_FLAG}
    DEPENDS ${lib_dir} ${JS_UGLIFY_FILES}
  )
else()
  # Use custom command to call CMake script to cat files together
  add_custom_command(
    OUTPUT ${min_js_file}
    COMMAND ${CMAKE_COMMAND} -DCAT_OUTPUT_FILE=${min_js_file}
            # Note the quotes so we get the ; included
            "-DCAT_FILES=${JS_UGLIFY_FILES}"
            -P ${CMAKE_SOURCE_DIR}/cmake/cat.cmake
    DEPENDS ${lib_dir} ${JS_UGLIFY_FILES}
    VERBATIM
  )
endif()

set(logs_dir ${CMAKE_BINARY_DIR}/${deploy_dir}/logs)
add_custom_command(
  OUTPUT ${logs_dir}
  COMMAND ${CMAKE_COMMAND} -E make_directory
  ${CMAKE_BINARY_DIR}/${deploy_dir}/logs
)

if(SERVER_LOGS)
    set(LOG_ERROR_FILE "${logs_dir}/error.log")
    set(LOG_ACCESS_FILE "${logs_dir}/access.log")
endif()

if(SERVER_DEBUG)
  set(LOG_DEBUG "True")
else()
  set(LOG_DEBUG "False")
endif()

#setup config file
configure_file(configure_server.cmake.in
  ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake @ONLY
)

# Generate documentation.
set(documentation_stamp ${CMAKE_BINARY_DIR}/stamps/documentation.txt)
set(documenation_dir ${CMAKE_BINARY_DIR}/doc)
if(DOCUMENT)
    add_custom_command(
        OUTPUT ${documentation_stamp}
        COMMAND ${CMAKE_COMMAND} -E remove_directory ${documenation_dir}
        COMMAND ${JSDuck_EXECUTABLE} ${JSDuck_ARGS} ${JS_DOCUMENT_FILES} --builtin-classes --output ${documenation_dir}
        COMMAND ${CMAKE_COMMAND} -E touch ${documentation_stamp}
        DEPENDS ${JS_DOCUMENT_FILES}
    )

    # Remove the stamp file, which may have been trivially generated in a
    # previous configure step by the else portion of this if-block.
    file(REMOVE ${documentation_stamp})
else()
    # Use a dummy custom command rather than a call to file() in case someone
    # deletes the stamp file for some reason.  In that case, the custom command
    # will regenerate the file without complaints, whereas the call to file()
    # wouldn't, instead resulting in an error.
    add_custom_command(
        OUTPUT ${documentation_stamp}
        COMMAND ${CMAKE_COMMAND} -E touch ${documentation_stamp}
    )
endif()

# The top-level target.
add_custom_target(
  deploy
  ALL
  DEPENDS ${lib_dir} ${all_targets} ${min_js_file} ${server_config} ${logs_dir}
  ${documentation_stamp}
)

# Testing
if (BUILD_TESTING)
  include(CTest)
  enable_testing()
endif()

# JSLint tests.
foreach(f ${JS_LINT_FILES})
    add_test(jslint-${f} ${JSLint_EXECUTABLE} ${f})
endforeach()

if (DEV_BUILD)
  configure_file(${CMAKE_SOURCE_DIR}/geoweb_dev.in
    ${CMAKE_BINARY_DIR}/CMakeFiles/geoweb_dev)
  file(COPY ${CMAKE_BINARY_DIR}/CMakeFiles/geoweb_dev
    DESTINATION ${CMAKE_BINARY_DIR}/${deploy_dir}
    FILE_PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE)
endif()

# Now include sub-directories
add_subdirectory(web)
