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
  /lib/ui/workflow.js
  /lib/srv/init.js
  /lib/srv/webSocket.js
)

# These files should be validated with JSLint.
set(JS_LINT_FILES)

foreach(d ${DEV_SOURCE_FILES})
  set(JS_LINT_FILES ${JS_LINT_FILES} ${CMAKE_SOURCE_DIR}/web/${d})
endforeach()

# These files should be concatenated and uglified
set(JS_UGLIFY_FILES
  ${JS_LINT_FILES}
)

# These files should have documentation generated for them.
set(JS_DOCUMENT_FILES
  ${JS_UGLIFY_FILES}
)

# These files should be copied to the deployment directory.
set(sources
    geoweb
    geoweb.py
    geocelery
)

set(paths
  web/apps
  web/common
  web/index.html
  modules
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

configure_file(geocelery_conf.py.in
  ${CMAKE_CURRENT_BINARY_DIR}/deploy/modules/geocelery_conf.py @ONLY
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
  string(REPLACE ";" "','" DEV_SOURCE_FILES_JS "'${DEV_SOURCE_FILES}'")
  configure_file(${CMAKE_SOURCE_DIR}/geoweb.min.js.in
    ${CMAKE_SOURCE_DIR}/web/lib/geoweb.min.js)
endif()

# Now include sub-directories
add_subdirectory(web)
