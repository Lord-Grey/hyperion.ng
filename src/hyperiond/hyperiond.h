#pragma once

#include <QApplication>
#include <QObject>
#include <QJsonObject>

#include <utils/Logger.h>
#include <utils/VideoMode.h>

// settings management
#include <utils/settings.h>
#include <utils/Components.h>

class HyperionIManager;
class SysTray;
class JsonServer;
class BonjourBrowserWrapper;
class WebServer;
class SettingsManager;
class PythonInit;
class SSDPHandler;
class FlatBufferServer;
class ProtoServer;
class AuthManager;
class NetOrigin;
class CECHandler;

class HyperionDaemon : public QObject
{
	Q_OBJECT

	friend SysTray;

public:
	HyperionDaemon(const QString& rootPath, QObject *parent, bool logLvlOverwrite, bool readonlyMode = false);
	~HyperionDaemon();

	///
	/// @brief Get webserver pointer (systray)
	///
	WebServer *getWebServerInstance() { return _webserver; }

	///
	/// @brief Get the current videoMode
	///
	VideoMode getVideoMode() const { return _currVideoMode; }

	///
	/// @brief get the settings
	///
	QJsonDocument getSetting(settings::type type) const;

	void startNetworkServices();

	static HyperionDaemon* getInstance() { return daemon; }
	static HyperionDaemon* daemon;

public slots:
	void freeObjects();

signals:
	///////////////////////////////////////
	/// FROM HYPERIONDAEMON TO HYPERION ///
	///////////////////////////////////////

	///
	/// @brief After eval of setVideoMode this signal emits with a new one on change
	///
	void videoMode(VideoMode mode);

	///////////////////////////////////////
	/// FROM HYPERION TO HYPERIONDAEMON ///
	///////////////////////////////////////

	///
	/// @brief PIPE settings events from Hyperion class to HyperionDaemon components
	///
	void settingsChanged(settings::type type, const QJsonDocument& data);

	///
	/// @brief PIPE component state changes events from Hyperion class to HyperionDaemon components
	///
	void compStateChangeRequest(hyperion::Components component, bool enable);

private slots:
	///
	/// @brief Handle settings update from Hyperion Settingsmanager emit or this constructor
	/// @param type   settingyType from enum
	/// @param config configuration object
	///
	void handleSettingsUpdate(settings::type type, const QJsonDocument& config);

	///
	/// @brief Listen for videoMode changes and emit videoMode in case of a change, update _currVideoMode
	/// @param mode  The requested video mode
	///
	void setVideoMode(VideoMode mode);

private:
	// void createCecHandler();  // TODO move to GrabberWrapper or Grabber?

	Logger*                    _log;
	HyperionIManager*          _instanceManager;
	AuthManager*               _authManager;
	BonjourBrowserWrapper*     _bonjourBrowserWrapper;
	NetOrigin*                 _netOrigin;
	PythonInit*                _pyInit;
	WebServer*                 _webserver;
	WebServer*                 _sslWebserver;
	JsonServer*                _jsonServer;
	SSDPHandler*               _ssdp;

	// #ifdef ENABLE_CEC
	// CECHandler*                _cecHandler;  // TODO move to GrabberWrapper or Grabber?
	// #endif
	#if defined(ENABLE_FLATBUF_SERVER)
	FlatBufferServer*          _flatBufferServer;
	#endif
	#if defined(ENABLE_PROTOBUF_SERVER)
	ProtoServer*               _protoServer;
	#endif

	VideoMode                  _currVideoMode;
	SettingsManager*           _settingsManager;
};
