add_subdirectory(ambilightwifid)
add_subdirectory(ambilightwifi-remote)

# The following binaries are just compiled if requested
if (ENABLE_AMLOGIC)
	add_subdirectory(ambilightwifi-aml)
endif()

if(ENABLE_V4L2)
	add_subdirectory(ambilightwifi-v4l2)
endif()

if(ENABLE_X11)
	add_subdirectory(ambilightwifi-x11)
endif()

if(ENABLE_DISPMANX)
	add_subdirectory(ambilightwifi-dispmanx)
endif()

if(ENABLE_FB)
	add_subdirectory(ambilightwifi-framebuffer)
endif()

if(ENABLE_QT)
	add_subdirectory(ambilightwifi-qt)
endif()

if(ENABLE_OSX)
	add_subdirectory(ambilightwifi-osx)
endif()
