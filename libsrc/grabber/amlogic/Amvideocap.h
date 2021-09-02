#pragma once

#include <exception>
// #include <linux/videodev2.h>
#include "ion.h"
#include "meson_ion.h"
#include "IonBuffer.h"

#define AMVIDEOCAP_IOC_MAGIC  'V'
#define CAP_FLAG_AT_CURRENT		0
#define CAP_FLAG_AT_TIME_WINDOW	1
#define CAP_FLAG_AT_END			2

#define AMVIDEOCAP_IOW_SET_WANTFRAME_FORMAT     		_IOW(AMVIDEOCAP_IOC_MAGIC, 0x01, int)
#define AMVIDEOCAP_IOW_SET_WANTFRAME_WIDTH      		_IOW(AMVIDEOCAP_IOC_MAGIC, 0x02, int)
#define AMVIDEOCAP_IOW_SET_WANTFRAME_HEIGHT     		_IOW(AMVIDEOCAP_IOC_MAGIC, 0x03, int)
#define AMVIDEOCAP_IOW_SET_WANTFRAME_TIMESTAMP_MS     	_IOW(AMVIDEOCAP_IOC_MAGIC, 0x04, unsigned long long)
#define AMVIDEOCAP_IOW_SET_WANTFRAME_WAIT_MAX_MS     	_IOW(AMVIDEOCAP_IOC_MAGIC, 0x05, unsigned long long)
#define AMVIDEOCAP_IOW_SET_WANTFRAME_AT_FLAGS     		_IOW(AMVIDEOCAP_IOC_MAGIC, 0x06, int)

#define AMVIDEOCAP_IOR_GET_FRAME_FORMAT					_IOR(AMVIDEOCAP_IOC_MAGIC, 0x10, int)
#define AMVIDEOCAP_IOR_GET_FRAME_WIDTH					_IOR(AMVIDEOCAP_IOC_MAGIC, 0x11, int)
#define AMVIDEOCAP_IOR_GET_FRAME_HEIGHT					_IOR(AMVIDEOCAP_IOC_MAGIC, 0x12, int)
#define AMVIDEOCAP_IOR_GET_FRAME_TIMESTAMP_MS			_IOR(AMVIDEOCAP_IOC_MAGIC, 0x13, int)

#define AMVIDEOCAP_IOR_GET_SRCFRAME_FORMAT      		_IOR(AMVIDEOCAP_IOC_MAGIC, 0x20, int)
#define AMVIDEOCAP_IOR_GET_SRCFRAME_WIDTH       		_IOR(AMVIDEOCAP_IOC_MAGIC, 0x21, int)
#define AMVIDEOCAP_IOR_GET_SRCFRAME_HEIGHT      		_IOR(AMVIDEOCAP_IOC_MAGIC, 0x22, int)

#define AMVIDEOCAP_IOR_GET_STATE     	   				_IOR(AMVIDEOCAP_IOC_MAGIC, 0x31, int)
#define AMVIDEOCAP_IOW_SET_START_CAPTURE   				_IOW(AMVIDEOCAP_IOC_MAGIC, 0x32, int)
#define AMVIDEOCAP_IOW_SET_CANCEL_CAPTURE  				_IOW(AMVIDEOCAP_IOC_MAGIC, 0x33, int)

#define AMSTREAM_IOC_MAGIC 'S'
#define AMSTREAM_IOC_GET_VIDEO_DISABLE  				_IOR((AMSTREAM_IOC_MAGIC), 0x48, int)

enum amvideocap_state{
	AMVIDEOCAP_STATE_INIT=0,
	AMVIDEOCAP_STATE_ON_CAPTURE=200,
	AMVIDEOCAP_STATE_FINISHED_CAPTURE=300,
	AMVIDEOCAP_STATE_ERROR=0xffff,
	};
