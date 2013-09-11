#/////////////////////////////////////////////////////////////////////////////
#
# GeoJS
#
#/////////////////////////////////////////////////////////////////////////////

cmake_minimum_required(VERSION 2.8)
project(geojs)

set(STATICDIR_ROOT "geojs.current_dir")

option(DEV_BUILD "Allow running from source tree" OFF)
if (DEV_BUILD)
  set(STATICDIR_ROOT "\\\"${CMAKE_SOURCE_DIR}\\\"")
endif()

# Extend cmake module path.
list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake")

#/////////////////////////////////////////////////////////////////////////////
#
# GeoJS options
#
#/////////////////////////////////////////////////////////////////////////////

set(DEPLOY_TEST_SERVICES OFF CACHE BOOL "Deploy the \"testing\" web service modules.")
set(SERVER_HOSTNAME localhost CACHE STRING "The hostname of the machine that will run the server.")
set(SERVER_PORT 8080 CACHE STRING "The port the server will run on.")
set(MINIFY ON CACHE BOOL "Minify the JavaScript files prior to concatenating.")
set(MANGLE ON CACHE BOOL "When minifying, also mangle non-public symbol names.")
set(DOCUMENT OFF CACHE BOOL "Generate documentation for JavaScript files.")
set(SERVER_LOGS ON CACHE BOOL "Write cherrypy server access and error logs in deploy/logs")
set(SERVER_DEBUG ON CACHE BOOL "Write debug statements to error logs")
set(DATA_ROOT "data" CACHE PATH "Root directory for the data")
set(GEOJS_USER $ENV{USER} CACHE STRING "User to run geojs as when dropping privileges")
set(GEOJS_GROUP $ENV{USER} CACHE STRING "Group to run geojs as when dropping privileges")

#/////////////////////////////////////////////////////////////////////////////
#
# Internal variables
#
#/////////////////////////////////////////////////////////////////////////////

set(_deploy_dir deploy)
set(_deploy_depends)
set(_geojs_cmake_dir "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

# These files should be validated with JSLint.
set(_js_lint_files)
set_directory_properties(PROPERTIES ADDITIONAL_MAKE_CLEAN_FILES ${_deploy_dir})

#/////////////////////////////////////////////////////////////////////////////
#
# Find required packages
#
#/////////////////////////////////////////////////////////////////////////////

# VTK is required
find_package(VTK REQUIRED)

# VisTrails is required
find_package(VisTrails REQUIRED)

# Find JSLint.
find_package(JSLint)

# Find UglifyJS.
find_package(UglifyJS)

# Find JSDuck.
if (DOCUMENT)
  find_package(JSDuck)
endif()

# Find a Python2 interpreter.
find_package(PythonInterp 2.7)

#/////////////////////////////////////////////////////////////////////////////
#
# Add source files and directories
#
#/////////////////////////////////////////////////////////////////////////////

# Create a "stamps" directory for storing fake targets for custom commands.
file(MAKE_DIRECTORY ${CMAKE_BINARY_DIR}/stamps)

set(DEV_SOURCE_FILES
  /lib/vgl/init.js
  /lib/vgl/timestamp.js
  /lib/vgl/object.js
  /lib/vgl/command.js
  /lib/vgl/boundingObject.js
  /lib/vgl/node.js
  /lib/vgl/groupNode.js
  /lib/vgl/actor.js
  /lib/vgl/camera.js
  /lib/vgl/freezeObject.js
  /lib/vgl/defaultValue.js
  /lib/vgl/geojsonReader.js
  /lib/vgl/data.js
  /lib/vgl/geomData.js
  /lib/vgl/mapper.js
  /lib/vgl/groupMapper.js
  /lib/vgl/materialAttribute.js
  /lib/vgl/blend.js
  /lib/vgl/material.js
  /lib/vgl/renderer.js
  /lib/vgl/renderWindow.js
  /lib/vgl/interactorStyle.js
  /lib/vgl/trackballInteractorStyle.js
  /lib/vgl/viewer.js
  /lib/vgl/shader.js
  /lib/vgl/shaderProgram.js
  /lib/vgl/texture.js
  /lib/vgl/uniform.js
  /lib/vgl/vertexAttribute.js
  /lib/vgl/source.js
  /lib/vgl/planeSource.js
  /lib/vgl/pointSource.js
  /lib/vgl/lineSource.js
  /lib/vgl/utils.js
  /lib/geo/init.js
  /lib/geo/ellipsoid.js
  /lib/geo/mercator.js
  /lib/geo/latlng.js
  /lib/geo/layer.js
  /lib/geo/featureLayer.js
  /lib/geo/openStreetMapLayer.js
  /lib/geo/featureCollection.js
  /lib/geo/layerSource.js
  /lib/geo/archiveLayerSource.js
  /lib/geo/command.js
  /lib/vgl/picker.js
  /lib/geo/updateRequest.js
  /lib/geo/prepareForRenderRequest.js
  /lib/geo/mapInteractorStyle.js
  /lib/geo/time.js
  /lib/geo/map.js
  /lib/geo/feature.js
  /lib/geo/geoTransform.js
  /lib/geo/data.js
  /lib/ui/init.js
  /lib/ui/gis.js
  /lib/srv/init.js
  /lib/srv/webSocket.js
  /lib/wfl/init.js
  /lib/wfl/utils.js
  /lib/wfl/workflow.js
  /lib/wfl/module.js
  /lib/wfl/connection.js
  /lib/wfl/port.js
  /lib/wfl/registry.js
  /lib/wfl/inputModule.js
  /lib/wfl/outputPort.js
  /lib/wfl/inputPort.js
  /lib/wfl/layerSource.js
  /lib/wfl/editor.js
  /lib/wfl/staticWorkflows.js
  /lib/wfl/style.js
)

foreach(d ${DEV_SOURCE_FILES})
  set(_js_lint_files ${_js_lint_files} ${CMAKE_SOURCE_DIR}/web/${d})
endforeach()

# These files should be concatenated and uglified
set(_js_uglify_files
  ${_js_lint_files}
)

# These files should have documentation generated for them.
set(_js_document_files
  ${_js_uglify_files}
)

# These files should be copied to the deployment directory.
set(sources
    geojs geojs.py geocelery
)

set(paths
  web/apps web/common web/index.html modules utils
  nodes services temp
)

set(_lib_dir "${CMAKE_BINARY_DIR}/${_deploy_dir}/web/lib")
add_custom_command(OUTPUT ${_lib_dir}
  COMMAND ${CMAKE_COMMAND} -E make_directory ${_lib_dir}
)

#/////////////////////////////////////////////////////////////////////////////
#
# Create custom commands and necessary build pieces
#
#/////////////////////////////////////////////////////////////////////////////

set(_server_config "${_deploy_dir}/server.conf")
add_custom_command(OUTPUT ${CMAKE_BINARY_DIR}/${_deploy_dir}/server.conf
  COMMAND ${CMAKE_COMMAND} -P
    ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake
  DEPENDS
    ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake
    ${_geojs_cmake_dir}/server.conf.in
  COMMENT "Configuring server configuration script"
  VERBATIM
)

# Copy the files to the deployment directory.
set(all_targets)
foreach(m ${sources})
  set(outfile ${_deploy_dir}/${m})
  add_custom_command(OUTPUT ${outfile}
    COMMAND ${CMAKE_COMMAND} -E copy
      ${CMAKE_SOURCE_DIR}/${m} ${CMAKE_BINARY_DIR}/${outfile}
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
    set(outpath ${_deploy_dir}/${m})
    add_custom_command(
        OUTPUT ${outpath}
        COMMAND ${CMAKE_COMMAND} -E ${copy_command}
          ${CMAKE_SOURCE_DIR}/${m} ${CMAKE_BINARY_DIR}/${outpath}
        DEPENDS ${m} ${_lib_dir}
    )
    list(APPEND all_targets ${outpath})
endforeach()

# Uglify and concatenate the library js files.
if(NOT ${MINIFY})
    set(MINIFY_FLAG "-b")
endif()

if(${MINIFY} AND ${MANGLE})
    set(MANGLE_FLAG "-m")
endif()

set(_min_js_file ${CMAKE_BINARY_DIR}/${_deploy_dir}/web/lib/geojs.min.js)

if (UglifyJS_EXECUTABLE)
  add_custom_command(
    OUTPUT ${_min_js_file}
    COMMAND ${UglifyJS_EXECUTABLE} -o ${_min_js_file} ${_js_uglify_files}
            ${MINIFY_FLAG} ${MANGLE_FLAG}
    DEPENDS ${_lib_dir} ${_js_uglify_files}
  )
else()
  # Use custom command to call CMake script to cat files together
  add_custom_command(
    OUTPUT ${_min_js_file}
    COMMAND ${CMAKE_COMMAND} -DCAT_OUTPUT_FILE=${_min_js_file}
            # Note the quotes so we get the ; included
            "-DCAT_FILES=${_js_uglify_files}"
            -P ${CMAKE_SOURCE_DIR}/cmake/cat.cmake
    DEPENDS ${_lib_dir} ${_js_uglify_files}
    VERBATIM
  )
endif()

set(_logs_dir ${CMAKE_BINARY_DIR}/${_deploy_dir}/logs)
add_custom_command(
  OUTPUT ${_logs_dir}
  COMMAND ${CMAKE_COMMAND} -E make_directory
  ${CMAKE_BINARY_DIR}/${_deploy_dir}/logs
)

if(SERVER_LOGS)
    set(LOG_ERROR_FILE "${_logs_dir}/error.log")
    set(LOG_ACCESS_FILE "${_logs_dir}/access.log")
endif()

if(SERVER_DEBUG)
  set(LOG_DEBUG "True")
else()
  set(LOG_DEBUG "False")
endif()

#/////////////////////////////////////////////////////////////////////////////
#
# Configure
#
#/////////////////////////////////////////////////////////////////////////////

configure_file(${_geojs_cmake_dir}/setup-runtime.sh.in
  ${CMAKE_CURRENT_BINARY_DIR}/${_deploy_dir}/setup-runtime.sh @ONLY
)

configure_file(${_geojs_cmake_dir}/configure_server.cmake.in
  ${CMAKE_CURRENT_BINARY_DIR}/configure_server.cmake @ONLY
)

configure_file(${_geojs_cmake_dir}/geocelery_conf.py.in
  ${CMAKE_CURRENT_BINARY_DIR}/${_deploy_dir}/modules/geocelery_conf.py @ONLY
)

#/////////////////////////////////////////////////////////////////////////////
#
# Generate documentation
#
#/////////////////////////////////////////////////////////////////////////////

set(documentation_stamp ${CMAKE_BINARY_DIR}/stamps/documentation.txt)
set(documenation_dir ${CMAKE_BINARY_DIR}/doc)
if(DOCUMENT)
    add_custom_command(
        OUTPUT ${documentation_stamp}
        COMMAND ${CMAKE_COMMAND} -E remove_directory ${documenation_dir}
        COMMAND ${JSDuck_EXECUTABLE} ${JSDuck_ARGS}
          ${_js_document_files} --builtin-classes --output ${documenation_dir}
        COMMAND ${CMAKE_COMMAND} -E touch ${documentation_stamp}
        DEPENDS ${_js_document_files}
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

#/////////////////////////////////////////////////////////////////////////////
#
# Add top level target
#
#/////////////////////////////////////////////////////////////////////////////

add_custom_target(deploy ALL
  DEPENDS ${_lib_dir} ${all_targets} ${_min_js_file} ${_server_config} ${_logs_dir}
  ${documentation_stamp}
)

#/////////////////////////////////////////////////////////////////////////////
#
# Add pieces for testing if enabled
#
#/////////////////////////////////////////////////////////////////////////////

# Testing
if (BUILD_TESTING)
  include(CTest)
  enable_testing()
endif()

# JSLint tests.
foreach(f ${_js_lint_files})
    add_test(jslint-${f} ${JSLint_EXECUTABLE} ${f})
endforeach()

#/////////////////////////////////////////////////////////////////////////////
#
# Handle development build
#
#/////////////////////////////////////////////////////////////////////////////

if (DEV_BUILD)
  configure_file(${_geojs_cmake_dir}/geojs_dev.in
    ${CMAKE_BINARY_DIR}/CMakeFiles/geojs_dev)
  file(COPY ${CMAKE_BINARY_DIR}/CMakeFiles/geojs_dev
    DESTINATION ${CMAKE_BINARY_DIR}/${_deploy_dir}
    FILE_PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE)
  string(REPLACE ";" "','" DEV_SOURCE_FILES_JS "'${DEV_SOURCE_FILES}'")
  configure_file(${_geojs_cmake_dir}/geojs.min.js.in
    ${CMAKE_SOURCE_DIR}/web/lib/geojs.min.js)
endif()

# Now include sub-directories
add_subdirectory(web)
