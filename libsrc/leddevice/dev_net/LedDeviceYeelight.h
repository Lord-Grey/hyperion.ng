#pragma once

// Leddevice includes
#include <leddevice/LedDevice.h>

// Qt includes
#include <QTcpSocket>
#include <QHostAddress>
#include <QTcpServer>
#include <QColor>

enum API_EFFECT{
	API_EFFECT_SMOOTH,
	API_EFFECT_SUDDEN
};

enum API_MODE{
	API_TURN_ON_MODE,
	API_CT_MODE,
	API_RGB_MODE,
	API_HSV_MODE,
	API_COLOR_FLOW_MODE,
	API_NIGHT_LIGHT_MODE
};

// List of State Information
static const char API_METHOD_POWER[] = "set_power";
static const char API_METHOD_POWER_ON[] = "on";
static const char API_METHOD_POWER_OFF[] = "off";

// List of State Information
static const char API_METHOD_MUSIC_MODE[] = "set_music";
static const int API_METHOD_MUSIC_MODE_ON = 1;
static const int API_METHOD_MUSIC_MODE_OFF = 0;

static const char API_METHOD_SETRGB[] = "set_rgb";
static const char API_METHOD_SETSCENE[] = "set_scene";
static const char API_METHOD_GETPROP[] = "get_prop";

static const char API_PARAM_EFFECT_SUDDEN[] = "sudden";
static const char API_PARAM_EFFECT_SMOOTH[] = "smooth";
static const int  API_PARAM_DURATION = 50;
static const int  API_PARAM_DURATION_POWERONOFF = 1000;

/**
 * Simple class to hold the id, the latest color, the color space and the original state.
 */
class YeelightLight
{

public:
	///
	/// Constructs the light.
	///
	/// @param log the logger
	/// @param id the light id
	///
	YeelightLight( Logger *log, const QString &hostname, unsigned short port);
	~YeelightLight();

	bool open();

	bool close();

	bool writeCommand( const QJsonDocument &command );
	bool writeCommand( const QJsonDocument &command, QJsonArray &result );

	bool streamCommand( const QJsonDocument &command );


	void setHostname( const QString& hostname, quint16 port );

	void setStreamSocket( QTcpSocket* socket );

	///
	/// @param on
	///
	bool setPower( bool on );

	bool setPower( bool on, API_EFFECT effect, int duration, API_MODE mode = API_RGB_MODE );

	bool setColorRGB( ColorRgb color );
	bool setColorRGB2( ColorRgb color );
	bool setColorHSV( ColorRgb color );

	void setTransitionEffect ( API_EFFECT effect ,int duration = API_PARAM_DURATION );

	void setBrightnessConfig (double factor, int min, int max, int threshold);

	bool setMusicMode( bool on, QHostAddress ipAddress = {} , quint16 port = 0 );

	bool getProperties();

	QString getName()const { return _name; }

	bool isReady() const { return !_isInError; }
	bool isOn() const { return _isOn; }
	bool isInMusicMode( bool deviceCheck = false );

	/// Set device in error state
	///
	/// @param errorMsg The error message to be logged
	///
	void setInError( const QString& errorMsg );

	void setDebuglevel ( int level ) { _debugLevel = level; }

private:

	QJsonArray handleResponse(int correlationID, QByteArray const &response );

	void saveOriginalState(const QJsonObject& values);

	//QString getCommand(const QString &method, const QString &params);
	QJsonDocument getCommand(const QString &method, const QJsonArray &params);

	void mapProperties(const QMap<QString, QString> propertyList);

	void log(const int logLevel,const char* msg, const char* type, ...);

	Logger* _log;
	int _debugLevel;

	bool _isInError;

	/// Ip address of the Yeelight
	QString _host;
	quint16 _port;
	QString _defaultHost;

	QTcpSocket*	 _tcpSocket;
	int _correlationID;

	QTcpSocket*	 _tcpStreamSocket;

	QString _name;
	int _colorRgbValue;
	int _bright;
	int _ct;

	QColor _color;

	API_EFFECT _transitionEffect;
	int _transitionDuration;

	double _brightnessFactor;
	int _brightnessMin;
	int _brightnessMax;
	int _brightnessThreshold;

	QString _transitionEffectParam;

	QString _model;
	QString _power;
	QString _fw_ver;

	bool _isOn;
	bool _isInMusicMode;

	/// Array of the Yeelight properties
	QMap<QString,QString> _properties;
};

///
/// Implementation of the LedDevice interface for sending to
/// Yeelight devices via network
///
class LedDeviceYeelight : public LedDevice
{
public:
	///
	/// Constructs specific LedDevice
	///
	/// @param deviceConfig json device config
	///
	explicit LedDeviceYeelight(const QJsonObject &deviceConfig);

	///
	/// Destructor of this LedDevice
	///
	virtual ~LedDeviceYeelight() override;

	/// constructs leddevice
	static LedDevice* construct(const QJsonObject &deviceConfig);

	///
	/// Sets configuration
	///
	/// @param deviceConfig the json device config
	/// @return true if success
	virtual bool init(const QJsonObject &deviceConfig) override;

	/// Switch the device on
	virtual int switchOn() override;

	/// Switch the device off
	virtual int switchOff() override;

public slots:
	///
	/// Closes the output device.
	/// Includes switching-off the device and stopping refreshes
	///
	virtual void close() override;
	
protected:
	///
	/// Opens and initiatialises the output device
	///
	/// @return Zero on succes (i.e. device is ready and enabled) else negative
	///
	virtual int open() override;

	/// Writes the led color values to the led-device
	///
	/// @param ledValues The color-value per led
	/// @return Zero on succes else negative
	//////
	virtual int write(const std::vector<ColorRgb> & ledValues) override;

private:

	///
	/// Discover device via SSDP identifiers
	///
	/// @return True, if device was found
	///
	bool discoverDevice();

	bool openMusicModeServer();

	void updateLights(QMap<QString,quint16> map);

	void setLightsCount( unsigned int lightsCount )	{ _lightsCount = lightsCount; }
	uint getLightsCount() { return _lightsCount; }

	///
	/// Get Yeelight command
	///
	/// @param method
	/// @param parameters
	/// @return command to execute
	///
	QString getCommand(const QString &method, const QString &params);

	/// Array of the Yeelight addresses.
	QMap<QString,quint16> _lightsAddressMap;

	/// Array to save the lamps.
	std::vector<YeelightLight> _lights;
	unsigned int _lightsCount;

	int _outputColorModel;
	API_EFFECT _transitionEffect;
	int _transitionDuration;

	/// The brightness factor to multiply on color change.
	double _brightnessFactor;
	int _brightnessMin;
	int _brightnessMax;
	int _brightnessThreshold;

	int _debuglevel;

	QHostAddress _musicModeServerAddress;
	quint16 _musicModeServerPort;
	QTcpServer* _tcpMusicModeServer = nullptr;

};
