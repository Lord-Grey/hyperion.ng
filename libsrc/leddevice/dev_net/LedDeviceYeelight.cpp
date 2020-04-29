#include "LedDeviceYeelight.h"

// ssdp discover
#include <ssdp/SSDPDiscover.h>

// Qt includes
#include <QEventLoop>

#include <QtNetwork>
#include <QTcpServer>
#include <QColor>

static const bool verbose  = false;

// Constants
const int WRITE_TIMEOUT	= 1000;		// device write timout in ms
const int READ_TIMEOUT	= 1000;		// device write timout in ms
const int CONNECT_TIMEOUT = 1000;	// device connect timout in ms
const int CONNECT_STREAM_TIMEOUT = 1000; // device streaming connect timout in ms

// Configuration settings
static const char CONFIG_LIGHTS [] = "lights";

static const char CONFIG_COLOR_MODEL [] = "colorModel";
static const char CONFIG_TRANS_EFFECT [] = "transEffect";
static const char CONFIG_TRANS_TIME [] = "transTime";
static const char CONFIG_EXTRA_TIME_DARKNESS[] = "extraTimeDarkness";
static const char CONFIG_DEBUGLEVEL [] = "debugLevel";

static const char CONFIG_BRIGHTNESS_MIN[] = "brightnessMin";
static const char CONFIG_BRIGHTNESS_SWITCHOFF[] = "brigthnessSwitchOffOnMinimum";
static const char CONFIG_BRIGHTNESS_MAX[] = "brightnessMax";
static const char CONFIG_BRIGHTNESSFACTOR[] = "brightnessFactor";

// Yeelights API
static const quint16 API_DEFAULT_PORT = 55443;

// Yeelight API Command
static const char API_COMMAND_ID[] = "id";
static const char API_COMMAND_METHOD[] = "method";
static const char API_COMMAND_PARAMS[] = "params";
static const char API_COMMAND_PROPS[] = "props";

static const char API_PARAM_CLASS_COLOR[] = "color";
static const char API_PARAM_CLASS_HSV[] = "hsv";

static const char API_PROP_NAME[] = "name";
static const char API_PROP_MODEL[] = "model";
static const char API_PROP_FWVER[] = "fw_ver";

static const char API_PROP_POWER[] = "power";
static const char API_PROP_MUSIC[] = "music_on";
static const char API_PROP_RGB[] = "rgb";
static const char API_PROP_CT[] = "ct";
static const char API_PROP_BRIGHT[] = "bright";

// List of Result Information
static const char API_RESULT_ID[] = "id";
static const char API_RESULT[] = "result";
//static const char API_RESULT_OK[] = "OK";

// List of Error Information
static const char API_ERROR[] = "error";
static const char API_ERROR_CODE[] = "code";
static const char API_ERROR_MESSAGE[] = "message";

// Yeelight Hue ssdp services
static const char SSDP_ID[] = "wifi_bulb";
const int SSDP_PORT = 1982; // timout in ms
const int SSDP_TIMEOUT = 5000; // timout in ms

YeelightLight::YeelightLight( Logger *log, const QString &hostname, unsigned short port = API_DEFAULT_PORT)
	:_log(log)
	  ,_debugLevel(0)
	  ,_isInError(false)
	  ,_host (hostname)
	  ,_port(port)
	  ,_tcpSocket(nullptr)
	  ,_correlationID(0)
	  ,_tcpStreamSocket(nullptr)
	  ,_colorRgbValue(0)
	  ,_transitionEffect(API_EFFECT_SMOOTH)
	  ,_transitionDuration(API_PARAM_DURATION)
	  ,_extraTimeDarkness(API_PARAM_EXTRA_TIME_DARKNESS)
	  ,_brightnessMin(0)
	  ,_isBrightnessSwitchOffMinimum(false)
	  ,_brightnessMax(100)
	  ,_brightnessFactor(1.0)
	  ,_transitionEffectParam(API_PARAM_EFFECT_SMOOTH)
	  ,_isOn(false)
	  ,_isInMusicMode(false)
{
	_name = hostname;

}

YeelightLight::~YeelightLight()
{
	log (3,"~YeelightLight()","" );
	_tcpSocket->deleteLater();
	log (2,"~YeelightLight()","void" );
}

void YeelightLight::setHostname( const QString &hostname, quint16 port = API_DEFAULT_PORT )
{
	log (3,"setHostname()","" );
	_host = hostname;
	_port =port;
}

void YeelightLight::setStreamSocket( QTcpSocket* socket )
{
	log (3,"setStreamSocket()","" );
	_tcpStreamSocket = socket;
}

bool YeelightLight::open()
{
	log (3,"open()","" );
	_isInError = false;
	bool rc = false;

	if ( _tcpSocket == nullptr )
	{
		_tcpSocket = new QTcpSocket();
	}

	_tcpSocket->connectToHost( _host, _port);

	if ( _tcpSocket->waitForConnected( CONNECT_TIMEOUT ) )
	{
		if ( _tcpSocket->state() != QAbstractSocket::ConnectedState )
		{
			this->setInError ( "Not connected!" );
			rc = false;
		}
		else
		{
			log (3,"open()","Connected: %s", QSTRING_CSTR(_host));
			rc = true;
		}
	}
	else
	{
		this->setInError ( "Connection timeout!" );
		rc = false;
	}
	log (2,"open() rc","%d", rc );
	return rc;
}

bool YeelightLight::close()
{
	log (3,"close()","" );
	bool rc = true;

	_tcpSocket->close();

	if ( _tcpStreamSocket != nullptr )
	{
		_tcpStreamSocket->close();
	}

	log (2,"close() rc","%d", rc );
	return rc;
}

bool YeelightLight::writeCommand( const QJsonDocument &command )
{
	QJsonArray result;
	return writeCommand(command, result );
}

bool YeelightLight::writeCommand( const QJsonDocument &command, QJsonArray &result )
{
	log (3,"writeCommand()","isON[%d], isInMusicMode[%d]", _isOn, _isInMusicMode );
	if (_debugLevel >= 2)
	{
		QString help = command.toJson(QJsonDocument::Compact);
		log (2,"writeCommand()","%s", QSTRING_CSTR(help));
	}

	bool rc = false;

	if ( ! _isInError && _tcpSocket->isOpen() )
	{
		qint64 bytesWritten = _tcpSocket->write( command.toJson(QJsonDocument::Compact) + "\r\n");
		if (bytesWritten == -1 )
		{
			this->setInError( QString ("Write Error: %1").arg(_tcpSocket->errorString()) );
		}
		else
		{
			if ( ! _tcpSocket->waitForBytesWritten(WRITE_TIMEOUT) )
			{
				QString errorReason = QString ("(%1) %2").arg(_tcpSocket->error()).arg( _tcpSocket->errorString());
				log ( 2, "Error:", "bytesWritten: [%d], %s", bytesWritten, QSTRING_CSTR(errorReason));
				this->setInError ( errorReason );
			}
			else
			{
				log ( 3, "Success:", "Bytes written   [%d]", bytesWritten );
			}

			if ( _tcpSocket->waitForReadyRead(READ_TIMEOUT) )
			{
				do
				{
					log ( 3, "Reading:", "Bytes available [%d]", _tcpSocket->bytesAvailable() );
					while ( _tcpSocket->canReadLine() )
					{
						QByteArray response = _tcpSocket->readLine();
						result = handleResponse( _correlationID, response );
					}
					log ( 3, "Info:", "Trying to read more resposes");
				}
				while ( _tcpSocket->waitForReadyRead(500) );
			}

			log ( 3, "Info:", "No more responses available");
		}

		if ( ! _isInError )
		{
			rc = true;
		}
	}
	else
	{
		log ( 2, "Info:", "Skip write. Device is in error");
	}

	log (2,"writeCommand() rc","%d", rc );
	return rc;
}

bool YeelightLight::streamCommand( const QJsonDocument &command )
{
	log (3,"streamCommand()","isON[%d], isInMusicMode[%d]", _isOn, _isInMusicMode );
	if (_debugLevel >= 2)
	{
		QString help = command.toJson(QJsonDocument::Compact);
		log (2,"streamCommand()","%s", QSTRING_CSTR(help));
	}

	bool rc = false;

	if ( ! _isInError && _tcpStreamSocket->isOpen() )
	{
		qint64 bytesWritten = _tcpStreamSocket->write( command.toJson(QJsonDocument::Compact) + "\r\n");
		if (bytesWritten == -1 )
		{
			this->setInError( QString ("Streaming Error %1").arg(_tcpStreamSocket->errorString()) );
		}
		else
		{
			if ( ! _tcpStreamSocket->waitForBytesWritten(WRITE_TIMEOUT) )
			{
				QString errorReason = QString ("(%1) %2").arg(_tcpStreamSocket->error()).arg( _tcpStreamSocket->errorString());
				log ( 2, "Error:", "bytesWritten: [%d], %s", bytesWritten, QSTRING_CSTR(errorReason));
				this->setInError ( errorReason );
			}
			else
			{
				log ( 3, "Success:", "Bytes written   [%d]", bytesWritten );
				rc = true;
			}
		}
	}
	else
	{
		log ( 2, "Info:", "Skip write. Device is in error");
	}

	log (2,"streamCommand() rc","%d, isON[%d], isInMusicMode[%d]", rc, _isOn, _isInMusicMode );
	return rc;
}

QJsonArray YeelightLight::handleResponse(int correlationID, QByteArray const &response )
{
	log (3,"handleResponse()","" );

	//std::cout << _name.toStdString() <<"| Response: [" << response.toStdString() << "]" << std::endl << std::flush;

	QJsonArray result;
	QString errorReason;

	QJsonParseError error;
	QJsonDocument jsonDoc = QJsonDocument::fromJson(response, &error);

	if (error.error != QJsonParseError::NoError)
	{
		this->setInError ( "Got invalid response" );
	}
	else
	{
		QString strJson(jsonDoc.toJson(QJsonDocument::Compact));
		log ( 1, "Reply:", "[%s]", strJson.toUtf8().constData());

		QJsonObject jsonObj = jsonDoc.object();

		if ( !jsonObj[API_COMMAND_METHOD].isNull() )
		{
			log ( 3, "Info:", "Notification found : [%s]", QSTRING_CSTR( jsonObj[API_COMMAND_METHOD].toString()));

			QString method = jsonObj[API_COMMAND_METHOD].toString();

			if ( method == API_COMMAND_PROPS )
			{

				if ( jsonObj.contains(API_COMMAND_PARAMS) && jsonObj[API_COMMAND_PARAMS].isObject() )
				{
					QVariantMap paramsMap = jsonObj[API_COMMAND_PARAMS].toVariant().toMap();

					// Loop over all children.
					foreach (const QString property, paramsMap.keys())
					{
						QString value = paramsMap[property].toString();
						log ( 3, "Notification ID:", "[%s]:[%s]", QSTRING_CSTR( property ), QSTRING_CSTR( value ));
					}
				}
			}
			else
			{
				log ( 1, "Error:", "Invalid notification message: [%s]", strJson.toUtf8().constData() );
			}
		}
		else
		{
			int id = jsonObj[API_RESULT_ID].toInt();
			log ( 3, "Correlation ID:", "%d", id );

			if ( id != correlationID )
			{
				errorReason = QString ("%1| API is out of sync, received ID [%2], expectexd [%3]").
							  arg( _name ).arg( id ).arg( correlationID );
				this->setInError ( errorReason );
			}
			else
			{

				if ( jsonObj.contains(API_RESULT) && jsonObj[API_RESULT].isArray() )
				{

					// API call returned an result
					result = jsonObj[API_RESULT].toArray();

					// Debug output
					if(!result.empty())
					{
						for(const auto item : result)
						{
							log ( 3, "Result:", "%s", QSTRING_CSTR( item.toString() ));
						}
					}
				}
				else
				{
					if ( jsonObj.contains(API_ERROR) && jsonObj[API_ERROR].isObject() )
					{
						QVariantMap errorMap = jsonObj[API_ERROR].toVariant().toMap();

						int errorCode = errorMap.value(API_ERROR_CODE).toInt();
						QString errorMessage = errorMap.value(API_ERROR_MESSAGE).toString();

						log ( 1, "Error:", "(%d) %s ", errorCode, QSTRING_CSTR( errorMessage ) );

						errorReason = QString ("(%1) %2").arg(errorCode).arg( errorMessage);
						if ( errorCode != -1)
							this->setInError ( errorReason );
					}
					else
					{
						this->setInError ( "No valid result message" );
					}
				}
			}
		}
	}
	log (2,"handleResponse() rc","" );
	return result;
}

void YeelightLight::setInError(const QString& errorMsg)
{
	_isInError = true;
	Error(_log, "Yeelight disabled, device '%s' signals error: '%s'", QSTRING_CSTR( _name ), QSTRING_CSTR(errorMsg));
}

QJsonDocument YeelightLight::getCommand(const QString &method, const QJsonArray &params)
{
	//Increment Correlation-ID
	++_correlationID;

	QJsonObject obj;
	obj.insert(API_COMMAND_ID,_correlationID);
	obj.insert(API_COMMAND_METHOD,method);
	obj.insert(API_COMMAND_PARAMS,params);

	return QJsonDocument(obj);
}

bool YeelightLight::getProperties()
{
	log (3,"getProperties()","" );

	QJsonArray propertylist;
	propertylist << API_PROP_NAME << API_PROP_MODEL << API_PROP_POWER << API_PROP_RGB << API_PROP_BRIGHT << API_PROP_CT << API_PROP_FWVER;

	QJsonDocument command = getCommand( API_METHOD_GETPROP, propertylist );

	QJsonArray result;
	bool rc = writeCommand( command, result );

	// Debug output
	if( !result.empty())
	{
		int i = 0;
		for(const auto item : result)
		{
			log (1,"Property:", "%s = %s", QSTRING_CSTR( propertylist.at(i).toString() ), QSTRING_CSTR( item.toString() ));

			_properties.insert( propertylist.at(i).toString(), item.toString() );
			++i;
		}
	}

	mapProperties(_properties);

	log (2,"getProperties() rc","%d", rc );
	return rc;
}

bool YeelightLight::isInMusicMode( bool deviceCheck)
{
	bool inMusicMode = false;

	if ( deviceCheck )
	{
		// Get status from device directly
		QJsonArray propertylist;
		propertylist << API_PROP_MUSIC;

		QJsonDocument command = getCommand( API_METHOD_GETPROP, propertylist );

		QJsonArray result;
		bool rc = writeCommand( command, result );

		if( rc && !result.empty())
		{
			inMusicMode = result.at(0).toString() == "1" ? true : false;
		}
	}
	else
	{
		// Test indirectly avoiding command quota
		if ( _tcpStreamSocket != nullptr)
		{
			if ( _tcpStreamSocket->state() == QAbstractSocket::ConnectedState )
			{
				log (3,"isInMusicMode", "Yes, as socket in ConnectedState");
				inMusicMode = true;
			}
			else
			{
				log (2,"isInMusicMode", "No, %s", QSTRING_CSTR(_tcpStreamSocket->errorString()) );
			}
		}
	}
	_isInMusicMode = inMusicMode;

	log (3,"isInMusicMode()","%d", _isInMusicMode );

	return _isInMusicMode;
}

void YeelightLight::mapProperties(const QMap<QString, QString> propertyList)
{
	log (3,"mapProperties()","" );

	if ( _name.isEmpty() )
	{
		_name	= propertyList[API_PROP_NAME];
		if ( _name.isEmpty() )
		{
			_name = _host;
		}
	}
	_model	= propertyList[API_PROP_MODEL];
	_fw_ver	= propertyList[API_PROP_FWVER];

	_power	= propertyList[API_PROP_POWER];
	_colorRgbValue	= propertyList[API_PROP_RGB].toInt();
	_bright	= propertyList[API_PROP_BRIGHT].toInt();
	_ct		= propertyList[API_PROP_CT].toInt();
	log (2,"mapProperties() rc","void" );
}

bool YeelightLight::setPower(bool on)
{
	return setPower( on, _transitionEffect, _transitionDuration);
}

bool YeelightLight::setPower(bool on, API_EFFECT effect, int duration, API_MODE mode)
{
	log (3,"setPower()","isON[%d], isInMusicMode[%d]", _isOn, _isInMusicMode );
	QString powerParam = on ? API_METHOD_POWER_ON : API_METHOD_POWER_OFF;
	QString effectParam = effect == API_EFFECT_SMOOTH ? API_PARAM_EFFECT_SMOOTH : API_PARAM_EFFECT_SUDDEN;

	QJsonArray paramlist;
	paramlist << powerParam << effectParam << duration << mode;

	bool rc = writeCommand( getCommand( API_METHOD_POWER, paramlist ) );

	// If power off was sucessfull, automatically music-mode is off too
	if ( rc )
	{
		_isOn = on;
		if ( on == false )
		{
			_isInMusicMode = false;
		}
	}
	log (2,"setPower() rc","%d, isON[%d], isInMusicMode[%d]", rc, _isOn, _isInMusicMode );

	return rc;
}

bool YeelightLight::setColorRGB(ColorRgb color)
{
	bool rc = true;

	int colorParam = (color.red * 65536) + (color.green * 256) + color.blue;

	if ( colorParam == 0 )
	{
		colorParam = 1;
	}

	if ( colorParam != _colorRgbValue )
	{
		int bri = std::max( { color.red, color.green, color.blue } ) * 100 / 255;
		int duration = _transitionDuration;

		if ( bri < _brightnessMin )
		{
			if ( _isBrightnessSwitchOffMinimum )
			{
				log ( 2, "Set Color RGB:", "Turn off, brigthness [%d] < _brightnessMin [%d], _isBrightnessSwitchOffMinimum [%d]", bri, _brightnessMin, _isBrightnessSwitchOffMinimum );
				// Set brightness to 0
				bri = 0;
				duration = _transitionDuration + _extraTimeDarkness;
			}
			else
			{
				//If not switchOff on MinimumBrightness, avoid switch-off
				log ( 2, "Set Color RGB:", "Set brightness[%d] to minimum brigthness [%d], if not _isBrightnessSwitchOffMinimum [%d]", bri, _brightnessMin, _isBrightnessSwitchOffMinimum );
				bri = _brightnessMin;
			}
		}
		else
		{
			bri = ( qMin( _brightnessMax, static_cast<int> (_brightnessFactor * qMax( _brightnessMin, bri ) ) ) );
		}

		log ( 3, "Set Color RGB:", "{%u,%u,%u} -> [%d], [%d], [%d], [%d]", color.red, color.green, color.blue, colorParam, bri, _transitionEffect, _transitionDuration );
		QJsonArray paramlist;
		paramlist << API_PARAM_CLASS_COLOR << colorParam << bri << _transitionEffectParam << duration;

		bool writeOK;
		if ( _isInMusicMode )
		{
			writeOK = streamCommand( getCommand( API_METHOD_SETSCENE, paramlist ) );
		}
		else
		{
			writeOK = writeCommand( getCommand( API_METHOD_SETSCENE, paramlist ) );
		}
		if ( writeOK )
		{
			_colorRgbValue = colorParam;
		}
		else
		{
			rc = false;
		}
	}
	log (2,"setColorRGB() rc","%d, isON[%d], isInMusicMode[%d]", rc, _isOn, _isInMusicMode );
	return rc;
}

bool YeelightLight::setColorHSV(ColorRgb colorRGB)
{
	bool rc = true;

	QColor color(colorRGB.red, colorRGB.green, colorRGB.blue);

	if ( color != _color )
	{
		int hue;
		int sat;
		int bri;
		int duration = _transitionDuration;

		color.getHsv( &hue, &sat, &bri);

		//Align to Yeelight number ranges (hue: 0-359, sat: 0-100, bri: 0-100)
		if ( hue == -1)	hue = 0;
		sat = sat * 100 / 255;
		bri = bri * 100 / 255;

		if ( bri < _brightnessMin )
		{
			if ( _isBrightnessSwitchOffMinimum )
			{
				log ( 2, "Set Color HSV:", "Turn off, brigthness [%d] < _brightnessMin [%d], _isBrightnessSwitchOffMinimum [%d]", bri, _brightnessMin, _isBrightnessSwitchOffMinimum );
				// Set brightness to 0
				bri = 0;
				duration = _transitionDuration + _extraTimeDarkness;
			}
			else
			{
				//If not switchOff on MinimumBrightness, avoid switch-off
				log ( 2, "Set Color HSV:", "Set brightness[%d] to minimum brigthness [%d], if not _isBrightnessSwitchOffMinimum [%d]", bri, _brightnessMin, _isBrightnessSwitchOffMinimum );
				bri = _brightnessMin;
			}
		}
		else
		{
			bri = ( qMin( _brightnessMax, static_cast<int> (_brightnessFactor * qMax( _brightnessMin, bri ) ) ) );
		}
		log ( 2, "Set Color HSV:", "{%u,%u,%u}, [%d], [%d]", hue, sat, bri, _transitionEffect, duration );
		QJsonArray paramlist;
		paramlist << API_PARAM_CLASS_HSV << hue << sat << bri << _transitionEffectParam << duration;

		bool writeOK;
		if ( _isInMusicMode )
		{
			writeOK = streamCommand( getCommand( API_METHOD_SETSCENE, paramlist ) );
		}
		else
		{
			writeOK = writeCommand( getCommand( API_METHOD_SETSCENE, paramlist ) );
		}

		if ( writeOK )
		{
			_isOn = true;
			if ( bri == 0 )
			{
				_isOn = false;
				_isInMusicMode = false;
			}
			_color = color;
		}
		else
		{
			rc = false;
		}
	}
	else
	{
		//log ( 3, "setColorHSV", "Skip update. Same Color as before");
	}
	log (3,"setColorHSV() rc","%d, isON[%d], isInMusicMode[%d]", rc, _isOn, _isInMusicMode );
	return rc;
}


void YeelightLight::setTransitionEffect ( API_EFFECT effect ,int duration )
{
	if( effect != _transitionEffect )
	{
		_transitionEffect = effect;
		_transitionEffectParam = effect == API_EFFECT_SMOOTH ? API_PARAM_EFFECT_SMOOTH : API_PARAM_EFFECT_SUDDEN;
	}

	if( duration != _transitionDuration )
	{
		_transitionDuration = duration;
	}

}

void YeelightLight::setBrightnessConfig (int min, int max, bool switchoff,  int extraTime, double factor )
{
	_brightnessMin = min;
	_isBrightnessSwitchOffMinimum = switchoff;
	_brightnessMax = max;
	_brightnessFactor = factor;
	_extraTimeDarkness = extraTime;
}

bool YeelightLight::setMusicMode(bool on, QHostAddress ipAddress, quint16 port)
{
	int musicModeParam = on ? API_METHOD_MUSIC_MODE_ON : API_METHOD_MUSIC_MODE_OFF;

	QJsonArray paramlist;
	paramlist << musicModeParam;

	if ( on )
	{
		paramlist << ipAddress.toString() << port;
	}

	bool rc = writeCommand( getCommand( API_METHOD_MUSIC_MODE, paramlist ) );
	if ( rc )
	{
		_isInMusicMode = on;
	}

	log (2,"setMusicMode() rc","%d, isInMusicMode[%d]", rc, _isInMusicMode );
	return rc;
}

void YeelightLight::log(const int logLevel, const char* msg, const char* type, ...)
{
	if ( logLevel <= _debugLevel)
	{
		const size_t max_val_length = 1024;
		char val[max_val_length];
		va_list args;
		va_start(args, type);
		vsnprintf(val, max_val_length, type, args);
		va_end(args);
		std::string s = msg;
		uint max = 20;
		s.append(max - s.length(), ' ');

		Debug( _log, "%15.15s| %s: %s", QSTRING_CSTR(_name), s.c_str(), val);
	}
}

//---------------------------------------------------------------------------------

LedDeviceYeelight::LedDeviceYeelight(const QJsonObject &deviceConfig)
	: LedDevice()
	  ,_lightsCount (0)
	  ,_outputColorModel(0)
	  ,_transitionEffect(API_EFFECT_SMOOTH)
	  ,_transitionDuration(API_PARAM_DURATION)
	  ,_extraTimeDarkness(0)
	  ,_brightnessMin(0)
	  ,_isBrightnessSwitchOffMinimum(false)
	  ,_brightnessMax(100)
	  ,_brightnessFactor(1.0)
	  ,_debuglevel(0)
	  ,_musicModeServerPort(0)
{
	_devConfig = deviceConfig;
	_deviceReady = false;
}

LedDeviceYeelight::~LedDeviceYeelight()
{
	if ( _tcpMusicModeServer != nullptr )
	{
		_tcpMusicModeServer->deleteLater();
	}
}

LedDevice* LedDeviceYeelight::construct(const QJsonObject &deviceConfig)
{
	return new LedDeviceYeelight(deviceConfig);
}

bool LedDeviceYeelight::init(const QJsonObject &deviceConfig)
{
	// Overwrite non supported/required features
	//_devConfig["latchTime"]   = LATCH_TIME;
	if (deviceConfig["rewriteTime"].toInt(0) > 0)
	{
		Info (_log, "Yeelights do not require rewrites. Refresh time is ignored.");
		_devConfig["rewriteTime"] = 0;
	}

	DebugIf(verbose, _log, "deviceConfig: [%s]", QString(QJsonDocument(_devConfig).toJson(QJsonDocument::Compact)).toUtf8().constData() );

	bool isInitOK = LedDevice::init(deviceConfig);

	Debug(_log, "DeviceType        : %s", QSTRING_CSTR( this->getActiveDeviceType() ));
	Debug(_log, "LedCount          : %u", this->getLedCount());
	Debug(_log, "ColorOrder        : %s", QSTRING_CSTR( this->getColorOrder() ));
	Debug(_log, "RefreshTime       : %d", _refresh_timer_interval);
	Debug(_log, "LatchTime         : %d", this->getLatchTime());

	//Get device specific configuration

	if ( deviceConfig[ CONFIG_COLOR_MODEL ].isString() )
		_outputColorModel = deviceConfig[ CONFIG_COLOR_MODEL ].toString().toInt();
	else
		_outputColorModel = deviceConfig[ CONFIG_COLOR_MODEL ].toInt();

	if ( deviceConfig[ CONFIG_TRANS_EFFECT ].isString() )
		_transitionEffect = static_cast<API_EFFECT>( deviceConfig[ CONFIG_TRANS_EFFECT ].toString().toInt() );
	else
		_transitionEffect = static_cast<API_EFFECT>( deviceConfig[ CONFIG_TRANS_EFFECT ].toInt() );

	_transitionDuration = deviceConfig[ CONFIG_TRANS_TIME ].toInt(API_PARAM_DURATION);
	_extraTimeDarkness	= _devConfig[CONFIG_EXTRA_TIME_DARKNESS].toInt(0);

	_brightnessMin		= _devConfig[CONFIG_BRIGHTNESS_MIN].toInt(0);
	_isBrightnessSwitchOffMinimum = _devConfig[CONFIG_BRIGHTNESS_SWITCHOFF].toBool(false);
	_brightnessMax		= _devConfig[CONFIG_BRIGHTNESS_MAX].toInt(100);
	_brightnessFactor	= _devConfig[CONFIG_BRIGHTNESSFACTOR].toDouble(1.0);


	if (  deviceConfig[ CONFIG_DEBUGLEVEL ].isString() )
		_debuglevel = deviceConfig[ CONFIG_DEBUGLEVEL ].toString().toInt();
	else
		_debuglevel = deviceConfig[ CONFIG_DEBUGLEVEL ].toInt(0);


	QString outputColorModel = _outputColorModel == 1 ? "RGB": "HSV";
	QString transitionEffect = _transitionEffect == API_EFFECT_SMOOTH ? API_PARAM_EFFECT_SMOOTH : API_PARAM_EFFECT_SUDDEN;

	Debug(_log, "colorModel        : %s", QSTRING_CSTR(outputColorModel));
	Debug(_log, "Transitioneffect  : %s", QSTRING_CSTR(transitionEffect));
	Debug(_log, "Transitionduration: %d", _transitionDuration);
	Debug(_log, "Extra time darkn. : %d", _extraTimeDarkness );

	Debug(_log, "Brightn. Min      : %d", _brightnessMin );
	Debug(_log, "Brightn. Min Off  : %d", _isBrightnessSwitchOffMinimum );
	Debug(_log, "Brightn. Max      : %d", _brightnessMax );
	Debug(_log, "Brightn. Factor   : %.2f", _brightnessFactor );

	Debug(_log, "Debuglevel        : %d", _debuglevel);

	QJsonArray configuredYeelightLights   = _devConfig[CONFIG_LIGHTS].toArray();
	uint configuredYeelightsCount = static_cast<uint>( configuredYeelightLights.size() );

	Debug(_log, "Light configured  : %d", configuredYeelightsCount );

	int i = 1;
	foreach (const QJsonValue & light, configuredYeelightLights)
	{
		QString ip = light.toObject().value("ip").toString();
		QString name = light.toObject().value("name").toString();
		Debug(_log, "Light [%d] - %s (%s)", i, QSTRING_CSTR(name), QSTRING_CSTR(ip) );
		++i;
	}

	if ( isInitOK )
	{
		//isInitOK =
		discoverDevice();
	}

	// Check. if enough yeelights were found.
	uint configuredLedCount = this->getLedCount();
	if (configuredYeelightsCount < configuredLedCount )
	{
		QString errorReason = QString("Not enough Yeelights [%1] for configured LEDs [%2] found!")
								  .arg(configuredYeelightsCount)
								  .arg(configuredLedCount);
		this->setInError(errorReason);
		isInitOK = false;
	}
	else
	{

		if (  configuredYeelightsCount > configuredLedCount )
		{
			Warning(_log, "More Yeelights defined [%u] than configured LEDs [%u].", configuredYeelightsCount, configuredLedCount );
		}

		for (int i = 0; i < static_cast<int>( configuredLedCount ); ++i)
		{
			QString address = configuredYeelightLights[i].toObject().value("ip").toString();

			QStringList addressparts = address.split(":", QString::SkipEmptyParts);

			QString hostAddress = addressparts[0];
			quint16 apiPort;

			if ( addressparts.size() > 1)
			{
				apiPort = addressparts[1].toUShort();
			}
			else
			{
				apiPort   = API_DEFAULT_PORT;
			}

			_lightsAddressList.append( {hostAddress, apiPort} );
		}

		updateLights (_lightsAddressList );

	}
	return isInitOK;
}

bool LedDeviceYeelight::openMusicModeServer()
{
	DebugIf(verbose, _log, "enabled [%d], _deviceReady [%d]", this->enabled(), _deviceReady);

	bool rc = false;
	if ( _tcpMusicModeServer == nullptr )
	{
		_tcpMusicModeServer = new QTcpServer(this);
	}

	if (! _tcpMusicModeServer->listen())
	{
		Error( _log, "Failed to open music mode server");
	}
	else
	{
		QList<QHostAddress> ipAddressesList = QNetworkInterface::allAddresses();
		// use the first non-localhost IPv4 address
		for (int i = 0; i < ipAddressesList.size(); ++i) {
			if (ipAddressesList.at(i) != QHostAddress::LocalHost &&
				 ipAddressesList.at(i).toIPv4Address())
			{
				_musicModeServerAddress = ipAddressesList.at(i);
				break;
			}
		}
		if ( _musicModeServerAddress.isNull() )
		{
			Error( _log, "Failed to resolve IP for music mode server");
		}
		else
		{
			_musicModeServerPort = _tcpMusicModeServer->serverPort();
			Debug (_log, "The music mode server is running at %s:%u", QSTRING_CSTR(_musicModeServerAddress.toString()), _musicModeServerPort);
			rc = true;
		}
	}
	DebugIf(verbose, _log, "rc [%d], enabled [%d], _deviceReady [%d]", rc, this->enabled(), _deviceReady);
	return rc;
}

int LedDeviceYeelight::open()
{
	DebugIf(verbose, _log, "enabled [%d], _deviceReady [%d]", this->enabled(), _deviceReady);
	int rc = -1;
	QString errortext;
	_deviceReady = false;

	// General initialisation and configuration of LedDevice
	if ( init(_devConfig) )
	{
		// Open/Start LedDevice based on configuration
		if ( !_lights.empty() )
		{
			if ( openMusicModeServer() )
			{
				for (YeelightLight& light : _lights)
				{
					light.setTransitionEffect( _transitionEffect, _transitionDuration );
					light.setBrightnessConfig( _brightnessMin, _brightnessMax, _isBrightnessSwitchOffMinimum, _extraTimeDarkness, _brightnessFactor );
					light.setDebuglevel(_debuglevel);

					light.open();
					if ( light.isReady())
					{
						light.getProperties();

					}
					else
					{
						Error( _log, "Failed to open [%s]", QSTRING_CSTR(light.getName()) );
						//_lights.removeOne(light);
					}
				}
				if ( ! _lights.empty() )
				{
					// Everything is OK -> enable device
					_deviceReady = true;
					setEnable(true);
					rc = 0;
				}
				else
				{
					this->setInError( "All Yeelights failed to be openend!" );
				}
			}
		}
		else
		{
			// On error/exceptions, set LedDevice in error
		}
	}
	DebugIf(verbose, _log, "rc [%d], enabled [%d], _deviceReady [%d]", rc, this->enabled(), _deviceReady);
	return rc;
}

void LedDeviceYeelight::close()
{
	DebugIf(verbose, _log, "enabled [%d], _deviceReady [%d]", this->enabled(), _deviceReady);

	LedDevice::close();

	// LedDevice specific closing activites
	if ( _deviceReady)
	{
		//Close Yeelight sockets
		for (YeelightLight& light : _lights)
		{
			light.close();
		}
	}
	DebugIf(verbose, _log, "rc [void], enabled [%d], _deviceReady [%d]", this->enabled(), _deviceReady);
}

bool LedDeviceYeelight::discoverDevice()
{
	bool isDeviceFound (false);

	// device searching by ssdp
	QString address;
	SSDPDiscover discover;

	// Discover first Yeelight Device
	discover.setPort(SSDP_PORT);
	address = discover.getFirstService(STY_WEBSERVER, SSDP_ID, SSDP_TIMEOUT);

	if ( address.isEmpty() )
	{
		Warning(_log, "No Yeelight discovered");
	}
	else
	{
		_lightsAddressList.clear();

		// Yeelight found
		Info(_log, "Yeelight discovered at [%s]", QSTRING_CSTR( address ));

		QStringList addressparts = address.split(":", QString::SkipEmptyParts);

		QString hostAddress = addressparts[0];
		quint16 apiPort;

		if ( addressparts.size() > 1)
		{
			apiPort = addressparts[1].toUShort();
		}
		else
		{
			apiPort   = API_DEFAULT_PORT;
		}

		_lightsAddressList.append( {hostAddress, apiPort} );
		_ledCount = static_cast<uint>( _lightsAddressList.size() );

		if (getLedCount() == 0 )
		{
			setInError("No Yeelights found!");
		}
		else
		{
			Debug(_log, "Yeelights found      : %u", getLedCount() );
		}

		isDeviceFound = true;
	}
	return isDeviceFound;
}

void LedDeviceYeelight::updateLights(QVector<yeelightAddress>& list)
{
	if(!_lightsAddressList.empty())
	{
		// search user lightid inside map and create light if found
		_lights.clear();

		_lights.reserve( static_cast<ulong>( _lightsAddressList.size() ));

		for(auto yeelightAddress : _lightsAddressList )
		{
			QString host = yeelightAddress.host;

			if ( list.contains(yeelightAddress) )
			{
				quint16 port = yeelightAddress.port;

				Debug(_log,"Add Yeelight %s:%u", QSTRING_CSTR(host), port );
				_lights.emplace_back( _log, host, port );
			}
			else
			{
				Warning(_log,"Configured light-address %s is not available", QSTRING_CSTR(host) );
			}
		}
		setLightsCount ( static_cast<uint>( _lights.size() ));
	}
}

int LedDeviceYeelight::write(const std::vector<ColorRgb> & ledValues)
{
	DebugIf(verbose, _log, "enabled [%d], _deviceReady [%d]", this->enabled(), _deviceReady);
	int rc = -1;

	//Update on all Yeelights by iterating through lights and set colors.
	unsigned int idx = 0;
	for (YeelightLight& light : _lights)
	{
		// Get color
		ColorRgb color = ledValues.at(idx);

		if ( light.isReady()  )
		{
			if ( !light.isInMusicMode() )
			{
				// TODO: Remove code, if switch-On/Off will move to open/close logic
				light.setMusicMode(true, _musicModeServerAddress, _musicModeServerPort);

				// Wait for callback of the device to establish streaming socket
				if ( _tcpMusicModeServer->waitForNewConnection(CONNECT_STREAM_TIMEOUT) )
				{
					light.setStreamSocket( _tcpMusicModeServer->nextPendingConnection() );
				}
				else
				{
					light.setInError("Failed to get stream socket");
				}
			}
			if ( _outputColorModel == 1 )
			{
				light.setColorRGB( color );
			}
			else
			{
				light.setColorHSV( color );
			}
		}
		++idx;
	}
	rc = 0;

	DebugIf(verbose, _log, "rc [%d]", rc );

	return rc;
}

int LedDeviceYeelight::switchOn()
{
	DebugIf(verbose, _log, "enabled [%d], _deviceReady [%d]", this->enabled(), _deviceReady);
	if ( _deviceReady)
	{
		//Switch on all Yeelights
		for (YeelightLight& light : _lights)
		{
			light.setTransitionEffect (_transitionEffect, _transitionDuration);
			// TODO: Remove code, if switch-On/Off will move to open/close logic
			if ( !light.isInMusicMode() )
			{
				//light.setPower(true, API_EFFECT_SMOOTH, 5000);

				light.setMusicMode(true, _musicModeServerAddress, _musicModeServerPort);

				// Wait for callback of the device to establish streaming socket
				if ( _tcpMusicModeServer->waitForNewConnection(CONNECT_STREAM_TIMEOUT) )
				{
					light.setStreamSocket( _tcpMusicModeServer->nextPendingConnection() );
				}
				else
				{
					light.setInError("Failed to get stream socket");
				}
			}
		}
	}
	int rc = 0;

	DebugIf(verbose, _log, "rc [%d], enabled [%d], _deviceReady [%d]", rc, this->enabled(), _deviceReady);
	return rc;
}

int LedDeviceYeelight::switchOff()
{
	DebugIf(verbose, _log, "enabled [%d], _deviceReady [%d]", this->enabled(), _deviceReady);

	if ( _deviceReady)
	{
		//Switch on all Yeelights
		for (YeelightLight& light : _lights)
		{
			light.setTransitionEffect (_transitionEffect, API_PARAM_DURATION_POWERONOFF);
		}
	}

	//Set all LEDs to Black
	int rc = LedDevice::switchOff();

	if ( _deviceReady)
	{
		//Switch on all Yeelights
		for (YeelightLight& light : _lights)
		{
			light.setPower( false, _transitionEffect, API_PARAM_DURATION_POWERONOFF);
		}
	}

	DebugIf(verbose, _log, "rc [void], enabled [%d], _deviceReady [%d]", this->enabled(), _deviceReady);
	return rc;
}
