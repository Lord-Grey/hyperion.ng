// STL includes
#include <exception>
#include <sstream>

// QT includes
#include <QString>
#include <QStringList>
#include <QThread>

// hyperion include
#include <hyperion/Hyperion.h>

#if defined(ENABLE_FORWARDER)
#include <forwarder/MessageForwarder.h>
#endif

#include <hyperion/ImageProcessor.h>
#include <hyperion/ColorAdjustment.h>

// utils
#include <utils/hyperion.h>
#include <utils/GlobalSignals.h>
#include <utils/Logger.h>

// LedDevice includes
#include <leddevice/LedDeviceWrapper.h>

// GrabberWrapper
#include <grabber/GrabberWrapper.h>

#include <hyperion/MultiColorAdjustment.h>
#include "LinearColorSmoothing.h"

// effect engine includes
#include <effectengine/EffectEngine.h>

// settingsManagaer
#include <hyperion/SettingsManager.h>

// BGEffectHandler
#include <hyperion/BGEffectHandler.h>

// Boblight
#if defined(ENABLE_BOBLIGHT_SERVER)
#include <boblightserver/BoblightServer.h>
#endif

Hyperion::Hyperion(quint8 instance, bool readonlyMode)
	: QObject()
	, _instIndex(instance)
	, _settingsManager(new SettingsManager(instance, this, readonlyMode))
	, _componentRegister(this)
	, _ledString(hyperion::createLedString(getSetting(settings::LEDS).array(), hyperion::createColorOrder(getSetting(settings::DEVICE).object())))
	, _imageProcessor(new ImageProcessor(_ledString, this))
	, _muxer(static_cast<int>(_ledString.leds().size()), this)
	, _raw2ledAdjustment(hyperion::createLedColorsAdjustment(static_cast<int>(_ledString.leds().size()), getSetting(settings::COLOR).object()))
	, _ledDeviceWrapper(nullptr)
	, _grabberWrapper(nullptr)
	, _deviceSmooth(nullptr)
	, _effectEngine(nullptr)
#if defined(ENABLE_FORWARDER)
	, _messageForwarder(nullptr)
#endif
	, _log(Logger::getInstance("HYPERION"))
	, _hwLedCount()
	, _ledGridSize(hyperion::getLedLayoutGridSize(getSetting(settings::LEDS).array()))
	, _BGEffectHandler(nullptr)
	, _ledBuffer(_ledString.leds().size(), ColorRgb::BLACK)
#if defined(ENABLE_BOBLIGHT_SERVER)
	, _boblightServer(nullptr)
#endif
	, _readOnlyMode(readonlyMode)
{

}

Hyperion::~Hyperion()
{
	freeObjects();
}

void Hyperion::start()
{
	// forward settings changed to Hyperion
	connect(_settingsManager, &SettingsManager::settingsChanged, this, &Hyperion::settingsChanged);

	// get newVideoMode from HyperionIManager
	connect(this, &Hyperion::newVideoMode, this, &Hyperion::handleNewVideoMode);

	if (!_raw2ledAdjustment->verifyAdjustments())
	{
		Warning(_log, "At least one led has no color calibration, please add all leds from your led layout to an 'LED index' field!");
	}

	// handle hwLedCount
	_hwLedCount = getSetting(settings::DEVICE).object()["hardwareLedCount"].toInt(getLedCount());

	// Initialize colororder vector
	for (const Led& led : _ledString.leds())
	{
		_ledStringColorOrder.push_back(led.colorOrder);
	}

	// connect Hyperion::update with Muxer visible priority changes as muxer updates independent
	connect(&_muxer, &PriorityMuxer::visiblePriorityChanged, this, &Hyperion::update);
	connect(&_muxer, &PriorityMuxer::visiblePriorityChanged, this, &Hyperion::handleSourceAvailability);
	connect(&_muxer, &PriorityMuxer::visibleComponentChanged, this, &Hyperion::handleVisibleComponentChanged);

	// listens for ComponentRegister changes of COMP_ALL to perform core enable/disable actions
	// connect(&_componentRegister, &ComponentRegister::updatedComponentState, this, &Hyperion::updatedComponentState);

	// listen for settings updates of this instance (LEDS & COLOR)
	connect(_settingsManager, &SettingsManager::settingsChanged, this, &Hyperion::handleSettingsUpdate);

	#if 0
	// set color correction activity state
	const QJsonObject color = getSetting(settings::COLOR).object();
	#endif

	// initialize LED-devices
	QJsonObject ledDevice = getSetting(settings::DEVICE).object();
	ledDevice["currentLedCount"] = _hwLedCount; // Inject led count info

	_ledDeviceWrapper = new LedDeviceWrapper(this);
	connect(this, &Hyperion::compStateChangeRequest, _ledDeviceWrapper, &LedDeviceWrapper::handleComponentState);
	connect(this, &Hyperion::ledDeviceData, _ledDeviceWrapper, &LedDeviceWrapper::updateLeds);
	_ledDeviceWrapper->createLedDevice(ledDevice);

	// initialize Screen/Video Grabber
	_grabberWrapper = new GrabberWrapper(this);
	connect(_settingsManager, &SettingsManager::settingsChanged, _grabberWrapper, &GrabberWrapper::settingsChanged);
	connect(this, &Hyperion::compStateChangeRequest, _grabberWrapper, &GrabberWrapper::componentStateChanged);
	connect(this, &Hyperion::newVideoMode, _grabberWrapper, &GrabberWrapper::newVideoMode);
	_grabberWrapper->createGrabber(getSetting(settings::SCREENGRABBER).object(), settings::SCREENGRABBER);
	// _grabberWrapper->createGrabber(getSetting(settings::VIDEOGRABBER).object(), settings::VIDEOGRABBER); // TODO

	// smoothing
	_deviceSmooth = new LinearColorSmoothing(getSetting(settings::SMOOTHING), this);
	connect(this, &Hyperion::settingsChanged, _deviceSmooth, &LinearColorSmoothing::handleSettingsUpdate);

	//Start in pause mode, a new priority will activate smoothing (either start-effect or grabber)
	_deviceSmooth->setPause(true);

#if defined(ENABLE_FORWARDER)
	// create the message forwarder only on main instance
	if (_instIndex == 0)
	{
		_messageForwarder = new MessageForwarder(this);
	}
#endif

	// create the effect engine; needs to be initialized after smoothing!
	_effectEngine = new EffectEngine(this);
	connect(_effectEngine, &EffectEngine::effectListUpdated, this, &Hyperion::effectListUpdated);

	// initial startup effect
	hyperion::handleInitialEffect(this, getSetting(settings::FGEFFECT).object());

	// handle background effect
	_BGEffectHandler = new BGEffectHandler(this);

	// forwards global signals (Flat/Proto) to the corresponding slots
	connect(GlobalSignals::getInstance(), &GlobalSignals::registerGlobalInput, this, &Hyperion::registerInput);
	connect(GlobalSignals::getInstance(), &GlobalSignals::clearGlobalInput, this, &Hyperion::clear);
	connect(GlobalSignals::getInstance(), &GlobalSignals::setGlobalColor, this, &Hyperion::setColor);
	connect(GlobalSignals::getInstance(), &GlobalSignals::setGlobalImage, this, &Hyperion::setInputImage);

	// if there is no startup / background effect and no sending capture interface we probably want to push once BLACK (as PrioMuxer won't emit a priority change)
	update();

#if defined(ENABLE_BOBLIGHT_SERVER)
	// boblight, can't live in global scope as it depends on layout
	_boblightServer = new BoblightServer(this, getSetting(settings::BOBLSERVER));
	connect(this, &Hyperion::settingsChanged, _boblightServer, &BoblightServer::handleSettingsUpdate);
#endif

	// instance initiated, enter thread event loop
	emit started();
}

void Hyperion::stop()
{
	emit finished();
	thread()->wait();
}

void Hyperion::freeObjects()
{
	// switch off all leds
	clear(-1,true);

	// delete components on exit of hyperion core
#if defined(ENABLE_BOBLIGHT_SERVER)
	delete _boblightServer;
#endif

	delete _effectEngine;
	delete _raw2ledAdjustment;

#if defined(ENABLE_FORWARDER)
	delete _messageForwarder;
#endif

	delete _settingsManager;
	delete _ledDeviceWrapper;
}

void Hyperion::handleSettingsUpdate(settings::type type, const QJsonDocument& config)
{
//	std::cout << "Hyperion::handleSettingsUpdate" << std::endl;
//	std::cout << config.toJson().toStdString() << std::endl;

	if(type == settings::COLOR)
	{
		const QJsonObject obj = config.object();
		// change in color recreate ledAdjustments
		delete _raw2ledAdjustment;
		_raw2ledAdjustment = hyperion::createLedColorsAdjustment(static_cast<int>(_ledString.leds().size()), obj);

		if (!_raw2ledAdjustment->verifyAdjustments())
		{
			Warning(_log, "At least one led has no color calibration, please add all leds from your led layout to an 'LED index' field!");
		}
	}
	else if(type == settings::LEDS)
	{
		const QJsonArray leds = config.array();

		// stop and cache all running effects, as effects depend heavily on LED-layout
		_effectEngine->cacheRunningEffects();

		// ledstring, img processor, muxer, ledGridSize (effect-engine image based effects), _ledBuffer and ByteOrder of ledstring
		_ledString = hyperion::createLedString(leds, hyperion::createColorOrder(getSetting(settings::DEVICE).object()));
		_imageProcessor->setLedString(_ledString);
		_muxer.updateLedColorsLength(static_cast<int>(_ledString.leds().size()));
		_ledGridSize = hyperion::getLedLayoutGridSize(leds);

		std::vector<ColorRgb> color(_ledString.leds().size(), ColorRgb{0,0,0});
		_ledBuffer = color;

		_ledStringColorOrder.clear();
		for (const Led& led : _ledString.leds())
		{
			_ledStringColorOrder.push_back(led.colorOrder);
		}

		// handle hwLedCount update
		_hwLedCount = getSetting(settings::DEVICE).object()["hardwareLedCount"].toInt(getLedCount());

		// change in leds are also reflected in adjustment
		delete _raw2ledAdjustment;
		_raw2ledAdjustment = hyperion::createLedColorsAdjustment(static_cast<int>(_ledString.leds().size()), getSetting(settings::COLOR).object());

		// start cached effects
		_effectEngine->startCachedEffects();
	}
	else if(type == settings::DEVICE)
	{
		QJsonObject dev = config.object();

		// handle hwLedCount update
		_hwLedCount = dev["hardwareLedCount"].toInt(getLedCount());

		// force ledString update, if device ByteOrder changed
		if(_ledDeviceWrapper->getColorOrder() != dev["colorOrder"].toString("rgb"))
		{
			_ledString = hyperion::createLedString(getSetting(settings::LEDS).array(), hyperion::createColorOrder(dev));
			_imageProcessor->setLedString(_ledString);

			_ledStringColorOrder.clear();
			for (const Led& led : _ledString.leds())
			{
				_ledStringColorOrder.push_back(led.colorOrder);
			}
		}

		// do always reinit until the led devices can handle dynamic changes
		dev["currentLedCount"] = _hwLedCount; // Inject led count info
		_ledDeviceWrapper->createLedDevice(dev);

		// TODO: Check, if framegrabber frequency is lower than latchtime..., if yes, stop
	}
	else if(type == settings::SMOOTHING)
	{
		_deviceSmooth->handleSettingsUpdate( type, config);
	}
	else if (type == settings::SCREENGRABBER || type == settings::VIDEOGRABBER)
	{
		// do always reinit until the grabber can handle dynamic changes
		_grabberWrapper->createGrabber(config.object(), type); // TODO
	}

	// update once to push single color sets / adjustments/ ledlayout resizes and update ledBuffer color
	update();
}

QJsonDocument Hyperion::getSetting(settings::type type) const
{
	return _settingsManager->getSetting(type);
}

bool Hyperion::saveSettings(const QJsonObject& config, bool correct)
{
	return _settingsManager->saveSettings(config, correct);
}

bool Hyperion::restoreSettings(const QJsonObject& config, bool correct)
{
	return _settingsManager->restoreSettings(config, correct);
}

int Hyperion::getLatchTime() const
{
	return _ledDeviceWrapper->getLatchTime();
}

unsigned Hyperion::addSmoothingConfig(int settlingTime_ms, double ledUpdateFrequency_hz, unsigned updateDelay)
{
	return _deviceSmooth->addConfig(settlingTime_ms, ledUpdateFrequency_hz, updateDelay);
}

unsigned Hyperion::updateSmoothingConfig(unsigned id, int settlingTime_ms, double ledUpdateFrequency_hz, unsigned updateDelay)
{
	return _deviceSmooth->updateConfig(id, settlingTime_ms, ledUpdateFrequency_hz, updateDelay);
}

int Hyperion::getLedCount() const
{
	return static_cast<int>(_ledString.leds().size());
}

void Hyperion::setSourceAutoSelect(bool state)
{
	_muxer.setSourceAutoSelectEnabled(state);
}

bool Hyperion::setVisiblePriority(int priority)
{
	return _muxer.setPriority(priority);
}

bool Hyperion::sourceAutoSelectEnabled() const
{
	return _muxer.isSourceAutoSelectEnabled();
}

void Hyperion::setNewComponentState(hyperion::Components component, bool state)
{
	_componentRegister.setNewComponentState(component, state);
}

std::map<hyperion::Components, bool> Hyperion::getAllComponents() const
{
	return _componentRegister.getRegister();
}

int Hyperion::isComponentEnabled(hyperion::Components comp) const
{
	return _componentRegister.isComponentEnabled(comp);
}

void Hyperion::registerInput(int priority, hyperion::Components component, const QString& origin, const QString& owner, unsigned smooth_cfg)
{
	_muxer.registerInput(priority, component, origin, owner, smooth_cfg);
}

bool Hyperion::setInput(int priority, const std::vector<ColorRgb>& ledColors, int timeout_ms, bool clearEffect)
{
	if(_muxer.setInput(priority, ledColors, timeout_ms))
	{
		// clear effect if this call does not come from an effect
		if(clearEffect)
		{
			_effectEngine->channelCleared(priority);
		}

		// if this priority is visible, update immediately
		if(priority == _muxer.getCurrentPriority())
		{
			update();
		}

		return true;
	}
	return false;
}

bool Hyperion::setInputImage(int priority, const Image<ColorRgb>& image, int64_t timeout_ms, bool clearEffect)
{
	if (!_muxer.hasPriority(priority))
	{
		emit GlobalSignals::getInstance()->globalRegRequired(priority);
		return false;
	}

	if(_muxer.setInputImage(priority, image, timeout_ms))
	{
		// clear effect if this call does not come from an effect
		if(clearEffect)
		{
			_effectEngine->channelCleared(priority);
		}

		// if this priority is visible, update immediately
		if(priority == _muxer.getCurrentPriority())
		{
			update();
		}

		return true;
	}
	return false;
}

bool Hyperion::setInputInactive(quint8 priority)
{
	return _muxer.setInputInactive(priority);
}

void Hyperion::setColor(int priority, const std::vector<ColorRgb> &ledColors, int timeout_ms, const QString &origin, bool clearEffects)
{
	// clear effect if this call does not come from an effect
	if (clearEffects)
	{
		_effectEngine->channelCleared(priority);
	}

	// create full led vector from single/multiple colors
	size_t size = _ledString.leds().size();
	std::vector<ColorRgb> newLedColors;
	while (true)
	{
		for (const auto &entry : ledColors)
		{
			newLedColors.emplace_back(entry);
			if (newLedColors.size() == size)
			{
				goto end;
			}
		}
	}
end:

	if (getPriorityInfo(priority).componentId != hyperion::COMP_COLOR)
	{
		clear(priority);
	}

	// register color
	registerInput(priority, hyperion::COMP_COLOR, origin);

	// write color to muxer
	setInput(priority, newLedColors, timeout_ms);
}

QStringList Hyperion::getAdjustmentIds() const
{
	return _raw2ledAdjustment->getAdjustmentIds();
}

ColorAdjustment * Hyperion::getAdjustment(const QString& id) const
{
	return _raw2ledAdjustment->getAdjustment(id);
}

void Hyperion::adjustmentsUpdated()
{
	emit adjustmentChanged();
	update();
}

bool Hyperion::clear(int priority, bool forceClearAll)
{
	bool isCleared = false;
	if (priority < 0)
	{
		_muxer.clearAll(forceClearAll);

		// send clearall signal to the effect engine
		_effectEngine->allChannelsCleared();
		isCleared = true;
	}
	else
	{
		// send clear signal to the effect engine
		// (outside the check so the effect gets cleared even when the effect is not sending colors)
		_effectEngine->channelCleared(priority);

		if (_muxer.clearInput(priority))
		{
			isCleared = true;
		}
	}
	return isCleared;
}

int Hyperion::getCurrentPriority() const
{
	return _muxer.getCurrentPriority();
}

bool Hyperion::isCurrentPriority(int priority) const
{
	return getCurrentPriority() == priority;
}

QList<int> Hyperion::getActivePriorities() const
{
	return _muxer.getPriorities();
}

Hyperion::InputInfo Hyperion::getPriorityInfo(int priority) const
{
	return _muxer.getInputInfo(priority);
}

QString Hyperion::saveEffect(const QJsonObject& obj)
{
	return _effectEngine->saveEffect(obj);
}

QString Hyperion::deleteEffect(const QString& effectName)
{
	return _effectEngine->deleteEffect(effectName);
}

std::list<EffectDefinition> Hyperion::getEffects() const
{
	return _effectEngine->getEffects();
}

std::list<ActiveEffectDefinition> Hyperion::getActiveEffects() const
{
	return _effectEngine->getActiveEffects();
}

std::list<EffectSchema> Hyperion::getEffectSchemas() const
{
	return _effectEngine->getEffectSchemas();
}

QJsonObject Hyperion::getQJsonConfig() const
{
	return _settingsManager->getSettings();
}

int Hyperion::setEffect(const QString &effectName, int priority, int timeout, const QString & origin)
{
	return _effectEngine->runEffect(effectName, priority, timeout, origin);
}

int Hyperion::setEffect(const QString &effectName, const QJsonObject &args, int priority, int timeout, const QString &pythonScript, const QString &origin, const QString &imageData)
{
	return _effectEngine->runEffect(effectName, args, priority, timeout, pythonScript, origin, 0, imageData);
}

void Hyperion::setLedMappingType(int mappingType)
{
	if(mappingType != _imageProcessor->getUserLedMappingType())
	{
		_imageProcessor->setLedMappingType(mappingType);
		emit imageToLedsMappingChanged(mappingType);
	}
}

int Hyperion::getLedMappingType() const
{
	return _imageProcessor->getUserLedMappingType();
}

void Hyperion::setVideoMode(VideoMode mode)
{
	emit videoMode(mode);
}

VideoMode Hyperion::getCurrentVideoMode() const
{
	return _currVideoMode;
}

QString Hyperion::getActiveDeviceType() const
{
	return _ledDeviceWrapper->getActiveDeviceType();
}

void Hyperion::handleVisibleComponentChanged(hyperion::Components comp)
{
	_imageProcessor->setBlackbarDetectDisable((comp == hyperion::COMP_EFFECT));
	_imageProcessor->setHardLedMappingType((comp == hyperion::COMP_EFFECT) ? 0 : -1);
	_raw2ledAdjustment->setBacklightEnabled((comp != hyperion::COMP_COLOR && comp != hyperion::COMP_EFFECT));
}

void Hyperion::handleSourceAvailability(const quint8& priority)
{	int previousPriority = _muxer.getPreviousPriority();

	Debug(_log,"priority[%d], previousPriority[%d]", priority, previousPriority);
	if ( priority == PriorityMuxer::LOWEST_PRIORITY)
	{
		Debug(_log,"No source left -> Pause output processing and switch LED-Device off");
		emit _ledDeviceWrapper->switchOff();
		emit _deviceSmooth->setPause(true);
	}
	else
	{
		if ( previousPriority == PriorityMuxer::LOWEST_PRIORITY )
		{
			Debug(_log,"new source available -> Resume output processing and switch LED-Device on");
			emit _ledDeviceWrapper->switchOn();
			emit _deviceSmooth->setPause(false);
		}
	}
}

void Hyperion::update()
{
	// Obtain the current priority channel
	int priority = _muxer.getCurrentPriority();
	const PriorityMuxer::InputInfo priorityInfo = _muxer.getInputInfo(priority);

	// copy image & process OR copy ledColors from muxer
	Image<ColorRgb> image = priorityInfo.image;
	if (image.width() > 1 || image.height() > 1)
	{
		emit currentImage(image);
		_ledBuffer = _imageProcessor->process(image);
	}
	else
	{
		_ledBuffer = priorityInfo.ledColors;
	}

	// emit rawLedColors before transform
	emit rawLedColors(_ledBuffer);

	_raw2ledAdjustment->applyAdjustment(_ledBuffer);

	int i = 0;
	for (ColorRgb& color : _ledBuffer)
	{
		// correct the color byte order
		switch (_ledStringColorOrder.at(i))
		{
		case ColorOrder::ORDER_RGB:
			// leave as it is
			break;
		case ColorOrder::ORDER_BGR:
			std::swap(color.red, color.blue);
			break;
		case ColorOrder::ORDER_RBG:
			std::swap(color.green, color.blue);
			break;
		case ColorOrder::ORDER_GRB:
			std::swap(color.red, color.green);
			break;
		case ColorOrder::ORDER_GBR:
			std::swap(color.red, color.green);
			std::swap(color.green, color.blue);
			break;

		case ColorOrder::ORDER_BRG:
			std::swap(color.red, color.blue);
			std::swap(color.green, color.blue);
			break;
		}
		i++;
	}

	// fill additional hardware LEDs with black
	if ( _hwLedCount > static_cast<int>(_ledBuffer.size()) )
	{
		_ledBuffer.resize(_hwLedCount, ColorRgb::BLACK);
	}

	// Write the data to the device
	if (_ledDeviceWrapper->enabled())
	{
		// Smoothing is disabled
		if  (! _deviceSmooth->enabled())
		{
			//std::cout << "Hyperion::update()> Non-Smoothing - "; LedDevice::printLedValues ( _ledBuffer);
			emit ledDeviceData(_ledBuffer);
		}
		else
		{
			_deviceSmooth->selectConfig(priorityInfo.smooth_cfg);

			// feed smoothing in pause mode to maintain a smooth transition back to smooth mode
			if (_deviceSmooth->enabled() || _deviceSmooth->pause())
			{
				_deviceSmooth->updateLedValues(_ledBuffer);
			}
		}
	}
	#if 0
	else
	{
		//LEDDevice is disabled
		Debug(_log, "LEDDevice is disabled - no update required");
	}
	#endif
}
